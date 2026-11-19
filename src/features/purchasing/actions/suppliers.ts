"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";
import {
  supplierSchema,
  type SupplierFormValues,
} from "../schemas/purchasing";
import { generateSupplierCode } from "../services/purchasing-service";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createSupplierAction(
  input: SupplierFormValues
): Promise<ActionResult<{ id: string; name: string; code: string }>> {
  try {
    const parsed = supplierSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission(
      "purchasing.supplier.manage"
    );
    const data = parsed.data;

    let code = data.code;
    if (!code || code.trim() === "") {
      code = await generateSupplierCode();
    } else {
      code = code.trim().toUpperCase();
      const existing = await db.supplier.findUnique({ where: { code } });
      if (existing) {
        return {
          ok: false,
          error: "DUPLICATE_CODE",
          fieldErrors: {
            code: ["كود المورد مستخدم بالفعل / Supplier code already exists"],
          },
        };
      }
    }

    const supplier = await db.supplier.create({
      data: {
        code,
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        taxNumber: data.taxNumber?.trim() || null,
        balance: new Prisma.Decimal(0),
      },
    });

    await logAudit({
      userId: currentUser.id,
      action: "CREATE",
      entity: "Supplier",
      entityId: supplier.id,
      after: {
        code: supplier.code,
        name: supplier.name,
      },
    });

    revalidatePath("/[locale]/purchasing/suppliers", "page");
    return {
      ok: true,
      data: { id: supplier.id, name: supplier.name, code: supplier.code },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return { ok: false, error: message };
  }
}

export async function updateSupplierAction(
  input: SupplierFormValues & { id: string }
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const parsed = supplierSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission(
      "purchasing.supplier.manage"
    );
    const data = parsed.data;

    const existing = await db.supplier.findUnique({
      where: { id: input.id },
    });

    if (!existing) {
      return { ok: false, error: "SUPPLIER_NOT_FOUND" };
    }

    const updated = await db.supplier.update({
      where: { id: input.id },
      data: {
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        taxNumber: data.taxNumber?.trim() || null,
      },
    });

    await logAudit({
      userId: currentUser.id,
      action: "UPDATE",
      entity: "Supplier",
      entityId: updated.id,
      before: {
        name: existing.name,
        phone: existing.phone,
        email: existing.email,
        address: existing.address,
        taxNumber: existing.taxNumber,
      },
      after: {
        name: updated.name,
        phone: updated.phone,
        email: updated.email,
        address: updated.address,
        taxNumber: updated.taxNumber,
      },
    });

    revalidatePath("/[locale]/purchasing/suppliers", "page");
    revalidatePath(`/[locale]/purchasing/suppliers/${input.id}`, "page");
    return { ok: true, data: { id: updated.id, name: updated.name } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return { ok: false, error: message };
  }
}

export async function deleteSupplierAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user: currentUser } = await requirePermission(
      "purchasing.supplier.manage"
    );

    const existing = await db.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true,
            receipts: true,
            invoices: true,
            payments: true,
            returns: true,
          },
        },
      },
    });

    if (!existing) {
      return { ok: false, error: "SUPPLIER_NOT_FOUND" };
    }

    const hasTransactions =
      existing._count.orders > 0 ||
      existing._count.receipts > 0 ||
      existing._count.invoices > 0 ||
      existing._count.payments > 0 ||
      existing._count.returns > 0;

    if (hasTransactions) {
      return {
        ok: false,
        error:
          "CANNOT_DELETE_SUPPLIER_WITH_TRANSACTIONS: لا يمكن حذف المورد لوجود حركات مسجلة عليه.",
      };
    }

    await db.supplier.delete({ where: { id } });

    await logAudit({
      userId: currentUser.id,
      action: "DELETE",
      entity: "Supplier",
      entityId: id,
      before: { name: existing.name, code: existing.code },
    });

    revalidatePath("/[locale]/purchasing/suppliers", "page");
    return { ok: true, data: { id } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return { ok: false, error: message };
  }
}
