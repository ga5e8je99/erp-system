import { Prisma, SalesInvoiceStatus, StockMovementType, PaymentMethod } from "@prisma/client";
import { db } from "@/lib/db";
import { recordStockMovement } from "@/features/inventory/services/stock-movement";
import { calculateDocumentTotals } from "./sales-calculations";
import { postJournalEntry, getPostingAccountMappings } from "@/features/accounting/services/posting";

export type DbClient = Prisma.TransactionClient | typeof db;

/**
 * Atomically generates sequential numbers for business documents.
 */
export async function getNextSalesDocNumber(
  client: DbClient,
  type: "QUO" | "SO" | "INV" | "PAY" | "RTN" | "JRN",
  customPrefix?: string
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = customPrefix || type;

  const seq = await client.documentSequence.upsert({
    where: {
      type_year: {
        type,
        year: currentYear,
      },
    },
    update: {
      nextNumber: { increment: 1 },
    },
    create: {
      type,
      prefix,
      year: currentYear,
      nextNumber: 2,
      padding: 5,
    },
  });

  const num = seq.nextNumber - 1;
  const padded = String(num).padStart(seq.padding, "0");
  return `${prefix}-${currentYear}-${padded}`;
}

/**
 * Generates an automatic unique customer code: CUST-00001
 */
export async function generateCustomerCode(client: DbClient): Promise<string> {
  const currentYear = new Date().getFullYear();
  const seq = await client.documentSequence.upsert({
    where: {
      type_year: {
        type: "CUST",
        year: currentYear,
      },
    },
    update: {
      nextNumber: { increment: 1 },
    },
    create: {
      type: "CUST",
      prefix: "CUST",
      year: currentYear,
      nextNumber: 2,
      padding: 4,
    },
  });

  const num = seq.nextNumber - 1;
  const padded = String(num).padStart(seq.padding, "0");
  return `CUST-${padded}`;
}

/**
 * Helper to retrieve GL Account IDs for system transactions.
 */
export async function getGlAccount(client: DbClient, code: string) {
  const account = await client.account.findUnique({
    where: { code },
  });
  if (!account) {
    throw new Error(`ACCOUNT_NOT_FOUND: General Ledger Account with code '${code}' was not found`);
  }
  return account;
}

/**
 * Issues a draft Sales Invoice:
 * 1. Locks document status to ISSUED
 * 2. Checks Customer Credit Limit
 * 3. Deducts Stock via StockMovement (OUT)
 * 4. Increases Customer Balance
 * 5. Posts double-entry Journal Entry (AR, Revenue, VAT, COGS, Inventory)
 */
export async function issueSalesInvoiceTransaction(
  invoiceId: string,
  warehouseId: string,
  userId: string,
  client?: DbClient
) {
  const runner = async (tx: Prisma.TransactionClient) => {
    // 1. Fetch invoice with items and customer
    const invoice = await tx.salesInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new Error("INVOICE_NOT_FOUND: Invoice does not exist");
    }

    if (invoice.status !== SalesInvoiceStatus.DRAFT) {
      throw new Error(`INVALID_STATUS: Only DRAFT invoices can be issued. Current status: ${invoice.status}`);
    }

    const companySettings = await tx.companySettings.findFirst();
    const invoiceTotal = Number(invoice.total);
    const customerBalance = Number(invoice.customer.balance);
    const creditLimit = Number(invoice.customer.creditLimit);

    // 2. Enforce Customer Credit Limit
    if (companySettings?.blockOnCreditLimit && creditLimit > 0) {
      if (customerBalance + invoiceTotal > creditLimit) {
        throw new Error(
          `CREDIT_LIMIT_EXCEEDED: Customer balance (${customerBalance} + ${invoiceTotal} = ${customerBalance + invoiceTotal}) exceeds credit limit of ${creditLimit}`
        );
      }
    }

    // 3. Deduct Stock via StockMovement (OUT) for each stock-tracking item
    let totalCogs = 0;
    for (const item of invoice.items) {
      const itemQty = Number(item.quantity);
      const itemCost = Number(item.product.costPrice);
      totalCogs += itemQty * itemCost;

      if (item.product.trackStock) {
        await recordStockMovement(tx, {
          productId: item.productId,
          warehouseId,
          type: StockMovementType.OUT,
          quantity: itemQty,
          referenceType: "SALES_INVOICE",
          referenceId: invoice.invoiceNumber,
          note: `صرف مبيعات - فاتورة ${invoice.invoiceNumber}`,
          createdById: userId,
        });
      }
    }

    // 4. Increase Customer Balance by invoice total
    await tx.customer.update({
      where: { id: invoice.customerId },
      data: {
        balance: {
          increment: new Prisma.Decimal(invoiceTotal),
        },
      },
    });

    // 5. Update invoice status to ISSUED
    const updatedInvoice = await tx.salesInvoice.update({
      where: { id: invoiceId },
      data: {
        status: SalesInvoiceStatus.ISSUED,
      },
    });

    // 6. Post Accounting Journal Entry via centralized posting service
    const mappings = await getPostingAccountMappings(tx);
    const netSales = Number(invoice.subtotal) - Number(invoice.discount);
    const vat = Number(invoice.tax);

    const postingLines = [
      // Dr Accounts Receivable
      {
        accountId: mappings.arAccountId,
        debit: invoiceTotal,
        credit: 0,
        description: `استحقاق فاتورة مبيعات ${invoice.invoiceNumber} - العميل: ${invoice.customer.name}`,
      },
      // Cr Sales Revenue
      {
        accountId: mappings.salesAccountId,
        debit: 0,
        credit: netSales,
        description: `إيراد فاتورة مبيعات ${invoice.invoiceNumber}`,
      },
    ];

    // Cr VAT if tax > 0
    if (vat > 0) {
      postingLines.push({
        accountId: mappings.taxAccountId,
        debit: 0,
        credit: vat,
        description: `ضريبة القيمة المضافة لفاتورة مبيعات ${invoice.invoiceNumber}`,
      });
    }

    // Plus COGS and Inventory asset lines if totalCogs > 0
    if (totalCogs > 0) {
      postingLines.push(
        {
          accountId: mappings.cogsAccountId,
          debit: totalCogs,
          credit: 0,
          description: `تكلفة بضاعة مباعة لفاتورة ${invoice.invoiceNumber}`,
        },
        {
          accountId: mappings.inventoryAccountId,
          debit: 0,
          credit: totalCogs,
          description: `صرف مخزون بضاعة لفاتورة ${invoice.invoiceNumber}`,
        }
      );
    }

    const journalEntry = await postJournalEntry(tx, {
      date: invoice.issueDate,
      description: `قيد فاتورة مبيعات ${invoice.invoiceNumber} - ${invoice.customer.name}`,
      sourceType: "SALES_INVOICE",
      sourceId: invoice.id,
      postedById: userId,
      lines: postingLines,
    });

    return { invoice: updatedInvoice, journalEntry };
  };

  if (client && "salesInvoice" in client && !("$transaction" in client)) {
    return runner(client as Prisma.TransactionClient);
  }

  return db.$transaction(async (tx) => runner(tx));
}

/**
 * Records a Customer Payment against an invoice or on account:
 * 1. Creates CustomerPayment record
 * 2. If invoiceId provided, updates invoice paidAmount & status (PARTIALLY_PAID or PAID)
 * 3. Decreases Customer Balance
 * 4. Posts Journal Entry: Dr Cash/Bank, Cr Accounts Receivable
 */
export async function recordCustomerPaymentTransaction(
  params: {
    customerId: string;
    invoiceId?: string;
    amount: number;
    method: PaymentMethod;
    date: Date;
    reference?: string;
    notes?: string;
    userId: string;
  },
  client?: DbClient
) {
  const runner = async (tx: Prisma.TransactionClient) => {
    const { customerId, invoiceId, amount, method, date, reference, notes, userId } = params;

    if (amount <= 0) {
      throw new Error("INVALID_AMOUNT: Payment amount must be strictly greater than 0");
    }

    const customer = await tx.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new Error("CUSTOMER_NOT_FOUND: Customer does not exist");
    }

    const companySettings = await tx.companySettings.findFirst();
    const paymentNumber = await getNextSalesDocNumber(
      tx,
      "PAY",
      companySettings?.paymentPrefix || "PAY"
    );

    // 1. Create Payment
    const payment = await tx.customerPayment.create({
      data: {
        paymentNumber,
        customerId,
        invoiceId: invoiceId || null,
        amount: new Prisma.Decimal(amount),
        method,
        date,
        reference: reference || null,
        notes: notes || null,
      },
    });

    // 2. If invoice targeted, update invoice paid amount & status
    if (invoiceId) {
      const invoice = await tx.salesInvoice.findUnique({
        where: { id: invoiceId },
      });
      if (invoice) {
        const currentPaid = Number(invoice.paidAmount);
        const newPaid = currentPaid + amount;
        const invoiceTotal = Number(invoice.total);

        const newStatus =
          newPaid >= invoiceTotal
            ? SalesInvoiceStatus.PAID
            : SalesInvoiceStatus.PARTIALLY_PAID;

        await tx.salesInvoice.update({
          where: { id: invoiceId },
          data: {
            paidAmount: new Prisma.Decimal(newPaid),
            status: newStatus,
          },
        });
      }
    }

    // 3. Decrease Customer Balance
    await tx.customer.update({
      where: { id: customerId },
      data: {
        balance: {
          decrement: new Prisma.Decimal(amount),
        },
      },
    });

    // 4. Post Journal Entry: Dr Cash or Bank, Cr Accounts Receivable
    const mappings = await getPostingAccountMappings(tx);
    const paymentAccountId =
      method === PaymentMethod.BANK ? mappings.bankAccountId : mappings.cashAccountId;

    await postJournalEntry(tx, {
      date,
      description: `سند قبض ${paymentNumber} - من العميل: ${customer.name}`,
      sourceType: "CUSTOMER_PAYMENT",
      sourceId: payment.id,
      postedById: userId,
      lines: [
        // Dr Cash or Bank
        {
          accountId: paymentAccountId,
          debit: amount,
          credit: 0,
          description: `تحصيل سند قبض ${paymentNumber} (${method})`,
        },
        // Cr Accounts Receivable
        {
          accountId: mappings.arAccountId,
          debit: 0,
          credit: amount,
          description: `سداد من العميل ${customer.name} - سند ${paymentNumber}`,
        },
      ],
    });

    return { payment };
  };

  if (client && "customerPayment" in client && !("$transaction" in client)) {
    return runner(client as Prisma.TransactionClient);
  }

  return db.$transaction(async (tx) => runner(tx));
}

/**
 * Creates and processes a Sales Return / Credit Note:
 * 1. Creates SalesReturn and lines
 * 2. Reverses Stock: IN movement on warehouse
 * 3. Decreases Customer Balance
 * 4. Posts Reversing Accounting Entry (Cr AR, Dr Sales Revenue, Dr VAT; Dr Inventory, Cr COGS)
 */
export async function createSalesReturnTransaction(
  params: {
    customerId: string;
    invoiceId?: string;
    warehouseId: string;
    notes?: string;
    items: { productId: string; quantity: number; unitPrice: number; taxRate: number }[];
    userId: string;
  },
  client?: DbClient
) {
  const runner = async (tx: Prisma.TransactionClient) => {
    const { customerId, invoiceId, warehouseId, notes, items, userId } = params;

    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new Error("CUSTOMER_NOT_FOUND");

    const companySettings = await tx.companySettings.findFirst();
    const returnNumber = await getNextSalesDocNumber(
      tx,
      "RTN",
      companySettings?.returnPrefix || "RTN"
    );

    // Calculate totals
    const calc = calculateDocumentTotals({
      items: items.map((i) => ({
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        taxRate: i.taxRate,
      })),
    });

    const salesReturn = await tx.salesReturn.create({
      data: {
        returnNumber,
        customerId,
        invoiceId: invoiceId || null,
        status: "COMPLETED",
        subtotal: new Prisma.Decimal(calc.subtotal),
        tax: new Prisma.Decimal(calc.tax),
        total: new Prisma.Decimal(calc.total),
        notes: notes || null,
        items: {
          create: items.map((i) => {
            const line = calc.items.find((ci) => ci.unitPrice === i.unitPrice && ci.quantity === i.quantity);
            return {
              productId: i.productId,
              quantity: new Prisma.Decimal(i.quantity),
              unitPrice: new Prisma.Decimal(i.unitPrice),
              taxAmount: new Prisma.Decimal(line?.taxAmount || 0),
              total: new Prisma.Decimal(line?.total || 0),
            };
          }),
        },
      },
    });

    // Re-inward stock & compute COGS
    let returnCogs = 0;
    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { costPrice: true, trackStock: true },
      });
      if (product) {
        returnCogs += item.quantity * Number(product.costPrice);
        if (product.trackStock) {
          await recordStockMovement(tx, {
            productId: item.productId,
            warehouseId,
            type: StockMovementType.IN,
            quantity: item.quantity,
            referenceType: "SALES_RETURN",
            referenceId: returnNumber,
            note: `مرتجع مبيعات - سند ${returnNumber}`,
            createdById: userId,
          });
        }
      }
    }

    // Decrement Customer Balance
    await tx.customer.update({
      where: { id: customerId },
      data: {
        balance: {
          decrement: new Prisma.Decimal(calc.total),
        },
      },
    });

    // Accounting entries via centralized posting service
    const mappings = await getPostingAccountMappings(tx);

    const returnPostingLines = [
      // Cr Accounts Receivable (Reduces customer debt)
      {
        accountId: mappings.arAccountId,
        debit: 0,
        credit: calc.total,
        description: `إشعار دائن / مرتجع مبيعات ${returnNumber} - ${customer.name}`,
      },
      // Dr Sales Revenue (Reverses revenue)
      {
        accountId: mappings.salesAccountId,
        debit: calc.subtotal,
        credit: 0,
        description: `عكس إيراد مرتجع مبيعات ${returnNumber}`,
      },
    ];

    if (calc.tax > 0) {
      returnPostingLines.push({
        accountId: mappings.taxAccountId,
        debit: calc.tax,
        credit: 0,
        description: `عكس ضريبة مبيعات مرتجع ${returnNumber}`,
      });
    }

    if (returnCogs > 0) {
      returnPostingLines.push(
        {
          accountId: mappings.inventoryAccountId,
          debit: returnCogs,
          credit: 0,
          description: `إعادة إدخال مخزون مرتجع مبيعات ${returnNumber}`,
        },
        {
          accountId: mappings.cogsAccountId,
          debit: 0,
          credit: returnCogs,
          description: `عكس تكلفة بضاعة مباعة مرتجع مبيعات ${returnNumber}`,
        }
      );
    }

    await postJournalEntry(tx, {
      date: new Date(),
      description: `قيد مرتجع مبيعات ${returnNumber} - ${customer.name}`,
      sourceType: "SALES_RETURN",
      sourceId: salesReturn.id,
      postedById: userId,
      lines: returnPostingLines,
    });

    return { salesReturn };
  };

  if (client && "salesReturn" in client && !("$transaction" in client)) {
    return runner(client as Prisma.TransactionClient);
  }

  return db.$transaction(async (tx) => runner(tx));
}

/**
 * Voids an issued invoice by posting reversing entries rather than deleting records:
 * 1. Sets invoice status to VOID
 * 2. Reverses stock back into warehouse
 * 3. Decreases customer balance
 * 4. Posts reversing journal entry
 */
export async function voidSalesInvoiceTransaction(
  invoiceId: string,
  warehouseId: string,
  userId: string,
  reason: string,
  client?: DbClient
) {
  const runner = async (tx: Prisma.TransactionClient) => {
    const invoice = await tx.salesInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        items: { include: { product: true } },
        payments: true,
      },
    });

    if (!invoice) throw new Error("INVOICE_NOT_FOUND");
    if (invoice.status === SalesInvoiceStatus.VOID) {
      throw new Error("ALREADY_VOID: Invoice is already void");
    }

    if (Number(invoice.paidAmount) > 0) {
      throw new Error("CANNOT_VOID_PAID_INVOICE: Cannot void an invoice with applied customer payments");
    }

    const invoiceTotal = Number(invoice.total);

    // 1. Mark status as VOID
    await tx.salesInvoice.update({
      where: { id: invoiceId },
      data: { status: SalesInvoiceStatus.VOID, notes: invoice.notes ? `${invoice.notes} | ملغاة: ${reason}` : `ملغاة: ${reason}` },
    });

    // 2. Reverse Stock (IN)
    let cogsToReverse = 0;
    for (const item of invoice.items) {
      const qty = Number(item.quantity);
      cogsToReverse += qty * Number(item.product.costPrice);
      if (item.product.trackStock) {
        await recordStockMovement(tx, {
          productId: item.productId,
          warehouseId,
          type: StockMovementType.IN,
          quantity: qty,
          referenceType: "VOID_INVOICE",
          referenceId: invoice.invoiceNumber,
          note: `إلغاء فاتورة مبيعات ${invoice.invoiceNumber} - ${reason}`,
          createdById: userId,
        });
      }
    }

    // 3. Decrement customer balance
    await tx.customer.update({
      where: { id: invoice.customerId },
      data: {
        balance: {
          decrement: new Prisma.Decimal(invoiceTotal),
        },
      },
    });

    // 4. Reverse Journal Entry via centralized posting service
    const mappings = await getPostingAccountMappings(tx);
    const netSales = Number(invoice.subtotal) - Number(invoice.discount);
    const vat = Number(invoice.tax);

    const voidPostingLines = [
      {
        accountId: mappings.arAccountId,
        debit: 0,
        credit: invoiceTotal,
        description: `عكس استحقاق فاتورة مبيعات ملغاة ${invoice.invoiceNumber}`,
      },
      {
        accountId: mappings.salesAccountId,
        debit: netSales,
        credit: 0,
        description: `عكس إيراد فاتورة مبيعات ملغاة ${invoice.invoiceNumber}`,
      },
    ];

    if (vat > 0) {
      voidPostingLines.push({
        accountId: mappings.taxAccountId,
        debit: vat,
        credit: 0,
        description: `عكس ضريبة فاتورة مبيعات ملغاة ${invoice.invoiceNumber}`,
      });
    }

    if (cogsToReverse > 0) {
      voidPostingLines.push(
        {
          accountId: mappings.inventoryAccountId,
          debit: cogsToReverse,
          credit: 0,
          description: `إعادة إدخال مخزون فاتورة ملغاة ${invoice.invoiceNumber}`,
        },
        {
          accountId: mappings.cogsAccountId,
          debit: 0,
          credit: cogsToReverse,
          description: `عكس تكلفة بضاعة مباعة فاتورة ملغاة ${invoice.invoiceNumber}`,
        }
      );
    }

    await postJournalEntry(tx, {
      date: new Date(),
      description: `قيد إلغاء فاتورة مبيعات ${invoice.invoiceNumber} - ${reason}`,
      sourceType: "VOID_INVOICE",
      sourceId: invoice.id,
      postedById: userId,
      lines: voidPostingLines,
    });

    return { success: true };
  };

  if (client && "salesInvoice" in client && !("$transaction" in client)) {
    return runner(client as Prisma.TransactionClient);
  }

  return db.$transaction(async (tx) => runner(tx));
}
