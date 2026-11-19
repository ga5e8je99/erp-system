"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { accountMappingSchema } from "../schemas";
import { updateCompanyAccountMappings } from "../services/accounting-service";

export async function updateAccountMappingsAction(input: unknown) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("accounting.account.manage");

    const parsed = accountMappingSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "بيانات ربط الحسابات غير صالحة" };
    }

    const updated = await updateCompanyAccountMappings(parsed.data);

    await logAudit({
      action: "ACCOUNT_MAPPINGS_UPDATE",
      entity: "CompanySettings",
      entityId: updated.id,
      after: {
        arAccountId: updated.arAccountId,
        apAccountId: updated.apAccountId,
        salesAccountId: updated.salesAccountId,
        cogsAccountId: updated.cogsAccountId,
        inventoryAccountId: updated.inventoryAccountId,
        taxAccountId: updated.taxAccountId,
      },
    });

    revalidatePath("/accounting/settings");
    return { ok: true, data: updated };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل تحديث ربط الحسابات";
    return { ok: false, error: message };
  }
}
