"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import {
  warehouseSchema,
  updateWarehouseSchema,
  type WarehouseInput,
  type UpdateWarehouseInput,
} from "../schemas/inventory";
import { ActionResult } from "./products";

export async function createWarehouseAction(
  input: WarehouseInput
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const parsed = warehouseSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission("inventory.warehouse.manage");

    const data = parsed.data;

    const existingCode = await db.warehouse.findUnique({
      where: { code: data.code },
    });
    if (existingCode) {
      return {
        ok: false,
        error: "DUPLICATE_CODE",
        fieldErrors: { code: ["كود المستودع مستخدم بالفعل / Warehouse code already exists"] },
      };
    }

    // If marked default, unset other defaults
    if (data.isDefault) {
      await db.warehouse.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const warehouse = await db.warehouse.create({
      data: {
        name: data.name.trim(),
        code: data.code,
        address: data.address ? data.address.trim() : null,
        isDefault: data.isDefault,
      },
    });

    await logAudit({
      action: "WAREHOUSE_CREATE",
      entity: "Warehouse",
      entityId: warehouse.id,
      userId: currentUser.id,
      after: { name: warehouse.name, code: warehouse.code, isDefault: warehouse.isDefault },
    });

    revalidatePath("/inventory/warehouses");
    revalidatePath("/inventory/stock");

    return { ok: true, data: { id: warehouse.id, name: warehouse.name } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "INTERNAL_ERROR",
    };
  }
}

export async function updateWarehouseAction(
  input: UpdateWarehouseInput
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const parsed = updateWarehouseSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission("inventory.warehouse.manage");

    const { id, ...data } = parsed.data;

    const existing = await db.warehouse.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return { ok: false, error: "WAREHOUSE_NOT_FOUND" };
    }

    if (data.code !== existing.code) {
      const duplicate = await db.warehouse.findFirst({
        where: { code: data.code, id: { not: id } },
      });
      if (duplicate) {
        return {
          ok: false,
          error: "DUPLICATE_CODE",
          fieldErrors: { code: ["كود المستودع مستخدم بالفعل / Warehouse code already exists"] },
        };
      }
    }

    if (data.isDefault && !existing.isDefault) {
      await db.warehouse.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await db.warehouse.update({
      where: { id },
      data: {
        name: data.name.trim(),
        code: data.code,
        address: data.address ? data.address.trim() : null,
        isDefault: data.isDefault,
      },
    });

    await logAudit({
      action: "WAREHOUSE_UPDATE",
      entity: "Warehouse",
      entityId: updated.id,
      userId: currentUser.id,
      before: { name: existing.name, code: existing.code },
      after: { name: updated.name, code: updated.code },
    });

    revalidatePath("/inventory/warehouses");
    revalidatePath("/inventory/stock");

    return { ok: true, data: { id: updated.id, name: updated.name } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "INTERNAL_ERROR",
    };
  }
}

export async function deleteWarehouseAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user: currentUser } = await requirePermission("inventory.warehouse.manage");

    const warehouse = await db.warehouse.findUnique({
      where: { id },
      include: {
        _count: {
          select: { movements: true },
        },
        stockLevels: {
          where: { quantity: { gt: 0 } },
        },
      },
    });

    if (!warehouse || warehouse.deletedAt) {
      return { ok: false, error: "WAREHOUSE_NOT_FOUND" };
    }

    if (warehouse.isDefault) {
      return {
        ok: false,
        error: "CANNOT_DELETE_DEFAULT_WAREHOUSE",
      };
    }

    if (warehouse._count.movements > 0 || warehouse.stockLevels.length > 0) {
      return {
        ok: false,
        error: "WAREHOUSE_HAS_STOCK_OR_MOVEMENTS",
      };
    }

    await db.warehouse.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await logAudit({
      action: "WAREHOUSE_DELETE",
      entity: "Warehouse",
      entityId: id,
      userId: currentUser.id,
      before: { name: warehouse.name, code: warehouse.code },
    });

    revalidatePath("/inventory/warehouses");
    revalidatePath("/inventory/stock");

    return { ok: true, data: { id } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "INTERNAL_ERROR",
    };
  }
}
