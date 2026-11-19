import { test, expect } from "@playwright/test";

test.describe("Purchasing Module E2E", () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    // 1. Log in as admin
    await page.goto("/ar/login");
    await page.locator('input[type="email"]').fill("admin@masar.local");
    await page.locator('input[type="password"]').fill("Admin@12345");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/ar/dashboard", { timeout: 15000 });
  });

  test("runs purchasing module navigation, supplier management, and document workflows", async ({ page }) => {
    const timestamp = Date.now();
    const supplierName = `مورد شركة التوريدات ${timestamp}`;

    // 1. Visit Suppliers Directory
    await page.goto("/ar/purchasing/suppliers");
    await expect(page).toHaveURL(/\/ar\/purchasing\/suppliers/);
    await expect(page.locator("body")).toContainText("دليل الموردين");

    // 2. Open Add Supplier dialog (retry click until hydrated)
    await expect(async () => {
      await page.getByRole("button", { name: "إضافة مورد جديد" }).click();
      await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 1500 });
    }).toPass({ timeout: 15000 });

    // 3. Fill and submit supplier form
    await page.locator('input[name="name"]').fill(supplierName);
    await page.locator('input[name="phone"]').fill("+966 50 987 6543");
    await page.locator('input[name="email"]').fill(`supp-${timestamp}@example.com`);
    await page.locator('input[name="taxNumber"]').fill("300000000000003");
    await page.getByRole("button", { name: "إضافة المورد" }).click();

    // 4. Verify supplier appears in directory
    const supplierLink = page.getByRole("link", { name: supplierName });
    await expect(supplierLink).toBeVisible({ timeout: 10000 });

    // 5. Open Supplier Profile and verify statement of account tabs
    await supplierLink.click();
    await page.waitForURL(/\/ar\/purchasing\/suppliers\/.+/, { timeout: 15000 });
    await expect(page.locator("body")).toContainText("كشف الحساب");
    await expect(page.locator("body")).toContainText(supplierName);

    // 6. Visit Purchase Orders list
    await page.goto("/ar/purchasing/orders");
    await expect(page).toHaveURL(/\/ar\/purchasing\/orders/);
    await expect(page.locator("body")).toContainText("أوامر الشراء");

    // 7. Visit Goods Receipts
    await page.goto("/ar/purchasing/receipts");
    await expect(page).toHaveURL(/\/ar\/purchasing\/receipts/);
    await expect(page.locator("body")).toContainText("إيصالات استلام البضائع");

    // 8. Visit Purchase Invoices
    await page.goto("/ar/purchasing/invoices");
    await expect(page).toHaveURL(/\/ar\/purchasing\/invoices/);
    await expect(page.locator("body")).toContainText("فواتير المشتريات");

    // 9. Visit Supplier Payments
    await page.goto("/ar/purchasing/payments");
    await expect(page).toHaveURL(/\/ar\/purchasing\/payments/);
    await expect(page.locator("body")).toContainText("سندات صرف الموردين");

    // 10. Visit Purchase Returns
    await page.goto("/ar/purchasing/returns");
    await expect(page).toHaveURL(/\/ar\/purchasing\/returns/);
    await expect(page.locator("body")).toContainText("مرتجعات المشتريات");

    // 11. Verify English locale rendering
    await page.goto("/en/purchasing/suppliers");
    await expect(page).toHaveURL(/\/en\/purchasing\/suppliers/);
    await expect(page.locator("body")).toContainText("Suppliers Directory");
  });
});
