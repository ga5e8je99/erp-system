import { test, expect } from "@playwright/test";

test.describe("Executive Dashboard, Reports Center & Notifications Workflow", () => {
  test("runs comprehensive end-to-end verification", async ({ page, request }) => {
    // 1. Authenticate as Admin
    await page.goto("/ar/login");
    await page.locator('input[type="email"]').fill("admin@masar.local");
    await page.locator('input[type="password"]').fill("Admin@12345");
    await page.locator('button[type="submit"]').click();

    // Wait for redirection to dashboard
    await page.waitForURL("**/ar/dashboard", { timeout: 20000 });
    console.log("Step 1: Dashboard loaded");

    // 2. Verify Dashboard KPIs and Date Presets
    await expect(page.locator("h1")).toContainText("لوحة التحكم");
    await expect(page.getByText("مبيعات اليوم")).toBeVisible();
    await expect(page.getByText("مستحقات العملاء")).toBeVisible();
    await expect(page.getByText("الرصيد النقدي والبنكي")).toBeVisible();

    // Test Date Preset filter button
    const todayBtn = page.getByRole("button", { name: "اليوم" });
    if (await todayBtn.isVisible()) {
      await todayBtn.click();
      await expect(page).toHaveURL(/period=today/);
      console.log("Step 2: Date filter switched to Today");
    }

    const monthBtn = page.getByRole("button", { name: "هذا الشهر" });
    if (await monthBtn.isVisible()) {
      await monthBtn.click();
      await expect(page).toHaveURL(/period=month/);
      console.log("Step 2: Date filter restored to Month");
    }

    // 3. Verify Operational Tables on Dashboard
    await expect(page.getByText("أحدث فواتير المبيعات", { exact: true })).toBeVisible();
    await expect(page.getByText("فواتير متأخرة السداد", { exact: true })).toBeVisible();
    await expect(page.getByText("تنبيهات انخفاض المخزون", { exact: true })).toBeVisible();
    await expect(page.getByText("طلبات الإجازات المعلقة", { exact: true })).toBeVisible();
    console.log("Step 3: Dashboard tables and widgets verified");

    // 4. Test Notifications Center
    await page.goto("/ar/notifications");
    await expect(page.locator("h1")).toContainText("مركز الإشعارات");
    await expect(page.getByRole("tab", { name: /تنبيهات المخزون/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /الفواتير المتأخرة/ })).toBeVisible();

    // Trigger System Scan Now
    const scanBtn = page.getByRole("button", { name: "فحص النظام الآن" });
    if (await scanBtn.isVisible()) {
      await scanBtn.click();
      await page.waitForTimeout(2000);
      console.log("Step 4: System notification scan executed");
    }

    // 5. Test Scheduled Job / Cron Route Handler
    const cronRes = await request.get("/api/cron/notifications?secret=masar_cron_secret");
    expect(cronRes.status()).toBe(200);
    const cronJson = await cronRes.json();
    expect(cronJson.success).toBe(true);
    expect(cronJson.generated).toBeDefined();
    console.log("Step 5: Cron route handler verified:", cronJson);

    // 6. Test Reports Center Gallery Hub
    await page.goto("/ar/reports");
    await expect(page.locator("h1")).toContainText("مركز التقارير");
    await expect(page.getByText("تقارير المبيعات")).toBeVisible();
    await expect(page.getByText("تقارير المشتريات")).toBeVisible();
    await expect(page.getByText("تقارير المخزون")).toBeVisible();
    await expect(page.getByText("تقارير الربحية والهوامش")).toBeVisible();
    await expect(page.getByText("التقارير المالية والمحاسبية")).toBeVisible();
    await expect(page.getByText("تقارير الموارد البشرية")).toBeVisible();
    console.log("Step 6: Reports Center gallery verified");

    // 7. Verify Sales by Customer Report
    await page.goto("/ar/reports/sales-by-customer");
    await expect(page.locator("h1").first()).toContainText("تقرير المبيعات حسب العميل");
    await expect(page.getByRole("button", { name: "تصدير Excel (CSV)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "طباعة التقرير" })).toBeVisible();
    console.log("Step 7: Sales by customer report verified");

    // 8. Verify Inventory Valuation Report
    await page.goto("/ar/reports/inventory-valuation");
    await expect(page.locator("h1").first()).toContainText("تقرير تقييم المخزون");
    await expect(page.getByText("تكلفة الوحدة (WAC)")).toBeVisible();
    await expect(page.getByRole("button", { name: "تصدير Excel (CSV)" })).toBeVisible();
    console.log("Step 8: Inventory valuation report verified");

    // 9. Verify Profit by Product Report
    await page.goto("/ar/reports/profit-by-product");
    await expect(page.locator("h1").first()).toContainText("تقرير ربحية المنتجات");
    await expect(page.getByText("التكلفة (COGS)")).toBeVisible();
    await expect(page.getByText("مجمل الربح")).toBeVisible();
    console.log("Step 9: Profit by product report verified");

    // 10. Verify HR Attendance Summary Report
    await page.goto("/ar/reports/hr-attendance");
    await expect(page.locator("h1").first()).toContainText("تقرير ملخص حضور وانصراف الموظفين");
    await expect(page.getByRole("columnheader", { name: "نسبة الالتزام" })).toBeVisible();
    console.log("Step 10: HR attendance report verified");

    console.log("All Dashboard, Reports, and Notification verification steps passed!");
  });
});
