"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { fiscalPeriodSchema } from "../schemas";
import {
  createFiscalPeriod,
  closeFiscalPeriod,
  reopenFiscalPeriod,
} from "../services/accounting-service";

export async function createFiscalPeriodAction(input: unknown) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("accounting.period.manage");

    const parsed = fiscalPeriodSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "بيانات الفترة المالية غير صالحة",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const period = await createFiscalPeriod(parsed.data);

    await logAudit({
      action: "FISCAL_PERIOD_CREATE",
      entity: "FiscalPeriod",
      entityId: period.id,
      after: {
        name: period.name,
        startDate: period.startDate,
        endDate: period.endDate,
      },
    });

    revalidatePath("/accounting/periods");
    return { ok: true, data: period };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل إنشاء الفترة المالية";
    return { ok: false, error: message };
  }
}

export async function closeFiscalPeriodAction(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("accounting.period.manage");

    const period = await closeFiscalPeriod(id);

    await logAudit({
      action: "FISCAL_PERIOD_CLOSE",
      entity: "FiscalPeriod",
      entityId: period.id,
      after: {
        name: period.name,
        isClosed: true,
      },
    });

    revalidatePath("/accounting/periods");
    return { ok: true, data: period };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل إقفال الفترة المالية";
    return { ok: false, error: message };
  }
}

export async function reopenFiscalPeriodAction(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("accounting.period.manage");

    const period = await reopenFiscalPeriod(id);

    await logAudit({
      action: "FISCAL_PERIOD_REOPEN",
      entity: "FiscalPeriod",
      entityId: period.id,
      after: {
        name: period.name,
        isClosed: false,
      },
    });

    revalidatePath("/accounting/periods");
    return { ok: true, data: period };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل إعادة فتح الفترة المالية";
    return { ok: false, error: message };
  }
}
