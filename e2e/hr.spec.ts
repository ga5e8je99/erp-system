import { test, expect } from "@playwright/test";

test.describe("HR Module E2E", () => {
  test.setTimeout(90000);

  test.beforeAll(async () => {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    try {
      await prisma.payslip.deleteMany();
      await prisma.payrollRun.deleteMany();
    } finally {
      await prisma.$disconnect();
    }
  });

  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => console.log("BROWSER:", msg.text()));
    page.on("pageerror", (err) => console.log("BROWSER ERROR:", err));

    // 1. Log in as admin
    await page.goto("/ar/login");
    await page.locator('input[type="email"]').fill("admin@masar.local");
    await page.locator('input[type="password"]').fill("Admin@12345");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/ar/dashboard", { timeout: 20000 });
  });

  test("runs end-to-end HR workflow: structure -> employees -> attendance -> leave -> payroll", async ({ page }) => {
    // 1. Visit Departments & Positions
    console.log("Step 1: Departments");
    await page.goto("/ar/hr/departments");
    await expect(page).toHaveURL(/\/ar\/hr\/departments/);
    await expect(page.locator("body")).toContainText("الهيكل الإداري والأقسام");
    await expect(page.locator("body")).toContainText("الأقسام الإدارية");
    await expect(page.locator("body")).toContainText("المسميات الوظيفية");

    // 2. Visit Employees Directory
    console.log("Step 2: Employees");
    await page.goto("/ar/hr/employees");
    await expect(page).toHaveURL(/\/ar\/hr\/employees/);
    await expect(page.locator("body")).toContainText("دليل الموظفين");
    await expect(page.locator("body")).toContainText("محمود حسن الشريف");
    await expect(page.locator("body")).toContainText("EMP-001");

    // 3. View Employee Profile & Tabs
    console.log("Step 3: Employee Profile");
    const empLink = page.getByRole("link", { name: "محمود حسن الشريف" });
    await expect(empLink).toBeVisible();
    await empLink.click();
    await page.waitForURL(/\/ar\/hr\/employees\/.+/, { timeout: 15000 });
    await expect(page.locator("body")).toContainText("البيانات الشخصية والاتصال");
    await expect(page.locator("body")).toContainText("البيانات المالية والتعويضات");
    await expect(page.locator("body")).toContainText("الراتب الأساسي الشهري");

    // Click Leave Tab in profile
    await page.locator('button[role="tab"]:has-text("رصيد الإجازات")').click({ force: true });
    await expect(page.locator("body")).toContainText("إجازة اعتيادية سنوية");

    // Click Attendance Tab in profile
    await page.locator('button[role="tab"]:has-text("الحضور والانصراف")').click({ force: true });
    await expect(page.locator("body")).toContainText("إجمالي الأيام المسجلة");

    // 4. Visit Attendance Daily Sheet
    console.log("Step 4: Attendance");
    await page.goto("/ar/hr/attendance");
    await expect(page).toHaveURL(/\/ar\/hr\/attendance/);
    await expect(page.locator("body")).toContainText("حضور وانصراف الموظفين");
    await expect(page.locator("body")).toContainText("تاريخ الكشف");

    // Save attendance sheet
    const saveBtn = page.getByRole("button", { name: "حفظ الكشف" });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click({ force: true });
    await expect(page.locator("body")).toContainText("تم حفظ كشف الحضور والانصراف بنجاح", { timeout: 15000 });

    // 5. Visit Leave Management
    console.log("Step 5: Leave");
    await page.goto("/ar/hr/leave");
    await expect(page).toHaveURL(/\/ar\/hr\/leave/);
    await expect(page.locator("body")).toContainText("إدارة الإجازات واللوائح");
    await expect(page.locator("body")).toContainText("طلبات الإجازات");
    await expect(page.locator("body")).toContainText("أنواع الإجازات واللوائح");

    // 6. Visit Monthly Payroll Runs
    console.log("Step 6: Payroll");
    await page.goto("/ar/hr/payroll");
    await expect(page).toHaveURL(/\/ar\/hr\/payroll/);
    await expect(page.locator("body")).toContainText("مسيرات الرواتب الشهرية");

    // Open Generate Payroll dialog
    const generateBtn = page.locator('button:has-text("توليد مسير رواتب جديد")');
    await expect(generateBtn).toBeVisible();
    await generateBtn.click({ force: true });

    // In modal, click "توليد المسير"
    const submitGenerateBtn = page.locator('button[type="submit"]:has-text("توليد المسير")');
    await expect(submitGenerateBtn).toBeVisible();
    await submitGenerateBtn.click({ force: true });

    // Should redirect to payroll detail page
    await page.waitForURL(/\/ar\/hr\/payroll\/.+/, { timeout: 20000 });
    await expect(page.locator("body")).toContainText("مسير رواتب شهر");
    await expect(page.locator("body")).toContainText("إجمالي الراتب الأساسي");
    await expect(page.locator("body")).toContainText("إجمالي صافي الرواتب المستحقة");
    await expect(page.locator("body")).toContainText("مفردات رواتب الموظفين");

    // 7. Approve Payroll Run (if in draft)
    console.log("Step 7: Approve Payroll");
    const approveBtn = page.locator('button:has-text("اعتماد المسير وترحيل القيد")');
    if (await approveBtn.isVisible()) {
      await approveBtn.click({ force: true });
      const confirmApproveBtn = page.locator('button:has-text("نعم، اعتمد المسير ورحّل القيد")');
      await expect(confirmApproveBtn).toBeVisible();
      await confirmApproveBtn.click({ force: true });
      await expect(page.locator("body")).toContainText("تم اعتماد مسير الرواتب وترحيل قيد الاستحقاق المحاسبي بنجاح");
    }

    // 8. Test Printable Payslip
    console.log("Step 8: Payslip Print");
    const printPayslipBtn = page.locator('a:has-text("طباعة")').first();
    await expect(printPayslipBtn).toBeVisible();
    const printHref = await printPayslipBtn.getAttribute("href");
    if (printHref) {
      await page.goto(printHref);
    } else {
      await printPayslipBtn.click({ force: true });
    }
    await expect(page).toHaveURL(/\/ar\/hr\/payroll\/.+\/payslips\/.+\/print/);
    await expect(page.locator("body")).toContainText("كشف مفردات مرتب (Payslip)");
    await expect(page.locator("body")).toContainText("الاستحقاقات (Earnings)");
    await expect(page.locator("body")).toContainText("الاستقطاعات والجزاءات (Deductions)");
    await expect(page.locator("body")).toContainText("صافي الراتب المستحق للصرف");
    console.log("All HR E2E steps passed!");
    console.log("All HR E2E steps passed!");
  });
});
