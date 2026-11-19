import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import {
  PaymentMethod,
  PurchaseInvoiceStatus,
  PurchaseOrderStatus,
  StockMovementType,
} from "@prisma/client";
import {
  generateSupplierCode,
  receiveGoodsTransaction,
  postPurchaseInvoiceTransaction,
  recordSupplierPaymentTransaction,
  createPurchaseReturnTransaction,
  getSupplierStatementOfAccount,
  getNextPurchasingDocNumber,
} from "../purchasing-service";
import { recordStockMovement } from "@/features/inventory/services/stock-movement";

describe("Purchasing Transactional Services & Lifecycle", () => {
  let testSupplierId: string;
  let testWarehouseId: string;
  let testProductId: string;
  let testUnitId: string;

  beforeAll(async () => {
    // 1. Ensure a unit
    let unit = await db.unit.findFirst({ where: { name: "قطعة" } });
    if (!unit) {
      unit = await db.unit.create({
        data: { name: "قطعة تجارب مشتريات", symbol: "قطعة" },
      });
    }
    testUnitId = unit.id;

    // 2. Ensure a warehouse
    const wh = await db.warehouse.upsert({
      where: { code: "WH-PURCH-TEST" },
      update: {},
      create: {
        name: "مستودع اختبار المشتريات",
        code: "WH-PURCH-TEST",
      },
    });
    testWarehouseId = wh.id;

    // 3. Ensure a product with initial cost 100, price 160, initial stock 50
    const product = await db.product.create({
      data: {
        name: "صنف تجارب المشتريات",
        sku: `SKU-PUR-${Date.now()}`,
        unitId: testUnitId,
        costPrice: 100,
        salePrice: 160,
        taxRate: 14,
        trackStock: true,
      },
    });
    testProductId = product.id;

    // Seed 50 units initial stock
    await recordStockMovement(db, {
      productId: testProductId,
      warehouseId: testWarehouseId,
      type: StockMovementType.IN,
      quantity: 50,
      note: "Initial test purchasing stock",
    });

    // 4. Ensure supplier
    const supplierCode = await generateSupplierCode(db);
    const supplier = await db.supplier.create({
      data: {
        code: supplierCode,
        name: "مورد تجارب المشتريات",
        phone: "0500000001",
        email: "supplier.test@example.com",
        taxNumber: "300000000000003",
        balance: 0,
      },
    });
    testSupplierId = supplier.id;
  });

  afterAll(async () => {
    // Cleanup in dependency order
    await db.journalLine.deleteMany({
      where: {
        entry: {
          description: { contains: "مورد تجارب المشتريات" },
        },
      },
    });
    await db.journalEntry.deleteMany({
      where: {
        description: { contains: "مورد تجارب المشتريات" },
      },
    });
    await db.supplierPayment.deleteMany({
      where: { supplierId: testSupplierId },
    });
    await db.purchaseReturnItem.deleteMany({
      where: { productId: testProductId },
    });
    await db.purchaseReturn.deleteMany({
      where: { supplierId: testSupplierId },
    });
    await db.purchaseInvoiceItem.deleteMany({
      where: { productId: testProductId },
    });
    await db.purchaseInvoice.deleteMany({
      where: { supplierId: testSupplierId },
    });
    await db.goodsReceiptItem.deleteMany({
      where: { productId: testProductId },
    });
    await db.goodsReceipt.deleteMany({
      where: { supplierId: testSupplierId },
    });
    await db.purchaseOrderItem.deleteMany({
      where: { productId: testProductId },
    });
    await db.purchaseOrder.deleteMany({
      where: { supplierId: testSupplierId },
    });
    await db.stockMovement.deleteMany({
      where: { productId: testProductId },
    });
    await db.stockLevel.deleteMany({
      where: { productId: testProductId },
    });
    await db.product.deleteMany({
      where: { id: testProductId },
    });
    await db.supplier.deleteMany({
      where: { id: testSupplierId },
    });
    await db.warehouse.deleteMany({
      where: { code: "WH-PURCH-TEST" },
    });
  });

  describe("Supplier Code Generation", () => {
    it("generates a sequential SUPP-XXX code", async () => {
      const code = await generateSupplierCode(db);
      expect(code).toMatch(/^SUPP-\d{3,}/);
    });
  });

  describe("Goods Receipt & WAC Calculations", () => {
    it("receives goods against PO, updates stock level, recalculates WAC, and updates PO status", async () => {
      // 1. Create a Purchase Order for 50 items @ 130 EGP (ordered total: 50)
      const poNum = await getNextPurchasingDocNumber(db, "PURCHASE_ORDER", "PO");
      const po = await db.purchaseOrder.create({
        data: {
          poNumber: poNum,
          supplierId: testSupplierId,
          status: PurchaseOrderStatus.SENT,
          issueDate: new Date(),
          subtotal: 6500,
          discount: 0,
          tax: 910,
          total: 7410,
          items: {
            create: [
              {
                productId: testProductId,
                quantity: 50,
                unitPrice: 130,
                taxRate: 14,
                taxAmount: 910,
                total: 7410,
              },
            ],
          },
        },
      });

      // Initial state: Product stock = 50, costPrice = 100.
      // First partial receipt: Receive 20 units @ 130 EGP.
      // Expected WAC: ((50 * 100) + (20 * 130)) / (50 + 20) = (5000 + 2600) / 70 = 7600 / 70 = 108.57 EGP.
      // Expected PO status: PARTIALLY_RECEIVED
      const receipt1 = await receiveGoodsTransaction(
        {
          poId: po.id,
          supplierId: testSupplierId,
          warehouseId: testWarehouseId,
          items: [
            {
              productId: testProductId,
              quantity: 20,
              unitCost: 130,
            },
          ],
          createdById: "test-user",
        },
        db
      );

      expect(receipt1.receipt.receiptNumber).toMatch(/^GR-/);
      expect(receipt1.poUpdatedStatus).toBe(PurchaseOrderStatus.PARTIALLY_RECEIVED);

      // Verify Product Cost Price updated to 108.57
      const prodAfterReceipt1 = await db.product.findUnique({
        where: { id: testProductId },
      });
      expect(Number(prodAfterReceipt1?.costPrice)).toBe(108.57);

      // Verify Stock Level increased: 50 + 20 = 70
      const stockAfterReceipt1 = await db.stockLevel.findUnique({
        where: {
          productId_warehouseId: {
            productId: testProductId,
            warehouseId: testWarehouseId,
          },
        },
      });
      expect(Number(stockAfterReceipt1?.quantity)).toBe(70);

      // Second receipt: Receive the remaining 30 units @ 140 EGP.
      // Current valuation: 70 units @ 108.57 = 7599.90
      // Received: 30 units @ 140 = 4200.00
      // Total valuation: 11799.90 / 100 units = 118.00 EGP.
      // Expected PO status: RECEIVED
      const receipt2 = await receiveGoodsTransaction(
        {
          poId: po.id,
          supplierId: testSupplierId,
          warehouseId: testWarehouseId,
          items: [
            {
              productId: testProductId,
              quantity: 30,
              unitCost: 140,
            },
          ],
          createdById: "test-user",
        },
        db
      );

      expect(receipt2.poUpdatedStatus).toBe(PurchaseOrderStatus.RECEIVED);

      // Check PO in database is RECEIVED
      const updatedPo = await db.purchaseOrder.findUnique({
        where: { id: po.id },
      });
      expect(updatedPo?.status).toBe(PurchaseOrderStatus.RECEIVED);

      // Verify Stock Level is now 100
      const stockAfterReceipt2 = await db.stockLevel.findUnique({
        where: {
          productId_warehouseId: {
            productId: testProductId,
            warehouseId: testWarehouseId,
          },
        },
      });
      expect(Number(stockAfterReceipt2?.quantity)).toBe(100);
    });
  });

  describe("Purchase Invoice & Double-Entry Posting", () => {
    it("posts invoice: updates status to ISSUED, increments supplier balance, and creates balanced journal entry", async () => {
      const invNum = await getNextPurchasingDocNumber(db, "PURCHASE_INVOICE", "PINV");

      // 10 items @ 120 = 1200, discount = 100, taxable = 1100, tax 14% = 154, total = 1254
      const invoice = await db.purchaseInvoice.create({
        data: {
          invoiceNumber: invNum,
          supplierId: testSupplierId,
          status: PurchaseInvoiceStatus.DRAFT,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 86400000 * 30),
          subtotal: 1200,
          discount: 100,
          tax: 154,
          total: 1254,
          items: {
            create: [
              {
                productId: testProductId,
                quantity: 10,
                unitPrice: 120,
                discount: 100,
                taxRate: 14,
                taxAmount: 154,
                total: 1254,
              },
            ],
          },
        },
      });

      const postedInvoice = await postPurchaseInvoiceTransaction(
        { invoiceId: invoice.id, userId: "test-user" },
        db
      );

      expect(postedInvoice.status).toBe(PurchaseInvoiceStatus.ISSUED);

      // Verify supplier balance increased by 1254 (AP credit)
      const supplier = await db.supplier.findUnique({
        where: { id: testSupplierId },
      });
      expect(Number(supplier?.balance)).toBe(1254);

      // Verify Journal Entry was created and posted
      const journal = await db.journalEntry.findFirst({
        where: {
          sourceType: "PURCHASE_INVOICE",
          sourceId: invoice.id,
        },
        include: { lines: true },
      });

      expect(journal).toBeDefined();
      expect(journal?.status).toBe("POSTED");

      // Balanced journal entry: Total Debit == Total Credit
      const totalDebit = journal!.lines.reduce((s, l) => s + Number(l.debit), 0);
      const totalCredit = journal!.lines.reduce((s, l) => s + Number(l.credit), 0);
      expect(totalDebit).toBe(1254);
      expect(totalCredit).toBe(1254);

      // Check lines detail:
      // Dr Inventory (1140): 1100 (net subtotal)
      // Dr VAT (2120): 154
      // Cr AP (2110): 1254
      const inventoryLine = journal!.lines.find((l) => Number(l.debit) === 1100);
      const vatLine = journal!.lines.find((l) => Number(l.debit) === 154);
      const apLine = journal!.lines.find((l) => Number(l.credit) === 1254);

      expect(inventoryLine).toBeDefined();
      expect(vatLine).toBeDefined();
      expect(apLine).toBeDefined();
    });
  });

  describe("Supplier Payments & Balance Allocation", () => {
    it("records partial and full payments, updates supplier balance and invoice status", async () => {
      // Find the issued invoice (total 1254)
      const invoice = await db.purchaseInvoice.findFirst({
        where: { supplierId: testSupplierId, status: PurchaseInvoiceStatus.ISSUED },
      });
      expect(invoice).toBeDefined();

      // 1. Partial payment of 500 EGP via CASH
      const payment1 = await recordSupplierPaymentTransaction(
        {
          supplierId: testSupplierId,
          invoiceId: invoice!.id,
          amount: 500,
          method: PaymentMethod.CASH,
          notes: "سداد دفعة أولى نقداً",
          userId: "test-user",
        },
        db
      );

      expect(payment1.paymentNumber).toMatch(/^SPAY-/);

      // Check supplier balance: 1254 - 500 = 754
      const supplierAfterP1 = await db.supplier.findUnique({
        where: { id: testSupplierId },
      });
      expect(Number(supplierAfterP1?.balance)).toBe(754);

      // Check invoice status: PARTIALLY_PAID, paidAmount = 500
      const invoiceAfterP1 = await db.purchaseInvoice.findUnique({
        where: { id: invoice!.id },
      });
      expect(invoiceAfterP1?.status).toBe(PurchaseInvoiceStatus.PARTIALLY_PAID);
      expect(Number(invoiceAfterP1?.paidAmount)).toBe(500);

      // Verify payment journal entry: Dr AP (2110) 500, Cr Cash (1110) 500
      const journal1 = await db.journalEntry.findFirst({
        where: {
          sourceType: "SUPPLIER_PAYMENT",
          sourceId: payment1.id,
        },
        include: { lines: true },
      });
      expect(journal1).toBeDefined();
      const debit1 = journal1!.lines.reduce((s, l) => s + Number(l.debit), 0);
      const credit1 = journal1!.lines.reduce((s, l) => s + Number(l.credit), 0);
      expect(debit1).toBe(500);
      expect(credit1).toBe(500);

      // 2. Final payment of remaining 754 EGP via BANK
      const payment2 = await recordSupplierPaymentTransaction(
        {
          supplierId: testSupplierId,
          invoiceId: invoice!.id,
          amount: 754,
          method: PaymentMethod.BANK,
          reference: "CHQ-123456",
          notes: "سداد المتبقي تحويل بنكي",
          userId: "test-user",
        },
        db
      );

      expect(payment2.paymentNumber).toMatch(/^SPAY-/);

      // Supplier balance should now be 0
      const supplierAfterP2 = await db.supplier.findUnique({
        where: { id: testSupplierId },
      });
      expect(Number(supplierAfterP2?.balance)).toBe(0);

      // Invoice status should now be PAID
      const invoiceAfterP2 = await db.purchaseInvoice.findUnique({
        where: { id: invoice!.id },
      });
      expect(invoiceAfterP2?.status).toBe(PurchaseInvoiceStatus.PAID);
      expect(Number(invoiceAfterP2?.paidAmount)).toBe(1254);
    });
  });

  describe("Purchase Returns", () => {
    it("returns goods to supplier: deducts stock, reduces balance, and posts reversal journal", async () => {
      // Stock is currently 100
      const returnResult = await createPurchaseReturnTransaction(
        {
          supplierId: testSupplierId,
          warehouseId: testWarehouseId,
          notes: "مرتجع أصناف بها عيوب تصنيع",
          items: [
            {
              productId: testProductId,
              quantity: 5,
              unitPrice: 120, // subtotal 600, tax 14% = 84, total = 684
              taxAmount: 84,
              total: 684,
            },
          ],
          userId: "test-user",
        },
        db
      );

      expect(returnResult.returnNumber).toMatch(/^PRTN-/);
      expect(Number(returnResult.total)).toBe(684);

      // Stock should be deducted from 100 to 95
      const stock = await db.stockLevel.findUnique({
        where: {
          productId_warehouseId: {
            productId: testProductId,
            warehouseId: testWarehouseId,
          },
        },
      });
      expect(Number(stock?.quantity)).toBe(95);

      // Supplier balance should now be -684 (supplier owes us credit)
      const supplier = await db.supplier.findUnique({
        where: { id: testSupplierId },
      });
      expect(Number(supplier?.balance)).toBe(-684);

      // Verify Reversal Journal Entry
      const journal = await db.journalEntry.findFirst({
        where: {
          sourceType: "PURCHASE_RETURN",
          sourceId: returnResult.id,
        },
        include: { lines: true },
      });

      expect(journal).toBeDefined();
      expect(journal?.status).toBe("POSTED");

      const totalDebit = journal!.lines.reduce((s, l) => s + Number(l.debit), 0);
      const totalCredit = journal!.lines.reduce((s, l) => s + Number(l.credit), 0);
      expect(totalDebit).toBe(684);
      expect(totalCredit).toBe(684);
    });
  });

  describe("Supplier Statement of Account", () => {
    it("generates chronological ledger with accurate running balances", async () => {
      const statement = await getSupplierStatementOfAccount(testSupplierId);

      expect(statement.entries.length).toBeGreaterThanOrEqual(4);

      // Transactions include:
      // 1. Invoice (credit 1254 -> balance +1254)
      // 2. Payment 1 (debit 500 -> balance +754)
      // 3. Payment 2 (debit 754 -> balance 0)
      // 4. Return (debit 684 -> balance -684)
      const finalEntry = statement.entries[statement.entries.length - 1];
      expect(finalEntry.runningBalance).toBe(-684);
      expect(statement.closingBalance).toBe(-684);
    });
  });
});
