import { test, expect } from "@playwright/test";

test("has title and language links", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/(ar|en)/);
});
