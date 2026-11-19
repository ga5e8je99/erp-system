"use server";

import bcryptjs from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type ResetPasswordInput,
} from "@/features/auth/schemas/auth";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createUserAction(
  input: CreateUserInput
): Promise<ActionResult<{ id: string; name: string; email: string }>> {
  try {
    // 1. Zod Validation
    const parsed = createUserSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return { ok: false, error: "VALIDATION_ERROR", fieldErrors };
    }

    // 2. Auth & 3. RBAC Check
    const { user: currentUser } = await requirePermission("auth.user.manage");

    const { name, email, password, roleId, locale } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check duplicate
    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return {
        ok: false,
        error: "DUPLICATE_EMAIL",
        fieldErrors: { email: ["البريد الإلكتروني مسجل بالفعل لمستخدم آخر"] },
      };
    }

    // Hash password
    const passwordHash = bcryptjs.hashSync(password, 10);

    const newUser = await db.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        roleId,
        locale,
        isActive: true,
      },
    });

    // 4. Audit Log
    await logAudit({
      action: "USER_CREATE",
      entity: "User",
      entityId: newUser.id,
      userId: currentUser.id,
      after: { name, email: normalizedEmail, roleId, locale },
    });

    revalidatePath("/[locale]/users", "page");
    return {
      ok: true,
      data: { id: newUser.id, name: newUser.name, email: newUser.email },
    };
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return { ok: false, error: "FORBIDDEN" };
    }
    console.error("[CREATE USER ACTION ERROR]", error);
    return { ok: false, error: "INTERNAL_SERVER_ERROR" };
  }
}

export async function updateUserAction(
  input: UpdateUserInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. Zod Validation
    const parsed = updateUserSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    // 2. Auth & 3. RBAC Check
    const { user: currentUser } = await requirePermission("auth.user.manage");

    const { id, name, email, roleId, locale, isActive } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return { ok: false, error: "NOT_FOUND" };
    }

    // Check duplicate email if changed
    if (existing.email !== normalizedEmail) {
      const emailTaken = await db.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (emailTaken) {
        return {
          ok: false,
          error: "DUPLICATE_EMAIL",
          fieldErrors: { email: ["البريد الإلكتروني مستخدم بالفعل"] },
        };
      }
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: {
        name,
        email: normalizedEmail,
        roleId,
        locale,
        isActive,
      },
    });

    // 4. Audit Log
    await logAudit({
      action: "USER_UPDATE",
      entity: "User",
      entityId: id,
      userId: currentUser.id,
      before: {
        name: existing.name,
        email: existing.email,
        roleId: existing.roleId,
        locale: existing.locale,
        isActive: existing.isActive,
      },
      after: { name, email: normalizedEmail, roleId, locale, isActive },
    });

    revalidatePath("/[locale]/users", "page");
    return { ok: true, data: { id: updatedUser.id } };
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return { ok: false, error: "FORBIDDEN" };
    }
    console.error("[UPDATE USER ACTION ERROR]", error);
    return { ok: false, error: "INTERNAL_SERVER_ERROR" };
  }
}

export async function toggleUserStatusAction(
  userId: string,
  isActive: boolean
): Promise<ActionResult<{ id: string; isActive: boolean }>> {
  try {
    const { user: currentUser } = await requirePermission("auth.user.manage");

    if (currentUser.id === userId && !isActive) {
      return {
        ok: false,
        error: "CANNOT_DEACTIVATE_SELF",
      };
    }

    const existing = await db.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return { ok: false, error: "NOT_FOUND" };
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: { isActive },
    });

    await logAudit({
      action: isActive ? "USER_ACTIVATE" : "USER_DEACTIVATE",
      entity: "User",
      entityId: userId,
      userId: currentUser.id,
      before: { isActive: existing.isActive },
      after: { isActive },
    });

    revalidatePath("/[locale]/users", "page");
    return { ok: true, data: { id: updated.id, isActive: updated.isActive } };
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return { ok: false, error: "FORBIDDEN" };
    }
    console.error("[TOGGLE USER STATUS ACTION ERROR]", error);
    return { ok: false, error: "INTERNAL_SERVER_ERROR" };
  }
}

export async function resetPasswordAction(
  input: ResetPasswordInput
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const parsed = resetPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission("auth.user.manage");

    const existing = await db.user.findUnique({ where: { id: parsed.data.userId } });
    if (!existing) {
      return { ok: false, error: "NOT_FOUND" };
    }

    const passwordHash = bcryptjs.hashSync(parsed.data.newPassword, 10);

    await db.user.update({
      where: { id: parsed.data.userId },
      data: { passwordHash },
    });

    await logAudit({
      action: "USER_PASSWORD_RESET",
      entity: "User",
      entityId: parsed.data.userId,
      userId: currentUser.id,
    });

    return { ok: true, data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return { ok: false, error: "FORBIDDEN" };
    }
    console.error("[RESET PASSWORD ACTION ERROR]", error);
    return { ok: false, error: "INTERNAL_SERVER_ERROR" };
  }
}
