import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const LOCALES = ["ar", "en"] as const;
const THEMES = ["light", "dark"] as const;

test.describe("Axe Core Automated Accessibility Audit", () => {
  test.setTimeout(90000);

  for (const locale of LOCALES) {
    for (const theme of THEMES) {
      test.describe(`Locale: ${locale} | Theme: ${theme}`, () => {
        test(`login page has zero serious/critical a11y violations`, async ({ page }) => {
          await page.goto(`/${locale}/login`);
          await page.evaluate((th) => {
            document.documentElement.classList.remove("light", "dark");
            document.documentElement.classList.add(th);
          }, theme);
          await page.waitForTimeout(500);

          const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .analyze();

          const criticalOrSerious = results.violations.filter(
            (v) => v.impact === "serious" || v.impact === "critical"
          );

          expect(
            criticalOrSerious,
            `Accessibility violations on /${locale}/login (${theme}):\n` +
              JSON.stringify(criticalOrSerious, null, 2)
          ).toEqual([]);
        });

        test(`dashboard page has zero serious/critical a11y violations`, async ({ page }) => {
          // Login first
          await page.goto(`/${locale}/login`);
          await page.locator('input[type="email"]').fill("admin@masar.local");
          await page.locator('input[type="password"]').fill("Admin@12345");
          await page.locator('button[type="submit"]').click();
          await page.waitForURL(`**/${locale}/dashboard`, { timeout: 15000 });

          await page.evaluate((th) => {
            document.documentElement.classList.remove("light", "dark");
            document.documentElement.classList.add(th);
          }, theme);
          await page.waitForTimeout(500);

          const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .analyze();

          const criticalOrSerious = results.violations.filter(
            (v) => v.impact === "serious" || v.impact === "critical"
          );

          expect(
            criticalOrSerious,
            `Accessibility violations on /${locale}/dashboard (${theme}):\n` +
              JSON.stringify(criticalOrSerious, null, 2)
          ).toEqual([]);
        });

        test(`invoices list and form dialog have zero serious/critical a11y violations`, async ({
          page,
        }) => {
          // Login first
          await page.goto(`/${locale}/login`);
          await page.locator('input[type="email"]').fill("admin@masar.local");
          await page.locator('input[type="password"]').fill("Admin@12345");
          await page.locator('button[type="submit"]').click();
          await page.waitForURL(`**/${locale}/dashboard`, { timeout: 15000 });

          // Navigate to sales invoices
          await page.goto(`/${locale}/sales/invoices`);
          await expect(page).toHaveURL(new RegExp(`/${locale}/sales/invoices`));

          await page.evaluate((th) => {
            document.documentElement.classList.remove("light", "dark");
            document.documentElement.classList.add(th);
          }, theme);
          await page.waitForTimeout(500);

          // 1. Audit invoices list table
          const listResults = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .analyze();

          const listViolations = listResults.violations.filter(
            (v) => v.impact === "serious" || v.impact === "critical"
          );

          expect(
            listViolations,
            `Accessibility violations on /${locale}/sales/invoices list (${theme}):\n` +
              JSON.stringify(listViolations, null, 2)
          ).toEqual([]);

          // 2. Open invoice creation dialog and audit modal dialog
          const createBtn = page.locator('button:has-text("فاتورة"), button:has-text("Invoice")').first();
          if (await createBtn.isVisible()) {
            await createBtn.click();
            await page.waitForSelector('[role="dialog"], [data-slot="dialog-content"]', { timeout: 5000 });

            const dialogResults = await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
              .analyze();

            const dialogViolations = dialogResults.violations.filter(
              (v) => v.impact === "serious" || v.impact === "critical"
            );

            expect(
              dialogViolations,
              `Accessibility violations on invoice form dialog (${locale}, ${theme}):\n` +
                JSON.stringify(dialogViolations, null, 2)
            ).toEqual([]);
          }
        });
      });
    }
  }
});
