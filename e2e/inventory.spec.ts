import { test, expect } from "@playwright/test";

test.describe("Inventory Module", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Log in as admin
    await page.goto("/ar/login");
    await page.locator('input[type="email"]').fill("admin@masar.local");
    await page.locator('input[type="password"]').fill("Admin@12345");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/ar/dashboard", { timeout: 15000 });
  });

  test("manages products, catalogs, stock, and ledger", async ({ page }) => {
    // 1. Visit Products Catalog
    await page.goto("/ar/inventory/products");
    await expect(page).toHaveURL(/\/ar\/inventory\/products/);
    await expect(page.locator("body")).toContainText("دليل المنتجات والأصناف");

    // 2. Open Add Product dialog
    const addProductBtn = page.getByRole("button", { name: "إضافة منتج جديد" });
    await expect(addProductBtn).toBeVisible();
    await addProductBtn.click();

    // 3. Fill product form
    const uniqueName = `منتج اختبار مسار ${Date.now()}`;
    await page.locator('input[id="name"]').fill(uniqueName);

    // Switch to Pricing tab
    await page.getByRole("tab", { name: "الأسعار والضريبة" }).click();
    await page.locator('input[id="costPrice"]').fill("120");
    await page.locator('input[id="salePrice"]').fill("185");

    // Submit form
    await page.getByRole("button", { name: "حفظ" }).click();

    // 4. Verify product created and appears in list
    await expect(page.locator("body")).toContainText(uniqueName, { timeout: 10000 });

    // 5. Navigate to Categories
    await page.goto("/ar/inventory/categories");
    await expect(page).toHaveURL(/\/ar\/inventory\/categories/);
    await expect(page.locator("body")).toContainText("تصنيفات المنتجات");

    // 6. Navigate to Warehouses
    await page.goto("/ar/inventory/warehouses");
    await expect(page).toHaveURL(/\/ar\/inventory\/warehouses/);
    await expect(page.locator("body")).toContainText("المستودعات والفروع");
    await expect(page.locator("body")).toContainText("WH-MAIN");

    // 7. Navigate to Stock Overview
    await page.goto("/ar/inventory/stock");
    await expect(page).toHaveURL(/\/ar\/inventory\/stock/);
    await expect(page.locator("body")).toContainText("أرصدة المخزون");

    // 8. Navigate to Movement Ledger
    await page.goto("/ar/inventory/movements");
    await expect(page).toHaveURL(/\/ar\/inventory\/movements/);
    await expect(page.locator("body")).toContainText("سجل حركات المخزون");
  });
});
