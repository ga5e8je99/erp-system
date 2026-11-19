"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { Prisma, StockMovementType } from "@prisma/client";
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
  type ProductCsvRow,
} from "../schemas/inventory";
import {
  generateProductSku,
  recordStockMovement,
} from "../services/stock-movement";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createProductAction(
  input: CreateProductInput
): Promise<ActionResult<{ id: string; name: string; sku: string }>> {
  try {
    // 1. Zod validation
    const parsed = createProductSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    // 2 & 3. Auth & RBAC
    const { user: currentUser } = await requirePermission("inventory.product.create");

    const data = parsed.data;

    // Generate SKU if omitted or empty
    let sku = data.sku;
    if (!sku || sku.trim() === "") {
      sku = await generateProductSku(db);
    } else {
      sku = sku.trim();
      const existingSku = await db.product.findUnique({
        where: { sku },
      });
      if (existingSku) {
        return {
          ok: false,
          error: "DUPLICATE_SKU",
          fieldErrors: { sku: ["رمز الصنف (SKU) مستخدم بالفعل / SKU already exists"] },
        };
      }
    }

    // Check barcode duplicate if provided
    if (data.barcode && data.barcode.trim() !== "") {
      const existingBarcode = await db.product.findUnique({
        where: { barcode: data.barcode.trim() },
      });
      if (existingBarcode) {
        return {
          ok: false,
          error: "DUPLICATE_BARCODE",
          fieldErrors: { barcode: ["الباركود مستخدم بالفعل / Barcode already exists"] },
        };
      }
    }

    // Check unit exists
    const unit = await db.unit.findUnique({ where: { id: data.unitId } });
    if (!unit) {
      return {
        ok: false,
        error: "UNIT_NOT_FOUND",
        fieldErrors: { unitId: ["وحدة القياس المحددة غير موجودة / Unit not found"] },
      };
    }

    const newProduct = await db.product.create({
      data: {
        name: data.name.trim(),
        sku,
        barcode: data.barcode ? data.barcode.trim() : null,
        description: data.description ? data.description.trim() : null,
        categoryId: data.categoryId || null,
        unitId: data.unitId,
        costPrice: new Prisma.Decimal(data.costPrice),
        salePrice: new Prisma.Decimal(data.salePrice),
        taxRate: new Prisma.Decimal(data.taxRate),
        reorderLevel: data.reorderLevel,
        isActive: data.isActive,
        trackStock: data.trackStock,
      },
    });

    // 4. Audit log
    await logAudit({
      action: "PRODUCT_CREATE",
      entity: "Product",
      entityId: newProduct.id,
      userId: currentUser.id,
      after: {
        name: newProduct.name,
        sku: newProduct.sku,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
      },
    });

    revalidatePath("/inventory/products");
    revalidatePath("/inventory/stock");

    return {
      ok: true,
      data: { id: newProduct.id, name: newProduct.name, sku: newProduct.sku },
    };
  } catch (error) {
    console.error("createProductAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "INTERNAL_ERROR",
    };
  }
}

export async function updateProductAction(
  input: UpdateProductInput
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    // 1. Zod validation
    const parsed = updateProductSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    // 2 & 3. Auth & RBAC
    const { user: currentUser } = await requirePermission("inventory.product.edit");

    const { id, ...data } = parsed.data;

    const existing = await db.product.findUnique({
      where: { id },
    });

    if (!existing || existing.deletedAt) {
      return { ok: false, error: "PRODUCT_NOT_FOUND" };
    }

    // SKU uniqueness check if changed
    if (data.sku && data.sku !== existing.sku) {
      const duplicateSku = await db.product.findFirst({
        where: { sku: data.sku, id: { not: id } },
      });
      if (duplicateSku) {
        return {
          ok: false,
          error: "DUPLICATE_SKU",
          fieldErrors: { sku: ["رمز الصنف (SKU) مستخدم بالفعل لمستخدم آخر"] },
        };
      }
    }

    // Barcode uniqueness check if changed
    if (data.barcode && data.barcode !== existing.barcode) {
      const duplicateBarcode = await db.product.findFirst({
        where: { barcode: data.barcode, id: { not: id } },
      });
      if (duplicateBarcode) {
        return {
          ok: false,
          error: "DUPLICATE_BARCODE",
          fieldErrors: { barcode: ["الباركود مسجل بالفعل لصنف آخر"] },
        };
      }
    }

    const updated = await db.product.update({
      where: { id },
      data: {
        name: data.name.trim(),
        sku: data.sku ?? existing.sku,
        barcode: data.barcode ? data.barcode.trim() : null,
        description: data.description ? data.description.trim() : null,
        categoryId: data.categoryId || null,
        unitId: data.unitId,
        costPrice: new Prisma.Decimal(data.costPrice),
        salePrice: new Prisma.Decimal(data.salePrice),
        taxRate: new Prisma.Decimal(data.taxRate),
        reorderLevel: data.reorderLevel,
        isActive: data.isActive,
        trackStock: data.trackStock,
      },
    });

    // 4. Audit log
    await logAudit({
      action: "PRODUCT_UPDATE",
      entity: "Product",
      entityId: updated.id,
      userId: currentUser.id,
      before: {
        name: existing.name,
        sku: existing.sku,
        costPrice: Number(existing.costPrice),
        salePrice: Number(existing.salePrice),
      },
      after: {
        name: updated.name,
        sku: updated.sku,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
      },
    });

    revalidatePath("/inventory/products");
    revalidatePath(`/inventory/products/${id}`);
    revalidatePath("/inventory/stock");

    return { ok: true, data: { id: updated.id, name: updated.name } };
  } catch (error) {
    console.error("updateProductAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "INTERNAL_ERROR",
    };
  }
}

export async function toggleProductStatusAction(
  id: string
): Promise<ActionResult<{ id: string; isActive: boolean }>> {
  try {
    const { user: currentUser } = await requirePermission("inventory.product.edit");

    const existing = await db.product.findUnique({
      where: { id },
      select: { id: true, name: true, isActive: true },
    });

    if (!existing) {
      return { ok: false, error: "PRODUCT_NOT_FOUND" };
    }

    const newStatus = !existing.isActive;

    const updated = await db.product.update({
      where: { id },
      data: { isActive: newStatus },
    });

    await logAudit({
      action: "PRODUCT_STATUS_TOGGLE",
      entity: "Product",
      entityId: updated.id,
      userId: currentUser.id,
      before: { isActive: existing.isActive },
      after: { isActive: newStatus },
    });

    revalidatePath("/inventory/products");
    revalidatePath(`/inventory/products/${id}`);

    return { ok: true, data: { id: updated.id, isActive: newStatus } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "INTERNAL_ERROR",
    };
  }
}

export async function deleteProductAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user: currentUser } = await requirePermission("inventory.product.delete");

    const product = await db.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: { movements: true },
        },
      },
    });

    if (!product || product.deletedAt) {
      return { ok: false, error: "PRODUCT_NOT_FOUND" };
    }

    // BUSINESS RULE: Products with movement history can be deactivated but not deleted
    if (product._count.movements > 0) {
      return {
        ok: false,
        error: "CANNOT_DELETE_PRODUCT_WITH_MOVEMENTS",
      };
    }

    // Soft delete
    await db.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await logAudit({
      action: "PRODUCT_DELETE",
      entity: "Product",
      entityId: id,
      userId: currentUser.id,
      before: { name: product.name, sku: product.sku },
    });

    revalidatePath("/inventory/products");
    revalidatePath("/inventory/stock");

    return { ok: true, data: { id } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "INTERNAL_ERROR",
    };
  }
}

export async function importProductsCsvAction(
  rows: ProductCsvRow[]
): Promise<ActionResult<{ importedCount: number; errors: string[] }>> {
  try {
    const { user: currentUser } = await requirePermission("inventory.product.create");

    if (!rows || rows.length === 0) {
      return { ok: false, error: "NO_ROWS_TO_IMPORT" };
    }

    // Cache units, categories, warehouses
    const [units, categories, warehouses] = await Promise.all([
      db.unit.findMany({ select: { id: true, name: true, symbol: true } }),
      db.category.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
      db.warehouse.findMany({ where: { deletedAt: null }, select: { id: true, code: true, isDefault: true } }),
    ]);

    const unitMap = new Map(units.map((u) => [u.name.toLowerCase(), u.id]));
    const catMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
    const whMap = new Map(warehouses.map((w) => [w.code.toUpperCase(), w.id]));
    const defaultWarehouseId = warehouses.find((w) => w.isDefault)?.id || warehouses[0]?.id;

    let importedCount = 0;
    const errors: string[] = [];

    await db.$transaction(async (tx) => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;

        // Resolve unit
        let unitId = unitMap.get(row.unitName.trim().toLowerCase());
        if (!unitId) {
          // Auto-create unit if missing
          const newUnit = await tx.unit.create({
            data: {
              name: row.unitName.trim(),
              symbol: row.unitName.trim(),
            },
          });
          unitId = newUnit.id;
          unitMap.set(row.unitName.trim().toLowerCase(), unitId);
        }

        // Resolve category
        let categoryId: string | null = null;
        if (row.categoryName && row.categoryName.trim() !== "") {
          const catKey = row.categoryName.trim().toLowerCase();
          if (catMap.has(catKey)) {
            categoryId = catMap.get(catKey)!;
          } else {
            const newCat = await tx.category.create({
              data: { name: row.categoryName.trim() },
            });
            categoryId = newCat.id;
            catMap.set(catKey, categoryId);
          }
        }

        // Resolve SKU
        let sku = row.sku ? row.sku.trim() : null;
        if (!sku) {
          sku = await generateProductSku(tx);
        } else {
          const exists = await tx.product.findUnique({ where: { sku } });
          if (exists) {
            errors.push(`صف ${rowNum}: رمز الصنف SKU "${sku}" مسجل بالفعل`);
            continue;
          }
        }

        const product = await tx.product.create({
          data: {
            name: row.name.trim(),
            sku,
            barcode: row.barcode ? row.barcode.trim() : null,
            unitId,
            categoryId,
            costPrice: new Prisma.Decimal(row.costPrice || 0),
            salePrice: new Prisma.Decimal(row.salePrice || 0),
            taxRate: new Prisma.Decimal(row.taxRate ?? 14),
            reorderLevel: row.reorderLevel ?? 10,
            trackStock: true,
            isActive: true,
          },
        });

        // If initial stock specified
        if (row.initialStock && row.initialStock > 0) {
          let targetWarehouseId = defaultWarehouseId;
          if (row.warehouseCode && whMap.has(row.warehouseCode.toUpperCase())) {
            targetWarehouseId = whMap.get(row.warehouseCode.toUpperCase())!;
          }

          if (targetWarehouseId) {
            await recordStockMovement(tx, {
              productId: product.id,
              warehouseId: targetWarehouseId,
              type: StockMovementType.IN,
              quantity: row.initialStock,
              referenceType: "INITIAL_STOCK",
              note: "الرصيد الافتتاحي من استيراد ملف CSV",
              createdById: currentUser.id,
            });
          }
        }

        importedCount++;
      }
    });

    await logAudit({
      action: "PRODUCT_CSV_IMPORT",
      entity: "Product",
      entityId: "BULK",
      userId: currentUser.id,
      after: { importedCount, errorsCount: errors.length },
    });

    revalidatePath("/inventory/products");
    revalidatePath("/inventory/stock");

    return {
      ok: true,
      data: { importedCount, errors },
    };
  } catch (error) {
    console.error("importProductsCsvAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "CSV_IMPORT_FAILED",
    };
  }
}
