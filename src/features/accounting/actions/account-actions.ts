"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { accountSchema } from "../schemas";
import {
  createAccount,
  updateAccount,
  deleteAccount,
} from "../services/accounting-service";

export async function createAccountAction(input: unknown) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("accounting.account.manage");

    const parsed = accountSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "بيانات الحساب غير صالحة",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const account = await createAccount(parsed.data);

    await logAudit({
      action: "ACCOUNT_CREATE",
      entity: "Account",
      entityId: account.id,
      after: {
        code: account.code,
        name: account.name,
        type: account.type,
      },
    });

    revalidatePath("/accounting/accounts");
    return { ok: true, data: account };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل إنشاء الحساب";
    return { ok: false, error: message };
  }
}

export async function updateAccountAction(id: string, input: unknown) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("accounting.account.manage");

    const parsed = accountSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "بيانات الحساب غير صالحة",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const updated = await updateAccount(id, parsed.data);

    await logAudit({
      action: "ACCOUNT_UPDATE",
      entity: "Account",
      entityId: updated.id,
      after: {
        code: updated.code,
        name: updated.name,
        type: updated.type,
      },
    });

    revalidatePath("/accounting/accounts");
    return { ok: true, data: updated };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل تعديل الحساب";
    return { ok: false, error: message };
  }
}

export async function deleteAccountAction(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("accounting.account.manage");

    const deleted = await deleteAccount(id);

    await logAudit({
      action: "ACCOUNT_DELETE",
      entity: "Account",
      entityId: deleted.id,
      before: {
        code: deleted.code,
        name: deleted.name,
      },
    });

    revalidatePath("/accounting/accounts");
    return { ok: true, data: deleted };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل حذف الحساب";
    return { ok: false, error: message };
  }
}
