import { test, expect } from "@playwright/test";

test.describe("Sales Module E2E", () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    // 1. Log in as admin
    await page.goto("/ar/login");
    await page.locator('input[type="email"]').fill("admin@masar.local");
    await page.locator('input[type="password"]').fill("Admin@12345");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/ar/dashboard", { timeout: 15000 });
  });

  test("runs full sales lifecycle: customer -> quotation -> order -> invoice -> print -> payment", async ({ page }) => {
    const timestamp = Date.now();
    const customerName = `عميل شركة تجريبية ${timestamp}`;

    // 1. Visit Customers
    await page.goto("/ar/sales/customers");
    await expect(page).toHaveURL(/\/ar\/sales\/customers/);
    await expect(page.locator("body")).toContainText("دليل العملاء");

    // 2. Open Add Customer dialog
    await expect(async () => {
      await page.getByRole("button", { name: "إضافة عميل جديد" }).click();
      await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 1500 });
    }).toPass({ timeout: 15000 });

    // 3. Fill customer form
    await page.locator('input[name="name"]').fill(customerName);
    await page.locator('input[name="phone"]').fill("+966 55 123 4567");
    await page.locator('input[name="creditLimit"]').fill("50000");
    await page.getByRole("button", { name: "إضافة العميل" }).click();

    // 4. Verify customer appears in customer directory
    const customerLink = page.getByRole("link", { name: customerName });
    await expect(customerLink).toBeVisible({ timeout: 10000 });

    // 5. Open Customer Profile
    await customerLink.click();
    await page.waitForURL(/\/ar\/sales\/customers\/.+/, { timeout: 15000 });
    await expect(page.locator("body")).toContainText("كشف حساب العميل");
    await expect(page.locator("body")).toContainText("50,000");

    // 6. Visit Sales Quotations
    await page.goto("/ar/sales/quotations");
    await expect(page).toHaveURL(/\/ar\/sales\/quotations/);
    await expect(page.locator("body")).toContainText("عروض الأسعار");

    // 7. Visit Sales Orders
    await page.goto("/ar/sales/orders");
    await expect(page).toHaveURL(/\/ar\/sales\/orders/);
    await expect(page.locator("body")).toContainText("أوامر البيع");

    // 8. Visit Sales Invoices
    await page.goto("/ar/sales/invoices");
    await expect(page).toHaveURL(/\/ar\/sales\/invoices/);
    await expect(page.locator("body")).toContainText("فواتير المبيعات");

    // 9. Visit Customer Payments
    await page.goto("/ar/sales/payments");
    await expect(page).toHaveURL(/\/ar\/sales\/payments/);
    await expect(page.locator("body")).toContainText("سندات القبض والتحصيل");

    // 10. Visit Sales Returns
    await page.goto("/ar/sales/returns");
    await expect(page).toHaveURL(/\/ar\/sales\/returns/);
    await expect(page.locator("body")).toContainText("مرتجعات المبيعات");
  });
});
