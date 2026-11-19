"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import {
  updateRolePermissionsSchema,
  type UpdateRolePermissionsInput,
} from "@/features/auth/schemas/auth";
import type { ActionResult } from "./users";

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
    if (error instanceof Error && error.name === "ForbiddenError") {
      return { ok: false, error: "FORBIDDEN" };
    }
    console.error("[UPDATE ROLE PERMISSIONS ACTION ERROR]", error);
    return { ok: false, error: "INTERNAL_SERVER_ERROR" };
  }
}
