"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { expenseSchema } from "../schemas";
import { serializeDecimals } from "@/lib/serialization";
import {
  recordExpense,
  deleteExpense,
} from "../services/accounting-service";

export async function recordExpenseAction(input: unknown) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("accounting.expense.manage");

    const parsed = expenseSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "بيانات المصروف غير صالحة",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const expense = await recordExpense(parsed.data, session.user.id);

    await logAudit({
      action: "EXPENSE_CREATE",
      entity: "Expense",
      entityId: expense.id,
      after: {
        expenseNumber: expense.expenseNumber,
        category: expense.category,
        amount: Number(expense.amount),
      },
    });

    revalidatePath("/accounting/expenses");
    revalidatePath("/accounting/journal");
    revalidatePath("/accounting/accounts");
    return { ok: true, data: serializeDecimals(expense) };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل تسجيل المصروف";
    return { ok: false, error: message };
  }
}

export async function deleteExpenseAction(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("accounting.expense.manage");

    const deleted = await deleteExpense(id, session.user.id);

    await logAudit({
      action: "EXPENSE_DELETE",
      entity: "Expense",
      entityId: deleted.id,
      before: {
        expenseNumber: deleted.expenseNumber,
        category: deleted.category,
      },
    });

    revalidatePath("/accounting/expenses");
    revalidatePath("/accounting/journal");
    revalidatePath("/accounting/accounts");
    return { ok: true, data: serializeDecimals(deleted) };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل حذف وإلغاء المصروف";
    return { ok: false, error: message };
  }
}
