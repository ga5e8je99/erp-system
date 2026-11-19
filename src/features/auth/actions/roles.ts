"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission, isReservedRoleName } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { toSafeError } from "@/lib/safe-error";
import {
  updateRolePermissionsSchema,
  createRoleSchema,
  updateRoleSchema,
  type UpdateRolePermissionsInput,
  type CreateRoleInput,
  type UpdateRoleInput,
} from "@/features/auth/schemas/auth";
import type { ActionResult } from "./users";

export async function createRoleAction(
  input: CreateRoleInput
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const parsed = createRoleSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission("auth.role.manage");
    const { name, description, permissionIds } = parsed.data;

    if (isReservedRoleName(name)) {
      return { ok: false, error: "RESERVED_ROLE_NAME" };
    }

    const role = await db.$transaction(async (tx) => {
      const newRole = await tx.role.create({
        data: {
          name,
          description: description || null,
        },
      });

      if (permissionIds && permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: newRole.id,
            permissionId,
          })),
        });
      }

      return newRole;
    });

    await logAudit({
      action: "ROLE_CREATE",
      entity: "Role",
      entityId: role.id,
      userId: currentUser.id,
      after: { name, description, permissionCount: permissionIds?.length || 0 },
    });

    revalidatePath("/[locale]/roles", "page");
    return { ok: true, data: { id: role.id, name: role.name } };
  } catch (error) {
    return { ok: false, error: toSafeError(error, "ROLE_CREATE_FAILED") };
  }
}

export async function updateRoleAction(
  input: UpdateRoleInput
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const parsed = updateRoleSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission("auth.role.manage");
    const { id, name, description } = parsed.data;

    if (isReservedRoleName(name)) {
      return { ok: false, error: "RESERVED_ROLE_NAME" };
    }

    const existing = await db.role.findUnique({
      where: { id },
    });

    if (!existing) {
      return { ok: false, error: "ROLE_NOT_FOUND" };
    }

    // Do not allow renaming a system role to a reserved name or if existing is a reserved role
    if (isReservedRoleName(existing.name)) {
      return { ok: false, error: "RESERVED_ROLE_NAME" };
    }

    const updated = await db.role.update({
      where: { id },
      data: {
        name,
        description: description ?? existing.description,
      },
    });

    await logAudit({
      action: "ROLE_UPDATE",
      entity: "Role",
      entityId: id,
      userId: currentUser.id,
      before: { name: existing.name, description: existing.description },
      after: { name: updated.name, description: updated.description },
    });

    revalidatePath("/[locale]/roles", "page");
    return { ok: true, data: { id: updated.id, name: updated.name } };
  } catch (error) {
    return { ok: false, error: toSafeError(error, "ROLE_UPDATE_FAILED") };
  }
}

export async function updateRolePermissionsAction(
  input: UpdateRolePermissionsInput
): Promise<ActionResult<{ roleId: string }>> {
  try {
    // 1. Zod Validation
    const parsed = updateRolePermissionsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    // 2. Auth & 3. RBAC Check
    const { user: currentUser } = await requirePermission("auth.role.manage");

    const { roleId, permissionIds } = parsed.data;

    const role = await db.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: true,
      },
    });

    if (!role) {
      return { ok: false, error: "ROLE_NOT_FOUND" };
    }

    const previousPermissions = role.permissions.map((p) => p.permissionId);

    // Atomic transaction: replace permissions
    await db.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { roleId },
      });

      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId,
            permissionId,
          })),
        });
      }
    });

    // 4. Audit Log
    await logAudit({
      action: "ROLE_PERMISSIONS_UPDATE",
      entity: "Role",
      entityId: roleId,
      userId: currentUser.id,
      before: { permissions: previousPermissions },
      after: { permissions: permissionIds },
    });

    revalidatePath("/[locale]/roles", "page");
    return { ok: true, data: { roleId } };
  } catch (error) {
    return { ok: false, error: toSafeError(error, "INTERNAL_SERVER_ERROR") };
  }
}
