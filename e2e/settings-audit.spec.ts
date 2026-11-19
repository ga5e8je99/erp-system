import { test, expect } from "@playwright/test";

test.describe("Settings Management & System Audit Log Workflow", () => {
  test("verifies enterprise settings tabs, audit log diffs, upload API, and keyboard shortcuts", async ({
    page,
  }) => {
    // 1. Authenticate as Administrator
    await page.goto("/ar/login");
    await page.locator('input[type="email"]').fill("admin@masar.local");
    await page.locator('input[type="password"]').fill("Admin@12345");
    await page.locator('button[type="submit"]').click();

    // Wait for dashboard load
    await page.waitForURL("**/ar/dashboard", { timeout: 20000 });
    console.log("Step 1: Admin successfully authenticated");

    // 2. Test File Upload Endpoint (/api/uploads)
    // 2.1 Valid image upload (1x1 PNG)
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    const uploadResponse = await page.request.post("/api/uploads", {
      multipart: {
        file: {
          name: "test-logo.png",
          mimeType: "image/png",
          buffer: pngBuffer,
        },
      },
    });

    const uploadStatus = uploadResponse.status();
    const uploadText = await uploadResponse.text();
    console.log("Upload response status:", uploadStatus, "body:", uploadText);
    expect(uploadResponse.ok()).toBeTruthy();
    const uploadJson = await uploadResponse.json();
    expect(uploadJson.ok).toBe(true);
    expect(uploadJson.url).toMatch(/^\/uploads\//);
    console.log("Step 2.1: Valid logo upload succeeded:", uploadJson.url);

    // 2.2 Invalid file type rejection
    const invalidUploadResponse = await page.request.post("/api/uploads", {
      multipart: {
        file: {
          name: "malicious.sh",
          mimeType: "text/x-shellscript",
          buffer: Buffer.from("echo hacked"),
        },
      },
    });
    expect(invalidUploadResponse.status()).toBe(400);
    const invalidJson = await invalidUploadResponse.json();
    expect(invalidJson.ok).toBe(false);
    console.log("Step 2.2: Invalid upload blocked as expected");

    // 3. Test General Settings Area (/ar/settings)
    await page.goto("/ar/settings");
    await expect(page.locator("h1")).toContainText("إعدادات النظام العامة");

    // Verify all 9 tabs are present
    const tabsList = page.getByRole("tablist").first();
    await expect(tabsList).toBeVisible();
    await expect(page.getByRole("tab", { name: /بيانات الشركة/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /العملة والأرقام/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /الضرائب/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /ترقيم المستندات/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /شجرة الحسابات/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /قواعد المخزون/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /قواعد المبيعات/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /قواعد الرواتب/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /النسخ الاحتياطي/ })).toBeVisible();
    console.log("Step 3: All 9 settings tabs rendered");

    // Switch to Currency & Formats tab
    await page.getByRole("tab", { name: /العملة والأرقام/ }).click();
    await expect(page.getByText(/معاينة تنسيق المبالغ المالية/)).toBeVisible();

    // Switch to Tax Rates tab
    await page.getByRole("tab", { name: /الضرائب/ }).click();
    await expect(page.getByText("نسبة ضريبة القيمة المضافة الافتراضية")).toBeVisible();

    // Switch to Document Numbering tab
    await page.getByRole("tab", { name: /ترقيم المستندات/ }).click();
    await expect(page.getByText("بادئة فواتير المبيعات")).toBeVisible();

    // Switch to Inventory Rules tab
    await page.getByRole("tab", { name: /قواعد المخزون/ }).click();
    await expect(page.getByText("السماح بالرصيد السالب للمخزون")).toBeVisible();

    // Switch to Sales Rules tab
    await page.getByRole("tab", { name: /قواعد المبيعات/ }).click();
    await expect(page.getByText("تفعيل الرقابة على الحدود الائتمانية")).toBeVisible();

    // Switch to Payroll Rules tab
    await page.getByRole("tab", { name: /قواعد الرواتب/ }).click();
    await expect(page.getByText("معامل خصم يوم الغياب غير المبرر")).toBeVisible();

    // Switch to Backup Guide tab
    await page.getByRole("tab", { name: /النسخ الاحتياطي/ }).click();
    await expect(page.getByText("استراتيجية النسخ الاحتياطي")).toBeVisible();
    await expect(page.locator("pre").first()).toContainText("pg_dump");
    console.log("Step 4: All settings tabs interactively navigated");

    // 4. Test updating company profile
    await page.getByRole("tab", { name: /بيانات الشركة/ }).click();
    const phoneInput = page.locator('input[name="phone"]');
    if (await phoneInput.isVisible()) {
      await phoneInput.fill("+20 100 999 8888");
      // The save button should become enabled due to isDirty
      const saveBtn = page.getByRole("button", { name: /حفظ التعديلات/ });
      await expect(saveBtn).toBeEnabled();
      await saveBtn.click();
      // Wait for success toast
      await expect(page.getByText("تم حفظ إعدادات النظام بنجاح")).toBeVisible({ timeout: 10000 });
      console.log("Step 5: Settings updated and persisted");
    }

    // 5. Test Audit Log Viewer (/ar/audit-logs)
    await page.goto("/ar/audit-logs");
    await expect(page.locator("h1")).toContainText("سجل العمليات والرقابة");

    // Verify Audit table
    const table = page.locator("table").first();
    await expect(table).toBeVisible();

    // Test Keyboard Shortcut: "/" to focus search input
    await page.locator("body").click();
    await page.keyboard.press("/");
    const searchInput = page.locator('input[placeholder*="بحث"]');
    await expect(searchInput).toBeFocused();
    console.log("Step 6: Keyboard shortcut / correctly focused search input");

    // Verify Diff modal trigger
    const diffButtons = page.getByRole("button", { name: /الفروقات/ });
    const diffCount = await diffButtons.count();
    if (diffCount > 0) {
      await diffButtons.first().click();
      // Dialog should open
      const dialog = page.locator('[data-slot="dialog-content"]');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText("مقارنة التغييرات (Diff)")).toBeVisible();

      // Test tabs inside diff modal
      await dialog.getByRole("tab", { name: /Before/ }).click();
      await expect(dialog.locator("pre").first()).toBeVisible();

      await dialog.getByRole("tab", { name: /After/ }).click();
      await expect(dialog.locator("pre").first()).toBeVisible();

      // Close modal using close button
      const closeBtn = dialog.locator('[data-slot="dialog-close"]');
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      } else {
        await page.keyboard.press("Escape");
      }
      await expect(dialog).toBeHidden({ timeout: 5000 });
      console.log("Step 7: Audit diff modal opened and tabs inspected");
    }

    // 6. Test English Settings Page (/en/settings)
    await page.goto("/en/settings");
    await expect(page.locator("h1")).toContainText("System Settings");
    await expect(page.getByRole("tab", { name: /Company Profile/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Backup Guide/ })).toBeVisible();
    console.log("Step 8: English locale settings verified");
  });
});
