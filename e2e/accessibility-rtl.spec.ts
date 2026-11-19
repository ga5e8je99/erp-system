import { test, expect } from "@playwright/test";

const KEY_PAGES = [
  { path: "/login", name: "Login", requiresAuth: false },
  { path: "/dashboard", name: "Dashboard", requiresAuth: true },
  { path: "/inventory/products", name: "Products", requiresAuth: true },
  { path: "/sales/invoices", name: "Sales Invoices", requiresAuth: true },
  { path: "/purchasing/orders", name: "Purchase Orders", requiresAuth: true },
  { path: "/accounting/journal", name: "Journal Entries", requiresAuth: true },
  { path: "/accounting/reports/trial-balance", name: "Trial Balance", requiresAuth: true },
  { path: "/hr/employees", name: "Employees", requiresAuth: true },
  { path: "/reports", name: "Reports Hub", requiresAuth: true },
  { path: "/settings", name: "Company Settings", requiresAuth: true },
];

test.describe("Accessibility & RTL Audit across 10 Key Pages", () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    // Authenticate once before testing authenticated routes
    await page.goto("/ar/login");
    await page.locator('input[type="email"]').fill("admin@masar.local");
    await page.locator('input[type="password"]').fill("Admin@12345");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/ar/dashboard", { timeout: 20000 });
  });

  for (const target of KEY_PAGES) {
    test(`audits Arabic RTL layout & semantics for ${target.name} (/ar${target.path})`, async ({
      page,
    }) => {
      if (!target.requiresAuth) {
        await page.context().clearCookies();
      }
      await page.goto(`/ar${target.path}`);
      await expect(page).toHaveURL(new RegExp(`/ar${target.path}`));

      // 1. Verify HTML dir and lang attributes
      const dir = await page.locator("html").getAttribute("dir");
      const lang = await page.locator("html").getAttribute("lang");
      expect(dir).toBe("rtl");
      expect(lang).toBe("ar");

      // 2. Verify Page Content Loaded
      await expect(page.locator("body")).toBeVisible();

      // 3. Verify No Horizontal Body Overflow (Responsive RTL layout)
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 20;
      });
      expect(hasHorizontalOverflow).toBe(false);

      // 4. Verify Interactive Elements Have Accessible Labels
      const unlabeledButtons = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button:not([disabled])"));
        return buttons.filter((btn) => {
          const text = btn.textContent?.trim();
          const ariaLabel = btn.getAttribute("aria-label");
          const ariaLabelledBy = btn.getAttribute("aria-labelledby");
          const title = btn.getAttribute("title");
          return !text && !ariaLabel && !ariaLabelledBy && !title;
        }).length;
      });
      expect(unlabeledButtons).toBe(0);
    });

    test(`audits English LTR layout & semantics for ${target.name} (/en${target.path})`, async ({
      page,
    }) => {
      if (!target.requiresAuth) {
        await page.context().clearCookies();
      }
      await page.goto(`/en${target.path}`);
      await expect(page).toHaveURL(new RegExp(`/en${target.path}`));

      // 1. Verify HTML dir and lang attributes
      const dir = await page.locator("html").getAttribute("dir");
      const lang = await page.locator("html").getAttribute("lang");
      expect(dir).toBe("ltr");
      expect(lang).toBe("en");

      // 2. Verify Page Content Loaded
      await expect(page.locator("body")).toBeVisible();

      // 3. Verify No Horizontal Body Overflow (Responsive LTR layout)
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 20;
      });
      expect(hasHorizontalOverflow).toBe(false);
    });
  }
});
