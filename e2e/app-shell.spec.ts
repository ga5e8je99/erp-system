import { test, expect } from "@playwright/test";

test.describe("App Shell & Design System", () => {
  test("user can log in, see app shell, and inspect design system in Arabic and English", async ({
    page,
  }) => {
    // 1. Log in as admin
    await page.goto("/ar/login");
    await page.locator('input[type="email"]').fill("admin@masar.local");
    await page.locator('input[type="password"]').fill("Admin@12345");
    await page.locator('button[type="submit"]').click();

    // 2. Wait for dashboard
    await page.waitForURL("**/ar/dashboard", { timeout: 15000 });
    await expect(page).toHaveURL(/\/ar\/dashboard/);

    // 3. Verify App Shell Header & Navigation
    await expect(page.locator("header")).toBeVisible();
    await expect(page.getByRole("button", { name: "تبديل المظهر" })).toBeVisible();

    // 4. Visit Design System page (disabled in production per Phase 3 security requirements)
    await page.goto("/ar/design-system");
    await expect(page.locator("body")).toContainText(/(Page Not Found|الصفحة غير موجودة|نظام التصميم)/);

    // If accessible in dev mode, verify design system sections
    const hasDesignSystem = await page
      .getByRole("heading", { name: "نظام التصميم" })
      .isVisible()
      .catch(() => false);

    if (hasDesignSystem) {
      await expect(page.locator("body")).toContainText("إجمالي المبيعات");
      await expect(page.locator("body")).toContainText("نموذج تجريبي تفاعلي");
      await expect(page.locator("body")).toContainText("SO-2026-0001");
      await expect(page.locator("body")).toContainText("المجموع الكلي");

      // Visit Design System in English
      await page.goto("/en/design-system");
      await expect(page).toHaveURL(/\/en\/design-system/);
      await expect(page.locator("h1")).toContainText("Design System");
      await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    }
  });
});
