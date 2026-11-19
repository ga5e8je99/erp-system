import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { receiveGoodsTransaction } from "@/features/purchasing/services/purchasing-service";
import {
  issueSalesInvoiceTransaction,
  recordCustomerPaymentTransaction,
} from "@/features/sales/services/sales-service";
import { PaymentMethod, Prisma } from "@prisma/client";

test.describe("Critical Business Flow E2E", () => {
  test.setTimeout(90000);

  test("runs full critical lifecycle: login -> create product -> purchase & receive -> create customer -> sell & issue invoice -> record payment -> verify dashboard and trial balance", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const productName = `منتج الدورة المتكاملة ${timestamp}`;
    const customerName = `عميل الدورة المتكاملة ${timestamp}`;
    const supplierName = `مورد الدورة المتكاملة ${timestamp}`;

    // -------------------------------------------------------------------------
    // 1. User Authentication
    // -------------------------------------------------------------------------
    await page.goto("/ar/login");
    await page.locator('input[type="email"]').fill("admin@masar.local");
    await page.locator('input[type="password"]').fill("Admin@12345");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/ar/dashboard", { timeout: 20000 });
    await expect(page.locator("body")).toContainText("لوحة التحكم");

    // -------------------------------------------------------------------------
    // 2. Create Master Product in Inventory
    // -------------------------------------------------------------------------
    await page.goto("/ar/inventory/products");
    await expect(page).toHaveURL(/\/ar\/inventory\/products/);
    await expect(page.locator("body")).toContainText("دليل المنتجات والأصناف");

    const addProductBtn = page.getByRole("button", { name: "إضافة منتج جديد" });
    await expect(addProductBtn).toBeVisible({ timeout: 10000 });
    await addProductBtn.click();

    await page.locator('input[id="name"]').fill(productName);
    await page.getByRole("tab", { name: "الأسعار والضريبة" }).click();
    await page.locator('input[id="costPrice"]').fill("150");
    await page.locator('input[id="salePrice"]').fill("250");
    await page.getByRole("button", { name: "حفظ" }).click();

    // Verify product appears in catalog
    await expect(page.locator("body")).toContainText(productName, { timeout: 15000 });

    // Fetch the created product from DB
    const product = await db.product.findFirst({
      where: { name: productName },
    });
    expect(product).not.toBeNull();
    const productId = product!.id;

    // Get default warehouse WH-MAIN
    const warehouse = await db.warehouse.findFirst({
      where: { code: "WH-MAIN" },
    });
    expect(warehouse).not.toBeNull();
    const warehouseId = warehouse!.id;

    // Get admin user
    const adminUser = await db.user.findFirst({
      where: { email: "admin@masar.local" },
    });
    expect(adminUser).not.toBeNull();
    const adminId = adminUser!.id;

    // -------------------------------------------------------------------------
    // 3. Create Supplier & Receive Goods (Purchase & Stock IN)
    // -------------------------------------------------------------------------
    await page.goto("/ar/purchasing/suppliers");
    await expect(page).toHaveURL(/\/ar\/purchasing\/suppliers/);

    await expect(async () => {
      await page.getByRole("button", { name: "إضافة مورد جديد" }).click();
      await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 1500 });
    }).toPass({ timeout: 15000 });

    await page.locator('input[name="name"]').fill(supplierName);
    await page.locator('input[name="phone"]').fill("+966 50 111 2233");
    await page.getByRole("button", { name: "إضافة المورد" }).click();
    await expect(page.locator("body")).toContainText(supplierName, { timeout: 10000 });

    const supplier = await db.supplier.findFirst({
      where: { name: supplierName },
    });
    expect(supplier).not.toBeNull();

    // Receive 100 units of the product @ 150 EGP
    const { receipt } = await receiveGoodsTransaction({
      poId: null,
      supplierId: supplier!.id,
      warehouseId,
      receiveDate: new Date(),
      notes: "استلام بضاعة تجريبية للدورة المتكاملة",
      items: [
        {
          productId,
          quantity: 100,
          unitCost: 150,
        },
      ],
      createdById: adminId,
    });
    expect(receipt.id).toBeDefined();

    // Verify Stock Level in UI reflects 100 units
    await page.goto(`/ar/inventory/stock?q=${encodeURIComponent(productName)}`);
    await expect(page).toHaveURL(/\/ar\/inventory\/stock/);
    await expect(page.locator("body")).toContainText("أرصدة المخزون");
    await expect(page.locator("body")).toContainText(productName);
    await expect(page.locator("body")).toContainText("100");

    // -------------------------------------------------------------------------
    // 4. Create Customer
    // -------------------------------------------------------------------------
    await page.goto("/ar/sales/customers");
    await expect(page).toHaveURL(/\/ar\/sales\/customers/);
    await expect(page.locator("body")).toContainText("دليل العملاء");

    await expect(async () => {
      await page.getByRole("button", { name: "إضافة عميل جديد" }).click();
      await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 1500 });
    }).toPass({ timeout: 15000 });

    await page.locator('input[name="name"]').fill(customerName);
    await page.locator('input[name="phone"]').fill("+966 55 444 5566");
    await page.locator('input[name="creditLimit"]').fill("50000");
    await page.getByRole("button", { name: "إضافة العميل" }).click();

    await expect(page.locator("body")).toContainText(customerName, { timeout: 10000 });
    const customer = await db.customer.findFirst({
      where: { name: customerName },
    });
    expect(customer).not.toBeNull();

    // -------------------------------------------------------------------------
    // 5. Sell & Issue Invoice (Deducts Stock, Posts Journal Entry)
    // -------------------------------------------------------------------------
    // Create draft sales invoice for 10 units @ 250 EGP = 2,500 + 14% VAT (350) = 2,850 EGP
    const invoiceNumber = `INV-${timestamp.toString().slice(-6)}`;
    const invoice = await db.salesInvoice.create({
      data: {
        invoiceNumber,
        customerId: customer!.id,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "DRAFT",
        subtotal: new Prisma.Decimal(2500),
        discount: new Prisma.Decimal(0),
        tax: new Prisma.Decimal(350),
        total: new Prisma.Decimal(2850),
        paidAmount: new Prisma.Decimal(0),
        items: {
          create: [
            {
              productId,
              quantity: new Prisma.Decimal(10),
              unitPrice: new Prisma.Decimal(250),
              discount: new Prisma.Decimal(0),
              taxRate: new Prisma.Decimal(14),
              taxAmount: new Prisma.Decimal(350),
              total: new Prisma.Decimal(2850),
            },
          ],
        },
      },
    });

    // Issue invoice transaction: Deducts 10 units from stock, creates GL journal
    const issuedResult = await issueSalesInvoiceTransaction(
      invoice.id,
      warehouseId,
      adminId
    );
    expect(issuedResult.invoice.status).toBe("ISSUED");

    // Verify stock in UI decreased from 100 to 90 units
    await page.goto(`/ar/inventory/stock?q=${encodeURIComponent(productName)}`);
    await expect(page.locator("body")).toContainText(productName);
    await expect(page.locator("body")).toContainText("90");

    // Verify invoice in Sales Invoices list
    await page.goto(`/ar/sales/invoices?search=${encodeURIComponent(invoiceNumber)}`);
    await expect(page.locator("body")).toContainText(invoiceNumber);
    await expect(page.locator("body")).toContainText(customerName);

    // -------------------------------------------------------------------------
    // 6. Record Payment
    // -------------------------------------------------------------------------
    await recordCustomerPaymentTransaction({
      customerId: customer!.id,
      invoiceId: invoice.id,
      amount: 2850,
      method: PaymentMethod.BANK,
      date: new Date(),
      reference: `PAY-REF-${timestamp}`,
      notes: "سداد كامل قيمة الفاتورة عبر التحويل البنكي",
      userId: adminId,
    });

    // Verify invoice status is updated to PAID in UI
    await page.goto(`/ar/sales/invoices?search=${encodeURIComponent(invoiceNumber)}`);
    await expect(page.locator("body")).toContainText(invoiceNumber);
    await expect(page.locator("body")).toContainText("مدفوعة");

    // -------------------------------------------------------------------------
    // 7. Verify Executive Dashboard
    // -------------------------------------------------------------------------
    await page.goto("/ar/dashboard");
    await expect(page).toHaveURL(/\/ar\/dashboard/);
    await expect(page.locator("body")).toContainText("لوحة التحكم");
    // Verify invoice appears in Recent Invoices widget
    await expect(page.locator("body")).toContainText(invoiceNumber);

    // -------------------------------------------------------------------------
    // 8. Verify Accounting Trial Balance (Balanced Books)
    // -------------------------------------------------------------------------
    await page.goto("/ar/accounting/reports/trial-balance");
    await expect(page).toHaveURL(/\/ar\/accounting\/reports\/trial-balance/);
    await expect(page.locator("body")).toContainText("ميزان المراجعة");

    // Assert that the Trial Balance indicates perfect balance
    const balanceBanner = page.getByText(/ميزان المراجعة متزن تماماً/);
    await expect(balanceBanner).toBeVisible({ timeout: 15000 });
  });
});
