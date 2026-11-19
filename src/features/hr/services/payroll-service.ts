import { db } from "@/lib/db";
import { AttendanceStatus, EmployeeStatus, PayrollStatus } from "@prisma/client";
import { getNextDocumentNumber } from "@/lib/sequence";
import { getPostingAccountMappings, postJournalEntry } from "@/features/accounting/services/posting";
import { serializeDecimals } from "@/lib/serialization";

export interface CalculateEmployeePayrollParams {
  baseSalary: number;
  allowances: number;
  absenceDays: number;
  lateDays: number;
  absenceRate?: number;
  lateRate?: number;
}

export interface PayrollCalculationOutput {
  baseSalary: number;
  allowances: number;
  absenceDays: number;
  lateDays: number;
  dailyRate: number;
  absenceDeduction: number;
  lateDeduction: number;
  totalDeductions: number;
  netSalary: number;
}

/**
 * Pure calculation logic for single employee payroll.
 * Standard labor law basis: 30 days per month.
 */
export function calculateEmployeePayroll(params: CalculateEmployeePayrollParams): PayrollCalculationOutput {
  const {
    baseSalary,
    allowances,
    absenceDays,
    lateDays,
    absenceRate = 1.0,
    lateRate = 0.25,
  } = params;

  // Base daily rate: baseSalary / 30
  const dailyRate = Math.round((baseSalary / 30) * 100) / 100;

  // Deductions
  const absenceDeduction = Math.round(absenceDays * dailyRate * absenceRate * 100) / 100;
  const lateDeduction = Math.round(lateDays * dailyRate * lateRate * 100) / 100;
  const totalDeductions = Math.round((absenceDeduction + lateDeduction) * 100) / 100;

  // Net salary cannot be negative
  const rawNet = baseSalary + allowances - totalDeductions;
  const netSalary = Math.max(0, Math.round(rawNet * 100) / 100);

  return {
    baseSalary,
    allowances,
    absenceDays,
    lateDays,
    dailyRate,
    absenceDeduction,
    lateDeduction,
    totalDeductions,
    netSalary,
  };
}

export async function getPayrollRuns(limit = 50) {
  const runs = await db.payrollRun.findMany({
    take: limit,
    include: {
      _count: {
        select: { payslips: true },
      },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  return serializeDecimals(runs);
}

export async function getPayrollRunById(id: string) {
  const run = await db.payrollRun.findUnique({
    where: { id },
    include: {
      payslips: {
        include: {
          employee: {
            include: {
              department: true,
              position: true,
            },
          },
        },
        orderBy: { employee: { code: "asc" } },
      },
    },
  });
  return serializeDecimals(run);
}

export async function getPayslipById(id: string) {
  const payslip = await db.payslip.findUnique({
    where: { id },
    include: {
      payrollRun: true,
      employee: {
        include: {
          department: true,
          position: true,
        },
      },
    },
  });
  return serializeDecimals(payslip);
}

export async function generatePayrollRun(month: number, year: number) {
  // 1. Check existing run
  const existing = await db.payrollRun.findUnique({
    where: {
      month_year: { month, year },
    },
    include: { payslips: true },
  });

  if (existing && existing.status !== PayrollStatus.DRAFT) {
    throw new Error(
      `مسير رواتب شهر ${month}/${year} تم اعتماده مسبقاً ولا يمكن إعادة إنشائه`
    );
  }

  // 2. Fetch company settings for deduction rates
  const settings = await db.companySettings.findFirst({
    select: {
      absenceDeductionRate: true,
      lateDeductionRate: true,
    },
  });

  const absenceRate = settings?.absenceDeductionRate ? Number(settings.absenceDeductionRate) : 1.0;
  const lateRate = settings?.lateDeductionRate ? Number(settings.lateDeductionRate) : 0.25;

  // 3. Fetch active employees (bounded)
  const employees = await db.employee.findMany({
    where: {
      deletedAt: null,
      status: EmployeeStatus.ACTIVE,
    },
    take: 500,
    include: {
      department: true,
      position: true,
    },
    orderBy: { code: "asc" },
  });

  if (employees.length === 0) {
    throw new Error("لا يوجد موظفون نشطون لإدراجهم في مسير الرواتب");
  }

  // 4. Fetch attendance records for this month
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const attendances = await db.attendance.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    take: 5000,
  });

  // Group attendances by employeeId
  const attendanceByEmp: Record<string, { absent: number; late: number }> = {};
  for (const att of attendances) {
    if (!attendanceByEmp[att.employeeId]) {
      attendanceByEmp[att.employeeId] = { absent: 0, late: 0 };
    }
    if (att.status === AttendanceStatus.ABSENT) {
      attendanceByEmp[att.employeeId].absent += 1;
    } else if (att.status === AttendanceStatus.LATE) {
      attendanceByEmp[att.employeeId].late += 1;
    }
  }

  // 5. Calculate payslip items
  let totalBase = 0;
  let totalAllowances = 0;
  let totalDeductions = 0;
  let totalNet = 0;

  const payslipItems = employees.map((emp) => {
    const baseSalary = Number(emp.baseSalary);
    const allowances = Number(emp.allowances);
    const attInfo = attendanceByEmp[emp.id] || { absent: 0, late: 0 };

    const calc = calculateEmployeePayroll({
      baseSalary,
      allowances,
      absenceDays: attInfo.absent,
      lateDays: attInfo.late,
      absenceRate,
      lateRate,
    });

    totalBase += calc.baseSalary;
    totalAllowances += calc.allowances;
    totalDeductions += calc.totalDeductions;
    totalNet += calc.netSalary;

    return {
      employeeId: emp.id,
      baseSalary: calc.baseSalary,
      allowances: calc.allowances,
      deductions: calc.totalDeductions,
      absenceDays: calc.absenceDays,
      lateDays: calc.lateDays,
      netSalary: calc.netSalary,
      isPaid: false,
    };
  });

  return db.$transaction(async (tx) => {
    let runId: string;

    if (existing) {
      // Delete old draft payslips
      await tx.payslip.deleteMany({
        where: { payrollRunId: existing.id },
      });

      const updated = await tx.payrollRun.update({
        where: { id: existing.id },
        data: {
          totalBaseSalary: totalBase,
          totalAllowances: totalAllowances,
          totalDeductions: totalDeductions,
          totalNetSalary: totalNet,
          processedAt: new Date(),
        },
      });
      runId = updated.id;
    } else {
      const runNumber = await getNextDocumentNumber({
        type: "PAYROLL",
        prefix: "PAY",
        tx,
      });

      const created = await tx.payrollRun.create({
        data: {
          runNumber,
          month,
          year,
          status: PayrollStatus.DRAFT,
          totalBaseSalary: totalBase,
          totalAllowances: totalAllowances,
          totalDeductions: totalDeductions,
          totalNetSalary: totalNet,
          processedAt: new Date(),
        },
      });
      runId = created.id;
    }

    // Create payslips
    await tx.payslip.createMany({
      data: payslipItems.map((item) => ({
        ...item,
        payrollRunId: runId,
      })),
    });

    return tx.payrollRun.findUnique({
      where: { id: runId },
      include: {
        payslips: {
          include: {
            employee: {
              include: { department: true, position: true },
            },
          },
        },
      },
    });
  });
}

export async function approvePayrollRun(runId: string, userId: string) {
  return db.$transaction(async (tx) => {
    const run = await tx.payrollRun.findUnique({
      where: { id: runId },
      include: { payslips: true },
    });

    if (!run) {
      throw new Error("مسير الرواتب غير موجود");
    }

    if (run.status !== PayrollStatus.DRAFT) {
      throw new Error("لا يمكن اعتماد مسير رواتب غير مدرج بحالة مسودة");
    }

    if (run.payslips.length === 0) {
      throw new Error("لا يمكن اعتماد مسير رواتب لا يحتوي على مفردات مرتب");
    }

    // Resolve accounts for double-entry posting
    const mappings = await getPostingAccountMappings(tx);
    const salaryExpenseAccountId = mappings.salaryExpenseAccountId;
    const salaryPayableAccountId = mappings.salaryPayableAccountId;

    const netSalaryAmount = Number(run.totalNetSalary);
    if (netSalaryAmount <= 0) {
      throw new Error("إجمالي صافي الرواتب يجب أن يكون أكبر من صفر لترحيل القيد");
    }

    // Post Double-Entry Journal: Dr Salaries Expense, Cr Salaries Payable
    const journal = await postJournalEntry(tx, {
      date: new Date(),
      description: `استحقاق مسير رواتب شهر ${run.month}/${run.year} (${run.runNumber})`,
      sourceType: "PAYROLL_RUN",
      sourceId: run.id,
      postedById: userId,
      lines: [
        {
          accountId: salaryExpenseAccountId,
          debit: netSalaryAmount,
          credit: 0,
          description: `مصروفات رواتب وأجور شهر ${run.month}/${run.year}`,
        },
        {
          accountId: salaryPayableAccountId,
          debit: 0,
          credit: netSalaryAmount,
          description: `مستحقات رواتب وأجور شهر ${run.month}/${run.year}`,
        },
      ],
    });

    return tx.payrollRun.update({
      where: { id: run.id },
      data: {
        status: PayrollStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: userId,
        journalEntryId: journal.id,
      },
      include: {
        payslips: {
          include: {
            employee: {
              include: { department: true, position: true },
            },
          },
        },
      },
    });
  });
}

export async function payPayrollRun(runId: string, paymentAccountId: string, userId: string) {
  return db.$transaction(async (tx) => {
    const run = await tx.payrollRun.findUnique({
      where: { id: runId },
      include: { payslips: true },
    });

    if (!run) {
      throw new Error("مسير الرواتب غير موجود");
    }

    if (run.status !== PayrollStatus.APPROVED) {
      throw new Error("يجب اعتماد مسير الرواتب أولاً قبل صرفه");
    }

    // Validate payment account
    const payAccount = await tx.account.findUnique({
      where: { id: paymentAccountId, deletedAt: null },
    });

    if (!payAccount || !payAccount.isPostable) {
      throw new Error("حساب السداد غير صالح أو غير متاح للترحيل");
    }

    const mappings = await getPostingAccountMappings(tx);
    const salaryPayableAccountId = mappings.salaryPayableAccountId;

    const netSalaryAmount = Number(run.totalNetSalary);

    // Post Double-Entry Journal: Dr Salaries Payable, Cr Cash/Bank
    const journal = await postJournalEntry(tx, {
      date: new Date(),
      description: `صرف مسير رواتب شهر ${run.month}/${run.year} (${run.runNumber})`,
      sourceType: "PAYROLL_PAYMENT",
      sourceId: run.id,
      postedById: userId,
      lines: [
        {
          accountId: salaryPayableAccountId,
          debit: netSalaryAmount,
          credit: 0,
          description: `سداد مستحقات رواتب شهر ${run.month}/${run.year}`,
        },
        {
          accountId: paymentAccountId,
          debit: 0,
          credit: netSalaryAmount,
          description: `صرف رواتب شهر ${run.month}/${run.year} عبر (${payAccount.name})`,
        },
      ],
    });

    // Mark all payslips as paid
    await tx.payslip.updateMany({
      where: { payrollRunId: run.id },
      data: { isPaid: true },
    });

    return tx.payrollRun.update({
      where: { id: run.id },
      data: {
        status: PayrollStatus.PAID,
        paidAt: new Date(),
        paidById: userId,
        paymentJournalEntryId: journal.id,
      },
      include: {
        payslips: {
          include: {
            employee: {
              include: { department: true, position: true },
            },
          },
        },
      },
    });
  });
}
