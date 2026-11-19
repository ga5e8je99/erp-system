import { test, expect } from "@playwright/test";

test.describe("Accounting Module E2E", () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    // 1. Log in as admin
    await page.goto("/ar/login");
    await page.locator('input[type="email"]').fill("admin@masar.local");
    await page.locator('input[type="password"]').fill("Admin@12345");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/ar/dashboard", { timeout: 20000 });
  });

  test("runs comprehensive accounting navigation and report verification", async ({ page }) => {
    // 1. Visit Chart of Accounts
    await page.goto("/ar/accounting/accounts");
    await expect(page).toHaveURL(/\/ar\/accounting\/accounts/);
    await expect(page.locator("body")).toContainText("دليل الحسابات");
    await expect(page.locator("body")).toContainText("الأصول");
    await expect(page.locator("body")).toContainText("الالتزامات");
    await expect(page.locator("body")).toContainText("حقوق الملكية");
    await expect(page.locator("body")).toContainText("الإيرادات");
    await expect(page.locator("body")).toContainText("المصروفات");

    // 2. Visit Journal Entries
    await page.goto("/ar/accounting/journal");
    await expect(page).toHaveURL(/\/ar\/accounting\/journal/);
    await expect(page.locator("body")).toContainText("قيود اليومية");

    // 3. Inspect a Journal Entry details
    const firstEntryLink = page.locator('table tbody tr a[href*="/accounting/journal/"]').first();
    if (await firstEntryLink.isVisible()) {
      await firstEntryLink.click();
      await page.waitForURL(/\/ar\/accounting\/journal\/.+/, { timeout: 15000 });
      await expect(page.locator("body")).toContainText("العودة لسجل القيود");
      await expect(page.locator("body")).toContainText("أطراف وسطور القيد المحاسبي");
    }

    // 4. Visit Fiscal Periods
    await page.goto("/ar/accounting/periods");
    await expect(page).toHaveURL(/\/ar\/accounting\/periods/);
    await expect(page.locator("body")).toContainText("الفترات المالية");

    // 5. Visit Expenses
    await page.goto("/ar/accounting/expenses");
    await expect(page).toHaveURL(/\/ar\/accounting\/expenses/);
    await expect(page.locator("body")).toContainText("سجل المصروفات");

    // 6. Visit Reports Hub
    await page.goto("/ar/accounting/reports");
    await expect(page).toHaveURL(/\/ar\/accounting\/reports/);
    await expect(page.locator("body")).toContainText("التقارير والقوائم المالية");
    await expect(page.locator("body")).toContainText("ميزان المراجعة");
    await expect(page.locator("body")).toContainText("قائمة الدخل");
    await expect(page.locator("body")).toContainText("الميزانية العمومية");
    await expect(page.locator("body")).toContainText("دفتر الأستاذ العام");
    await expect(page.locator("body")).toContainText("أعمار الديون");
    await expect(page.locator("body")).toContainText("ضريبة القيمة المضافة");

    // 7. Visit Trial Balance Report
    await page.goto("/ar/accounting/reports/trial-balance");
    await expect(page).toHaveURL(/\/ar\/accounting\/reports\/trial-balance/);
    await expect(page.locator("body")).toContainText("ميزان المراجعة");
    await expect(page.locator("body")).toContainText("تصدير CSV");

    // 8. Visit General Ledger Report
    await page.goto("/ar/accounting/reports/general-ledger");
    await expect(page).toHaveURL(/\/ar\/accounting\/reports\/general-ledger/);
    await expect(page.locator("body")).toContainText("دفتر الأستاذ العام");

    // 9. Visit Profit and Loss Report
    await page.goto("/ar/accounting/reports/profit-loss");
    await expect(page).toHaveURL(/\/ar\/accounting\/reports\/profit-loss/);
    await expect(page.locator("body")).toContainText("قائمة الدخل");

    // 10. Visit Balance Sheet Report
    await page.goto("/ar/accounting/reports/balance-sheet");
    await expect(page).toHaveURL(/\/ar\/accounting\/reports\/balance-sheet/);
    await expect(page.locator("body")).toContainText("الميزانية العمومية");

    // 11. Visit Customer and Supplier Aging Report
    await page.goto("/ar/accounting/reports/aging");
    await expect(page).toHaveURL(/\/ar\/accounting\/reports\/aging/);
    await expect(page.locator("body")).toContainText("أعمار الديون");

    // 12. Visit Tax Summary Report
    await page.goto("/ar/accounting/reports/tax-summary");
    await expect(page).toHaveURL(/\/ar\/accounting\/reports\/tax-summary/);
    await expect(page.locator("body")).toContainText("ملخص وإقرار ضريبة القيمة المضافة");

    // 13. Visit Accounting Settings (GL Account Mappings)
    await page.goto("/ar/accounting/settings");
    await expect(page).toHaveURL(/\/ar\/accounting\/settings/);
    await expect(page.locator("body")).toContainText("ربط الحسابات");
  });
});
