"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { generatePayrollSchema, payPayrollSchema } from "../schemas";
import { serializeDecimals } from "@/lib/serialization";
import {
  generatePayrollRun,
  approvePayrollRun,
  payPayrollRun,
} from "../services/payroll-service";

export async function generatePayrollRunAction(input: unknown) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("hr.payroll.manage");

    const parsed = generatePayrollSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "بيانات إنشاء مسير الرواتب غير صالحة",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const run = await generatePayrollRun(parsed.data.month, parsed.data.year);

    if (!run) {
      return { ok: false, error: "فشل إنشاء مسير الرواتب" };
    }

    await logAudit({
      action: "PAYROLL_RUN_GENERATE",
      entity: "PayrollRun",
      entityId: run.id,
      after: {
        runNumber: run.runNumber,
        month: run.month,
        year: run.year,
        totalNetSalary: Number(run.totalNetSalary),
      },
    });

    revalidatePath("/hr/payroll");
    return { ok: true, data: serializeDecimals(run) };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل إنشاء مسير الرواتب";
    return { ok: false, error: message };
  }
}

export async function approvePayrollRunAction(runId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("hr.payroll.manage");

    const run = await approvePayrollRun(runId, session.user.id);

    await logAudit({
      action: "PAYROLL_RUN_APPROVE",
      entity: "PayrollRun",
      entityId: run.id,
      after: {
        status: run.status,
        runNumber: run.runNumber,
        journalEntryId: run.journalEntryId,
      },
    });

    revalidatePath("/hr/payroll");
    revalidatePath(`/hr/payroll/${runId}`);
    revalidatePath("/accounting/journal");
    revalidatePath("/accounting/accounts");
    return { ok: true, data: serializeDecimals(run) };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل اعتماد مسير الرواتب وترحيل القيد";
    return { ok: false, error: message };
  }
}

export async function payPayrollRunAction(input: unknown) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("hr.payroll.manage");

    const parsed = payPayrollSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "بيانات صرف الرواتب غير صالحة",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const run = await payPayrollRun(
      parsed.data.runId,
      parsed.data.paymentAccountId,
      session.user.id
    );

    await logAudit({
      action: "PAYROLL_RUN_PAY",
      entity: "PayrollRun",
      entityId: run.id,
      after: {
        status: run.status,
        runNumber: run.runNumber,
        paymentJournalEntryId: run.paymentJournalEntryId,
      },
    });

    revalidatePath("/hr/payroll");
    revalidatePath(`/hr/payroll/${parsed.data.runId}`);
    revalidatePath("/accounting/journal");
    revalidatePath("/accounting/accounts");
    return { ok: true, data: serializeDecimals(run) };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل صرف مسير الرواتب وترحيل القيد";
    return { ok: false, error: message };
  }
}
