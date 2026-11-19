"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { fullCompanySettingsSchema } from "../schemas";
import { getCompanySettings, updateCompanySettings } from "../services/settings-service";

export async function saveCompanySettingsAction(input: unknown) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("company.settings.manage");

    const parsed = fullCompanySettingsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "بيانات الإعدادات غير صالحة",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const current = await getCompanySettings();
    const updated = await updateCompanySettings(parsed.data);

    await logAudit({
      action: "SETTINGS_UPDATE",
      entity: "CompanySettings",
      entityId: updated.id,
      before: {
        name: current.name,
        currency: current.currency,
        defaultTaxRate: Number(current.defaultTaxRate),
      },
      after: {
        name: updated.name,
        currency: updated.currency,
        defaultTaxRate: Number(updated.defaultTaxRate),
      },
    });

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { ok: true, data: updated };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل حفظ إعدادات النظام";
    return { ok: false, error: message };
  }
}
