"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { toSafeError } from "@/lib/safe-error";
import {
  categorySchema,
  updateCategorySchema,
  type CategoryInput,
  type UpdateCategoryInput,
} from "../schemas/inventory";
import { ActionResult } from "./products";

export async function createCategoryAction(
  input: CategoryInput
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const parsed = categorySchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission("inventory.category.manage");

    const data = parsed.data;

    const existing = await db.category.findFirst({
      where: { name: data.name.trim(), deletedAt: null },
    });
    if (existing) {
      return {
        ok: false,
        error: "DUPLICATE_NAME",
        fieldErrors: { name: ["اسم التصنيف مستخدم بالفعل / Category name already exists"] },
      };
    }

    const category = await db.category.create({
      data: {
        name: data.name.trim(),
        description: data.description ? data.description.trim() : null,
        parentId: data.parentId || null,
      },
    });

    await logAudit({
      action: "CATEGORY_CREATE",
      entity: "Category",
      entityId: category.id,
      userId: currentUser.id,
      after: { name: category.name, parentId: category.parentId },
    });

    revalidatePath("/inventory/categories");
    revalidatePath("/inventory/products");

    return { ok: true, data: { id: category.id, name: category.name } };
  } catch (error) {
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}

export async function updateCategoryAction(
  input: UpdateCategoryInput
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const parsed = updateCategorySchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission("inventory.category.manage");

    const { id, ...data } = parsed.data;

    // Prevent parenting to self
    if (data.parentId === id) {
      return {
        ok: false,
        error: "CIRCULAR_PARENT",
        fieldErrors: { parentId: ["لا يمكن اختيار التصنيف نفسه كأب / Cannot select self as parent"] },
      };
    }

    const existing = await db.category.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return { ok: false, error: "CATEGORY_NOT_FOUND" };
    }

    const updated = await db.category.update({
      where: { id },
      data: {
        name: data.name.trim(),
        description: data.description ? data.description.trim() : null,
        parentId: data.parentId || null,
      },
    });

    await logAudit({
      action: "CATEGORY_UPDATE",
      entity: "Category",
      entityId: updated.id,
      userId: currentUser.id,
      before: { name: existing.name, parentId: existing.parentId },
      after: { name: updated.name, parentId: updated.parentId },
    });

    revalidatePath("/inventory/categories");
    revalidatePath("/inventory/products");

    return { ok: true, data: { id: updated.id, name: updated.name } };
  } catch (error) {
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}

export async function deleteCategoryAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user: currentUser } = await requirePermission("inventory.category.manage");

    const category = await db.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: { where: { deletedAt: null } },
            children: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!category || category.deletedAt) {
      return { ok: false, error: "CATEGORY_NOT_FOUND" };
    }

    if (category._count.products > 0) {
      return {
        ok: false,
        error: "CATEGORY_HAS_PRODUCTS",
      };
    }

    if (category._count.children > 0) {
      return {
        ok: false,
        error: "CATEGORY_HAS_CHILDREN",
      };
    }

    await db.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await logAudit({
      action: "CATEGORY_DELETE",
      entity: "Category",
      entityId: id,
      userId: currentUser.id,
      before: { name: category.name },
    });

    revalidatePath("/inventory/categories");
    revalidatePath("/inventory/products");

    return { ok: true, data: { id } };
  } catch (error) {
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}
