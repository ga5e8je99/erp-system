import {
  Prisma,
  PurchaseOrderStatus,
  PurchaseInvoiceStatus,
  PurchaseReturnStatus,
  PaymentMethod,
} from "@prisma/client";
import { db } from "@/lib/db";
import { recordStockMovement } from "@/features/inventory/services/stock-movement";
import { getNextDocumentNumber } from "@/lib/sequence";
import {
  calculateWeightedAverageCost,
  determinePOStatusAfterReceipt,
} from "./purchasing-calculations";
import type { SupplierStatementEntry } from "../types";
import { postJournalEntry, getPostingAccountMappings } from "@/features/accounting/services/posting";

export type DbClient = Prisma.TransactionClient | typeof db;

/**
 * Sequential document number generator for purchasing documents.
 */
export async function getNextPurchasingDocNumber(
  tx: Prisma.TransactionClient,
  type:
    | "PURCHASE_ORDER"
    | "GOODS_RECEIPT"
    | "PURCHASE_INVOICE"
    | "SUPPLIER_PAYMENT"
    | "PURCHASE_RETURN"
    | "JOURNAL_ENTRY",
  prefix?: string
): Promise<string> {
  return getNextDocumentNumber({
    type,
    prefix,
    tx,
  });
}

/**
 * Auto-generates the next sequential Supplier Code (e.g. SUPP-001).
 */
export async function generateSupplierCode(
  tx?: Prisma.TransactionClient
): Promise<string> {
  const client = tx || db;
  const count = await client.supplier.count();
  const nextNum = (count + 1).toString().padStart(3, "0");
  const candidate = `SUPP-${nextNum}`;

  const exists = await client.supplier.findUnique({
    where: { code: candidate },
  });

  if (exists) {
    return `SUPP-${(count + 2).toString().padStart(3, "0")}`;
  }

  return candidate;
}

export interface ReceiveGoodsParams {
  poId?: string | null;
  supplierId: string;
  warehouseId: string;
  receiveDate?: Date;
  notes?: string | null;
  items: Array<{
    productId: string;
    quantity: number;
    unitCost: number;
  }>;
  createdById?: string;
}

/**
 * Atomic Goods Receipt Transaction:
 * 1. Creates GoodsReceipt & GoodsReceiptItem records.
 * 2. Records StockMovement (IN) for each received item.
 * 3. Re-calculates and updates Product.costPrice via Weighted Average Cost (WAC).
 * 4. If linked to a PO, calculates fulfillment across all receipts and updates PO status (PARTIALLY_RECEIVED or RECEIVED).
 */
export async function receiveGoodsTransaction(
  params: ReceiveGoodsParams,
  client?: DbClient
) {
  const runner = async (tx: Prisma.TransactionClient) => {
    const {
      poId,
      supplierId,
      warehouseId,
      receiveDate = new Date(),
      notes,
      items,
      createdById,
    } = params;

    if (items.length === 0) {
      throw new Error("EMPTY_RECEIPT: Must receive at least one line item.");
    }

    const companySettings = await tx.companySettings.findFirst();
    const receiptNumber = await getNextPurchasingDocNumber(
      tx,
      "GOODS_RECEIPT",
      companySettings?.receiptPrefix || "GR"
    );

    // 1. Create GoodsReceipt
    const receipt = await tx.goodsReceipt.create({
      data: {
        receiptNumber,
        poId: poId || null,
        supplierId,
        warehouseId,
        receiveDate,
        notes,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: new Prisma.Decimal(item.quantity),
            unitCost: new Prisma.Decimal(item.unitCost),
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // 2. Process each item: Stock IN + WAC recalculation
    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: {
          id: true,
          name: true,
          costPrice: true,
          trackStock: true,
        },
      });

      if (!product) {
        throw new Error(
          `PRODUCT_NOT_FOUND: Product ${item.productId} does not exist.`
        );
      }

      // Query current total stock across all warehouses
      const stockAggregate = await tx.stockLevel.aggregate({
        where: { productId: item.productId },
        _sum: { quantity: true },
      });
      const currentStock = Number(stockAggregate._sum.quantity || 0);
      const currentCost = Number(product.costPrice);

      // Calculate new WAC
      const newCostPrice = calculateWeightedAverageCost({
        currentStock,
        currentCost,
        receivedQty: item.quantity,
        receivedUnitCost: item.unitCost,
      });

      // Update product cost price
      await tx.product.update({
        where: { id: item.productId },
        data: {
          costPrice: new Prisma.Decimal(newCostPrice),
        },
      });

      // Record Stock Movement IN (only if stock is tracked)
      if (product.trackStock) {
        await recordStockMovement(tx, {
          productId: item.productId,
          warehouseId,
          type: "IN",
          quantity: item.quantity,
          referenceType: "GOODS_RECEIPT",
          referenceId: receipt.id,
          note: `استلام بضائع - إيصال ${receiptNumber}`,
          createdById,
        });
      }
    }

    // 3. PO status transition (if linked to a PO)
    let poUpdatedStatus: PurchaseOrderStatus | null = null;
    if (poId) {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: poId },
        include: {
          items: true,
          receipts: {
            include: { items: true },
          },
        },
      });

      if (po) {
        // Build map of received quantities across all receipts
        const totalReceivedPerProduct = new Map<string, number>();

        for (const r of po.receipts) {
          for (const line of r.items) {
            const current = totalReceivedPerProduct.get(line.productId) || 0;
            totalReceivedPerProduct.set(
              line.productId,
              current + Number(line.quantity)
            );
          }
        }

        const linesStatus = po.items.map((poItem) => ({
          orderedQty: Number(poItem.quantity),
          totalReceivedQty:
            totalReceivedPerProduct.get(poItem.productId) || 0,
        }));

        poUpdatedStatus = determinePOStatusAfterReceipt(
          linesStatus,
          po.status
        ) as PurchaseOrderStatus;

        if (poUpdatedStatus !== po.status) {
          await tx.purchaseOrder.update({
            where: { id: poId },
            data: { status: poUpdatedStatus },
          });
        }
      }
    }

    return {
      receipt,
      poUpdatedStatus,
    };
  };

  return client ? runner(client as Prisma.TransactionClient) : db.$transaction(runner);
}

export interface PostPurchaseInvoiceParams {
  invoiceId: string;
  userId: string;
}

/**
 * Posts a Purchase Invoice:
 * 1. Locks document as ISSUED.
 * 2. Increments Supplier.balance (Accounts Payable liability).
 * 3. Creates balanced double-entry Journal Entry:
 *    - Dr Inventory Asset (1140)
 *    - Dr Input Tax (2120)
 *    - Cr Accounts Payable (2110)
 */
export async function postPurchaseInvoiceTransaction(
  params: PostPurchaseInvoiceParams,
  client?: DbClient
) {
  const runner = async (tx: Prisma.TransactionClient) => {
    const { invoiceId, userId } = params;

    const invoice = await tx.purchaseInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        supplier: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!invoice) {
      throw new Error("INVOICE_NOT_FOUND: Purchase invoice does not exist.");
    }

    if (invoice.status !== PurchaseInvoiceStatus.DRAFT) {
      throw new Error(
        `INVALID_STATUS: Only DRAFT invoices can be posted. Current status: ${invoice.status}`
      );
    }

    const invoiceTotal = Number(invoice.total);
    const invoiceSubtotal = Number(invoice.subtotal) - Number(invoice.discount);
    const invoiceTax = Number(invoice.tax);

    // 1. Increase Supplier Balance (credit liability)
    await tx.supplier.update({
      where: { id: invoice.supplierId },
      data: {
        balance: {
          increment: new Prisma.Decimal(invoiceTotal),
        },
      },
    });

    // 2. Mark invoice as ISSUED
    const updatedInvoice = await tx.purchaseInvoice.update({
      where: { id: invoiceId },
      data: {
        status: PurchaseInvoiceStatus.ISSUED,
      },
    });

    // 3. Post Accounting Journal Entry via centralized posting service
    const mappings = await getPostingAccountMappings(tx);

    const purchasePostingLines = [
      // Dr Inventory Asset (net subtotal)
      {
        accountId: mappings.inventoryAccountId,
        debit: invoiceSubtotal,
        credit: 0,
        description: `إثبات مشتريات بضائع - فاتورة مورد ${invoice.invoiceNumber}`,
      },
    ];

    // Dr Input Tax (if tax > 0)
    if (invoiceTax > 0) {
      purchasePostingLines.push({
        accountId: mappings.taxAccountId,
        debit: invoiceTax,
        credit: 0,
        description: `ضريبة مدخلات مشتريات - فاتورة مورد ${invoice.invoiceNumber}`,
      });
    }

    // Cr Accounts Payable (total invoice amount)
    purchasePostingLines.push({
      accountId: mappings.apAccountId,
      debit: 0,
      credit: invoiceTotal,
      description: `استحقاق فاتورة مورد ${invoice.invoiceNumber} - المورد: ${invoice.supplier.name}`,
    });

    await postJournalEntry(tx, {
      date: invoice.issueDate,
      description: `قيد استحقاق فاتورة مشتريات ${invoice.invoiceNumber} - ${invoice.supplier.name}`,
      sourceType: "PURCHASE_INVOICE",
      sourceId: invoice.id,
      postedById: userId,
      lines: purchasePostingLines,
    });

    return updatedInvoice;
  };

  return client ? runner(client as Prisma.TransactionClient) : db.$transaction(runner);
}

export interface RecordSupplierPaymentParams {
  supplierId: string;
  invoiceId?: string | null;
  amount: number;
  method: PaymentMethod;
  date?: Date;
  reference?: string | null;
  notes?: string | null;
  userId: string;
}

/**
 * Records a payment to a supplier:
 * 1. Creates SupplierPayment record.
 * 2. Decreases Supplier.balance.
 * 3. Updates PurchaseInvoice paidAmount & status (if matched to an invoice).
 * 4. Posts Journal Entry:
 *    - Dr Accounts Payable (2110)
 *    - Cr Cash (1110) or Bank (1120)
 */
export async function recordSupplierPaymentTransaction(
  params: RecordSupplierPaymentParams,
  client?: DbClient
) {
  const runner = async (tx: Prisma.TransactionClient) => {
    const {
      supplierId,
      invoiceId,
      amount,
      method,
      date = new Date(),
      reference,
      notes,
      userId,
    } = params;

    const supplier = await tx.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new Error("SUPPLIER_NOT_FOUND: Supplier does not exist.");
    }

    const companySettings = await tx.companySettings.findFirst();
    const paymentNumber = await getNextPurchasingDocNumber(
      tx,
      "SUPPLIER_PAYMENT",
      companySettings?.paymentPrefix || "PAY"
    );

    // 1. Create SupplierPayment
    const payment = await tx.supplierPayment.create({
      data: {
        paymentNumber,
        supplierId,
        invoiceId: invoiceId || null,
        amount: new Prisma.Decimal(amount),
        method,
        date,
        reference,
        notes,
      },
    });

    // 2. Decrement Supplier balance (reduces liability)
    await tx.supplier.update({
      where: { id: supplierId },
      data: {
        balance: {
          decrement: new Prisma.Decimal(amount),
        },
      },
    });

    // 3. Update Purchase Invoice if allocated
    if (invoiceId) {
      const invoice = await tx.purchaseInvoice.findUnique({
        where: { id: invoiceId },
      });

      if (invoice) {
        const currentPaid = Number(invoice.paidAmount);
        const newPaid = currentPaid + amount;
        const total = Number(invoice.total);

        const newStatus =
          newPaid >= total
            ? PurchaseInvoiceStatus.PAID
            : PurchaseInvoiceStatus.PARTIALLY_PAID;

        await tx.purchaseInvoice.update({
          where: { id: invoiceId },
          data: {
            paidAmount: new Prisma.Decimal(newPaid),
            status: newStatus,
          },
        });
      }
    }

    // 4. Post Journal Entry via centralized posting service
    const mappings = await getPostingAccountMappings(tx);
    const paymentAccountId =
      method === PaymentMethod.CASH ? mappings.cashAccountId : mappings.bankAccountId;

    await postJournalEntry(tx, {
      date,
      description: `سند صرف مورد ${paymentNumber} - ${supplier.name}`,
      sourceType: "SUPPLIER_PAYMENT",
      sourceId: payment.id,
      postedById: userId,
      lines: [
        // Dr Accounts Payable
        {
          accountId: mappings.apAccountId,
          debit: amount,
          credit: 0,
          description: `سداد مستحقات للمورد ${supplier.name} - سند ${paymentNumber}`,
        },
        // Cr Cash / Bank
        {
          accountId: paymentAccountId,
          debit: 0,
          credit: amount,
          description: `صرف ${method === PaymentMethod.CASH ? "نقدي من الخزينة" : "من الحساب البنكي"} - سند ${paymentNumber}`,
        },
      ],
    });

    return payment;
  };

  return client ? runner(client as Prisma.TransactionClient) : db.$transaction(runner);
}

export interface CreatePurchaseReturnParams {
  supplierId: string;
  invoiceId?: string | null;
  warehouseId: string;
  notes?: string | null;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    taxAmount?: number;
    total?: number;
  }>;
  userId: string;
}

/**
 * Creates a Purchase Return:
 * 1. Creates PurchaseReturn and items.
 * 2. Deducts warehouse stock via StockMovement (OUT).
 * 3. Decreases Supplier.balance by return total.
 * 4. Posts reversal Journal Entry:
 *    - Dr Accounts Payable (2110)
 *    - Cr Inventory Asset (1140)
 *    - Cr Input Tax (2120)
 */
export async function createPurchaseReturnTransaction(
  params: CreatePurchaseReturnParams,
  client?: DbClient
) {
  const runner = async (tx: Prisma.TransactionClient) => {
    const { supplierId, invoiceId, warehouseId, notes, items, userId } =
      params;

    const supplier = await tx.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new Error("SUPPLIER_NOT_FOUND: Supplier does not exist.");
    }

    const companySettings = await tx.companySettings.findFirst();
    const returnNumber = await getNextPurchasingDocNumber(
      tx,
      "PURCHASE_RETURN",
      companySettings?.purchaseReturnPrefix || "PRTN"
    );

    let subtotal = 0;
    let tax = 0;
    let total = 0;

    for (const item of items) {
      const lineSubtotal = item.quantity * item.unitPrice;
      const lineTax = item.taxAmount || 0;
      subtotal += lineSubtotal;
      tax += lineTax;
      total += item.total || lineSubtotal + lineTax;
    }

    // 1. Create PurchaseReturn
    const purchaseReturn = await tx.purchaseReturn.create({
      data: {
        returnNumber,
        supplierId,
        invoiceId: invoiceId || null,
        warehouseId,
        status: PurchaseReturnStatus.COMPLETED,
        subtotal: new Prisma.Decimal(subtotal),
        tax: new Prisma.Decimal(tax),
        total: new Prisma.Decimal(total),
        notes,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            taxAmount: new Prisma.Decimal(item.taxAmount || 0),
            total: new Prisma.Decimal(
              item.total ??
                item.quantity * item.unitPrice + (item.taxAmount || 0)
            ),
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // 2. StockMovement (OUT) for each returned item
    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { trackStock: true },
      });

      if (product?.trackStock) {
        await recordStockMovement(tx, {
          productId: item.productId,
          warehouseId,
          type: "OUT",
          quantity: item.quantity,
          referenceType: "PURCHASE_RETURN",
          referenceId: purchaseReturn.id,
          note: `مرتجع مشتريات إلى المورد - رقم ${returnNumber}`,
          createdById: userId,
        });
      }
    }

    // 3. Decrement Supplier Balance
    await tx.supplier.update({
      where: { id: supplierId },
      data: {
        balance: {
          decrement: new Prisma.Decimal(total),
        },
      },
    });

    // 4. Accounting Reversal Journal Entry via centralized posting service
    const mappings = await getPostingAccountMappings(tx);

    const returnPostingLines = [
      // Dr Accounts Payable (reduce liability)
      {
        accountId: mappings.apAccountId,
        debit: total,
        credit: 0,
        description: `تخفيض حساب المورد بالمرتجع ${returnNumber}`,
      },
      // Cr Inventory Asset
      {
        accountId: mappings.inventoryAccountId,
        debit: 0,
        credit: subtotal,
        description: `تخفيض المخزون بالبضاعة المرتجعة ${returnNumber}`,
      },
    ];

    if (tax > 0) {
      // Cr Input Tax
      returnPostingLines.push({
        accountId: mappings.taxAccountId,
        debit: 0,
        credit: tax,
        description: `عكس ضريبة القيمة المضافة لمرتجع ${returnNumber}`,
      });
    }

    await postJournalEntry(tx, {
      date: new Date(),
      description: `قيد مرتجع مشتريات ${returnNumber} - ${supplier.name}`,
      sourceType: "PURCHASE_RETURN",
      sourceId: purchaseReturn.id,
      postedById: userId,
      lines: returnPostingLines,
    });

    return purchaseReturn;
  };

  return client ? runner(client as Prisma.TransactionClient) : db.$transaction(runner);
}

/**
 * Generates a Supplier Statement of Account with running balance.
 */
export async function getSupplierStatementOfAccount(
  supplierId: string,
  fromDate?: Date,
  toDate?: Date
): Promise<{
  entries: SupplierStatementEntry[];
  totalCredits: number; // Invoices (increases balance)
  totalDebits: number; // Payments, Returns (decreases balance)
  closingBalance: number;
}> {
  const [invoices, payments, returns] = await Promise.all([
    db.purchaseInvoice.findMany({
      where: {
        supplierId,
        status: { in: [PurchaseInvoiceStatus.ISSUED, PurchaseInvoiceStatus.PARTIALLY_PAID, PurchaseInvoiceStatus.PAID] },
        ...(fromDate || toDate
          ? {
              issueDate: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      },
      select: {
        id: true,
        invoiceNumber: true,
        issueDate: true,
        total: true,
        notes: true,
      },
    }),
    db.supplierPayment.findMany({
      where: {
        supplierId,
        ...(fromDate || toDate
          ? {
              date: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      },
      select: {
        id: true,
        paymentNumber: true,
        date: true,
        amount: true,
        method: true,
        notes: true,
      },
    }),
    db.purchaseReturn.findMany({
      where: {
        supplierId,
        status: PurchaseReturnStatus.COMPLETED,
        ...(fromDate || toDate
          ? {
              createdAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      },
      select: {
        id: true,
        returnNumber: true,
        createdAt: true,
        total: true,
        notes: true,
      },
    }),
  ]);

  const rawEntries: Array<{
    id: string;
    date: Date;
    type: "INVOICE" | "PAYMENT" | "RETURN";
    referenceNumber: string;
    description: string;
    debit: number;
    credit: number;
  }> = [];

  for (const inv of invoices) {
    rawEntries.push({
      id: inv.id,
      date: inv.issueDate,
      type: "INVOICE",
      referenceNumber: inv.invoiceNumber,
      description: inv.notes || `فاتورة مشتريات رقم ${inv.invoiceNumber}`,
      debit: 0,
      credit: Number(inv.total), // Invoices increase supplier credit
    });
  }

  for (const pay of payments) {
    rawEntries.push({
      id: pay.id,
      date: pay.date,
      type: "PAYMENT",
      referenceNumber: pay.paymentNumber,
      description: pay.notes || `سند صرف (${pay.method}) رقم ${pay.paymentNumber}`,
      debit: Number(pay.amount), // Payments decrease supplier credit
      credit: 0,
    });
  }

  for (const ret of returns) {
    rawEntries.push({
      id: ret.id,
      date: ret.createdAt,
      type: "RETURN",
      referenceNumber: ret.returnNumber,
      description: ret.notes || `مرتجع مشتريات رقم ${ret.returnNumber}`,
      debit: Number(ret.total), // Returns decrease supplier credit
      credit: 0,
    });
  }

  // Sort chronologically
  rawEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

  let running = 0;
  let totalCredits = 0;
  let totalDebits = 0;

  const entries: SupplierStatementEntry[] = rawEntries.map((entry) => {
    running += entry.credit - entry.debit;
    totalCredits += entry.credit;
    totalDebits += entry.debit;

    return {
      ...entry,
      runningBalance: Math.round(running * 100) / 100,
    };
  });

  return {
    entries,
    totalCredits: Math.round(totalCredits * 100) / 100,
    totalDebits: Math.round(totalDebits * 100) / 100,
    closingBalance: Math.round(running * 100) / 100,
  };
}
