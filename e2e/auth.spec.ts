import { test, expect } from "@playwright/test";

test.describe("Authentication flow", () => {
  test("user can log in, view dashboard, and log out", async ({ page }) => {
    // 1. Visit Login page
    await page.goto("/ar/login");
    await expect(page).toHaveURL(/\/ar\/login/);

    // 2. Fill credentials
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await emailInput.fill("admin@masar.local");
    await passwordInput.fill("Admin@12345");

    // 3. Submit
    await submitButton.click();

    // 4. Expect redirection to dashboard
    await page.waitForURL("**/ar/dashboard", { timeout: 15000 });
    await expect(page).toHaveURL(/\/ar\/dashboard/);

    // 5. Verify dashboard content
    await expect(page.locator("body")).toContainText("مدير النظام");

    // 6. Log out via user menu
    const userMenuTrigger = page.locator('[data-testid="user-menu-trigger"]');
    await expect(userMenuTrigger).toBeVisible();
    await userMenuTrigger.click();

    const logoutButton = page.locator('[data-slot="dropdown-menu-item"]:has-text("تسجيل الخروج"), [role="menuitem"]:has-text("تسجيل الخروج")');
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    // 7. Verify redirect back to login
    await page.waitForURL("**/ar/login", { timeout: 15000 });
    await expect(page).toHaveURL(/\/ar\/login/);
  });
});
