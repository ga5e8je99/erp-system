"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { toSafeError } from "@/lib/safe-error";
import {
  unitSchema,
  updateUnitSchema,
  type UnitInput,
  type UpdateUnitInput,
} from "../schemas/inventory";
import { ActionResult } from "./products";

export async function createUnitAction(
  input: UnitInput
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const parsed = unitSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission("inventory.unit.manage");

    const data = parsed.data;

    const existing = await db.unit.findFirst({
      where: { name: data.name.trim() },
    });
    if (existing) {
      return {
        ok: false,
        error: "DUPLICATE_NAME",
        fieldErrors: { name: ["اسم الوحدة مسجل بالفعل / Unit name already exists"] },
      };
    }

    const unit = await db.unit.create({
      data: {
        name: data.name.trim(),
        symbol: data.symbol.trim(),
      },
    });

    await logAudit({
      action: "UNIT_CREATE",
      entity: "Unit",
      entityId: unit.id,
      userId: currentUser.id,
      after: { name: unit.name, symbol: unit.symbol },
    });

    revalidatePath("/inventory/units");
    revalidatePath("/inventory/products");

    return { ok: true, data: { id: unit.id, name: unit.name } };
  } catch (error) {
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}

export async function updateUnitAction(
  input: UpdateUnitInput
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const parsed = updateUnitSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission("inventory.unit.manage");

    const { id, ...data } = parsed.data;

    const existing = await db.unit.findUnique({ where: { id } });
    if (!existing) {
      return { ok: false, error: "UNIT_NOT_FOUND" };
    }

    const updated = await db.unit.update({
      where: { id },
      data: {
        name: data.name.trim(),
        symbol: data.symbol.trim(),
      },
    });

    await logAudit({
      action: "UNIT_UPDATE",
      entity: "Unit",
      entityId: updated.id,
      userId: currentUser.id,
      before: { name: existing.name, symbol: existing.symbol },
      after: { name: updated.name, symbol: updated.symbol },
    });

    revalidatePath("/inventory/units");
    revalidatePath("/inventory/products");

    return { ok: true, data: { id: updated.id, name: updated.name } };
  } catch (error) {
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}

export async function deleteUnitAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user: currentUser } = await requirePermission("inventory.unit.manage");

    const unit = await db.unit.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: { where: { deletedAt: null } } },
        },
      },
    });

    if (!unit) {
      return { ok: false, error: "UNIT_NOT_FOUND" };
    }

    if (unit._count.products > 0) {
      return {
        ok: false,
        error: "UNIT_HAS_PRODUCTS",
      };
    }

    await db.unit.delete({ where: { id } });

    await logAudit({
      action: "UNIT_DELETE",
      entity: "Unit",
      entityId: id,
      userId: currentUser.id,
      before: { name: unit.name, symbol: unit.symbol },
    });

    revalidatePath("/inventory/units");
    revalidatePath("/inventory/products");

    return { ok: true, data: { id } };
  } catch (error) {
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}
