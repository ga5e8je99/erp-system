import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { PaymentMethod, SalesInvoiceStatus, StockMovementType } from "@prisma/client";
import { calculateDocumentTotals, calculateLineItem } from "../sales-calculations";
import {
  issueSalesInvoiceTransaction,
  recordCustomerPaymentTransaction,
  createSalesReturnTransaction,
  voidSalesInvoiceTransaction,
  getNextSalesDocNumber,
  generateCustomerCode,
} from "../sales-service";
import { recordStockMovement } from "@/features/inventory/services/stock-movement";

describe("Sales Calculation & Transactional Services", () => {
  let testCustomerId: string;
  let testWarehouseId: string;
  let testProductId: string;
  let testUnitId: string;

  beforeAll(async () => {
    // 1. Ensure a unit
    let unit = await db.unit.findFirst({ where: { name: "قطعة" } });
    if (!unit) {
      unit = await db.unit.create({
        data: { name: "قطعة تجارب مبيعات", symbol: "قطعة" },
      });
    }
    testUnitId = unit.id;

    // 2. Ensure a warehouse
    const wh = await db.warehouse.upsert({
      where: { code: "WH-SALES-TEST" },
      update: {},
      create: {
        name: "مستودع اختبار المبيعات",
        code: "WH-SALES-TEST",
      },
    });
    testWarehouseId = wh.id;

    // 3. Ensure a product with cost 100, price 150, stock 100
    const product = await db.product.create({
      data: {
        name: "صنف تجارب المبيعات",
        sku: `SKU-SLS-${Date.now()}`,
        unitId: testUnitId,
        costPrice: 100,
        salePrice: 150,
        taxRate: 14,
        trackStock: true,
      },
    });
    testProductId = product.id;

    // Seed stock into warehouse
    await recordStockMovement(db, {
      productId: testProductId,
      warehouseId: testWarehouseId,
      type: StockMovementType.IN,
      quantity: 100,
      note: "Initial test stock",
    });

    // 4. Ensure customer
    const customer = await db.customer.create({
      data: {
        code: `CUST-TEST-${Date.now()}`,
        name: "عميل تجارب المبيعات",
        creditLimit: 50000,
        balance: 0,
      },
    });
    testCustomerId = customer.id;
  });

  afterAll(async () => {
    // Cleanup
    await db.journalLine.deleteMany({
      where: {
        entry: {
          description: { contains: "اختبار المبيعات" },
        },
      },
    });
    await db.journalEntry.deleteMany({
      where: {
        description: { contains: "اختبار المبيعات" },
      },
    });
    await db.stockMovement.deleteMany({
      where: { productId: testProductId },
    });
    await db.stockLevel.deleteMany({
      where: { productId: testProductId },
    });
    await db.salesInvoiceItem.deleteMany({
      where: { productId: testProductId },
    });
    await db.customerPayment.deleteMany({
      where: { customerId: testCustomerId },
    });
    await db.salesReturnItem.deleteMany({
      where: { productId: testProductId },
    });
    await db.salesReturn.deleteMany({
      where: { customerId: testCustomerId },
    });
    await db.salesInvoice.deleteMany({
      where: { customerId: testCustomerId },
    });
    await db.product.deleteMany({
      where: { id: testProductId },
    });
    await db.customer.deleteMany({
      where: { id: testCustomerId },
    });
    await db.warehouse.deleteMany({
      where: { code: "WH-SALES-TEST" },
    });
  });

  describe("Calculations Engine", () => {
    it("accurately calculates line item subtotal, discount, tax, and total", () => {
      // 10 items @ 150 EGP each, 50 EGP discount, 14% VAT
      // Subtotal: 1500, Taxable: 1450, VAT: 1450 * 0.14 = 203, Total: 1653
      const line = calculateLineItem({
        quantity: 10,
        unitPrice: 150,
        discount: 50,
        taxRate: 14,
      });

      expect(line.subtotal).toBe(1500);
      expect(line.taxableAmount).toBe(1450);
      expect(line.taxAmount).toBe(203);
      expect(line.total).toBe(1653);
    });

    it("accurately calculates document totals with invoice-level discount", () => {
      const doc = calculateDocumentTotals({
        items: [
          { quantity: 2, unitPrice: 100, discount: 0, taxRate: 14 }, // sub: 200, vat: 28, tot: 228
          { quantity: 1, unitPrice: 300, discount: 50, taxRate: 14 }, // sub: 300, net: 250, vat: 35, tot: 285
        ],
        invoiceDiscount: 50,
      });

      // Total subtotal: 500
      // Items discount: 50, Invoice discount: 50 -> Total discount: 100
      // Taxable amount: 500 - 100 = 400
      // Tax: 28 + 35 = 63
      // Total payable: 400 + 63 = 463
      expect(doc.subtotal).toBe(500);
      expect(doc.totalDiscount).toBe(100);
      expect(doc.taxableAmount).toBe(400);
      expect(doc.tax).toBe(63);
      expect(doc.total).toBe(463);
    });
  });

  describe("Invoice Issuing & Journal Integration", () => {
    it("issues invoice: deducts stock, increments customer balance, and creates balanced journal entry", async () => {
      const invNum = await getNextSalesDocNumber(db, "INV");

      // 1. Create a draft invoice for 5 items
      // 5 items @ 150 = 750, VAT 14% = 105, Total = 855
      const invoice = await db.salesInvoice.create({
        data: {
          invoiceNumber: invNum,
          customerId: testCustomerId,
          status: SalesInvoiceStatus.DRAFT,
          dueDate: new Date(),
          subtotal: 750,
          discount: 0,
          tax: 105,
          total: 855,
          notes: "اختبار المبيعات - إصدار فاتورة",
          items: {
            create: [
              {
                productId: testProductId,
                quantity: 5,
                unitPrice: 150,
                taxRate: 14,
                taxAmount: 105,
                total: 855,
              },
            ],
          },
        },
      });

      // 2. Issue invoice
      const res = await issueSalesInvoiceTransaction(
        invoice.id,
        testWarehouseId,
        "test-user"
      );

      expect(res.invoice.status).toBe(SalesInvoiceStatus.ISSUED);

      // Verify Stock was deducted by 5 (100 - 5 = 95)
      const stock = await db.stockLevel.findUnique({
        where: {
          productId_warehouseId: {
            productId: testProductId,
            warehouseId: testWarehouseId,
          },
        },
      });
      expect(Number(stock?.quantity)).toBe(95);

      // Verify customer balance increased by 855
      const customer = await db.customer.findUnique({
        where: { id: testCustomerId },
      });
      expect(Number(customer?.balance)).toBe(855);

      // Verify Journal Entry was created and posted
      const journal = await db.journalEntry.findUnique({
        where: { id: res.journalEntry.id },
        include: { lines: true },
      });

      expect(journal?.status).toBe("POSTED");

      // Check balance: sum(debit) == sum(credit)
      const totalDebit = journal?.lines.reduce((s, l) => s + Number(l.debit), 0);
      const totalCredit = journal?.lines.reduce((s, l) => s + Number(l.credit), 0);

      expect(totalDebit).toBeGreaterThan(0);
      expect(totalDebit).toBe(totalCredit);
    });

    it("records payment against invoice and updates invoice status and customer balance", async () => {
      // Find the issued invoice
      const invoice = await db.salesInvoice.findFirst({
        where: { customerId: testCustomerId, status: SalesInvoiceStatus.ISSUED },
      });
      expect(invoice).toBeDefined();

      // Record partial payment of 500
      const paymentRes = await recordCustomerPaymentTransaction({
        customerId: testCustomerId,
        invoiceId: invoice!.id,
        amount: 500,
        method: PaymentMethod.CASH,
        date: new Date(),
        userId: "test-user",
      });

      expect(paymentRes.payment.paymentNumber).toMatch(/^PAY-/);

      // Check invoice status -> PARTIALLY_PAID
      const updatedInv = await db.salesInvoice.findUnique({
        where: { id: invoice!.id },
      });
      expect(updatedInv?.status).toBe(SalesInvoiceStatus.PARTIALLY_PAID);
      expect(Number(updatedInv?.paidAmount)).toBe(500);

      // Check customer balance reduced: 855 - 500 = 355
      const customer = await db.customer.findUnique({
        where: { id: testCustomerId },
      });
      expect(Number(customer?.balance)).toBe(355);

      // Record remainder payment of 355 -> status should become PAID
      await recordCustomerPaymentTransaction({
        customerId: testCustomerId,
        invoiceId: invoice!.id,
        amount: 355,
        method: PaymentMethod.BANK,
        date: new Date(),
        userId: "test-user",
      });

      const finalInv = await db.salesInvoice.findUnique({
        where: { id: invoice!.id },
      });
      expect(finalInv?.status).toBe(SalesInvoiceStatus.PAID);
      expect(Number(finalInv?.paidAmount)).toBe(855);

      const finalCustomer = await db.customer.findUnique({
        where: { id: testCustomerId },
      });
      expect(Number(finalCustomer?.balance)).toBe(0);
    });

    it("processes a Sales Return: re-inwards stock and reduces customer debt", async () => {
      // Return 2 items
      const returnRes = await createSalesReturnTransaction({
        customerId: testCustomerId,
        warehouseId: testWarehouseId,
        notes: "اختبار المبيعات - مرتجع",
        items: [
          {
            productId: testProductId,
            quantity: 2,
            unitPrice: 150,
            taxRate: 14,
          },
        ],
        userId: "test-user",
      });

      expect(returnRes.salesReturn.returnNumber).toMatch(/^RTN-/);

      // Stock should have increased from 95 to 97
      const stock = await db.stockLevel.findUnique({
        where: {
          productId_warehouseId: {
            productId: testProductId,
            warehouseId: testWarehouseId,
          },
        },
      });
      expect(Number(stock?.quantity)).toBe(97);
    });

    it("voids an issued sales invoice: reverses stock, balance, and posts reversal journal", async () => {
      // Create a fresh draft invoice for void testing
      const voidInvNumber = await getNextSalesDocNumber(db, "INV");
      const invToVoid = await db.salesInvoice.create({
        data: {
          invoiceNumber: voidInvNumber,
          customerId: testCustomerId,
          issueDate: new Date(),
          dueDate: new Date(),
          status: SalesInvoiceStatus.DRAFT,
          subtotal: 300,
          discount: 0,
          tax: 42,
          total: 342,
          paidAmount: 0,
          items: {
            create: [
              {
                productId: testProductId,
                quantity: 2,
                unitPrice: 150,
                taxRate: 14,
                taxAmount: 42,
                total: 342,
              },
            ],
          },
        },
      });

      // Stock is currently 97. Issue the invoice -> should deduct 2 -> stock = 95
      await issueSalesInvoiceTransaction(invToVoid.id, testWarehouseId, "test-user");

      const stockAfterIssue = await db.stockLevel.findUnique({
        where: {
          productId_warehouseId: {
            productId: testProductId,
            warehouseId: testWarehouseId,
          },
        },
      });
      expect(Number(stockAfterIssue?.quantity)).toBe(95);

      // Now void the invoice
      const voidRes = await voidSalesInvoiceTransaction(
        invToVoid.id,
        testWarehouseId,
        "test-user",
        "خطأ في الفوترة"
      );
      expect(voidRes.success).toBe(true);

      // Verify invoice status is now VOID
      const voidedInv = await db.salesInvoice.findUnique({
        where: { id: invToVoid.id },
      });
      expect(voidedInv?.status).toBe(SalesInvoiceStatus.VOID);

      // Verify stock was reversed back: 95 + 2 = 97
      const stockAfterVoid = await db.stockLevel.findUnique({
        where: {
          productId_warehouseId: {
            productId: testProductId,
            warehouseId: testWarehouseId,
          },
        },
      });
      expect(Number(stockAfterVoid?.quantity)).toBe(97);

      // Verify reversing journal entry exists
      const reversalJournal = await db.journalEntry.findFirst({
        where: {
          sourceType: "VOID_INVOICE",
          sourceId: invToVoid.id,
        },
        include: { lines: true },
      });
      expect(reversalJournal).toBeDefined();
      expect(reversalJournal?.status).toBe("POSTED");
      const totalDebit = reversalJournal!.lines.reduce((s, l) => s + Number(l.debit), 0);
      const totalCredit = reversalJournal!.lines.reduce((s, l) => s + Number(l.credit), 0);
      expect(totalDebit).toBe(totalCredit);
    });

    it("generates unique sequence numbers for documents", async () => {
      const custCode = await generateCustomerCode(db);
      expect(custCode).toMatch(/^CUST-\d{4}/);

      const soNum = await getNextSalesDocNumber(db, "SO");
      expect(soNum).toMatch(/^SO-\d{4}-\d{5}/);
    });
  });
});
