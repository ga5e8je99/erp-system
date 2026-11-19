"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";
import { toSafeError } from "@/lib/safe-error";
import {
  createCustomerSchema,
  updateCustomerSchema,
  type CreateCustomerInput,
  type UpdateCustomerInput,
} from "../schemas/sales";
import { generateCustomerCode } from "../services/sales-service";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createCustomerAction(
  input: CreateCustomerInput
): Promise<ActionResult<{ id: string; name: string; code: string }>> {
  try {
    const parsed = createCustomerSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission("sales.customer.manage");
    const data = parsed.data;

    let code = data.code;
    if (!code || code.trim() === "") {
      code = await generateCustomerCode(db);
    } else {
      code = code.trim().toUpperCase();
      const existing = await db.customer.findUnique({ where: { code } });
      if (existing) {
        return {
          ok: false,
          error: "DUPLICATE_CODE",
          fieldErrors: { code: ["كود العميل مستخدم بالفعل / Customer code already exists"] },
        };
      }
    }

    const customer = await db.customer.create({
      data: {
        code,
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        taxNumber: data.taxNumber?.trim() || null,
        creditLimit: new Prisma.Decimal(data.creditLimit || 0),
        balance: new Prisma.Decimal(0),
      },
    });

    await logAudit({
      action: "CUSTOMER_CREATE",
      entity: "Customer",
      entityId: customer.id,
      userId: currentUser.id,
      after: { name: customer.name, code: customer.code, creditLimit: data.creditLimit },
    });

    revalidatePath("/sales/customers");

    return { ok: true, data: { id: customer.id, name: customer.name, code: customer.code } };
  } catch (error) {
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}

export async function updateCustomerAction(
  input: UpdateCustomerInput
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const parsed = updateCustomerSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission("sales.customer.manage");
    const { id, ...data } = parsed.data;

    const existing = await db.customer.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return { ok: false, error: "CUSTOMER_NOT_FOUND" };
    }

    if (data.code && data.code.trim().toUpperCase() !== existing.code) {
      const duplicate = await db.customer.findFirst({
        where: { code: data.code.trim().toUpperCase(), id: { not: id } },
      });
      if (duplicate) {
        return {
          ok: false,
          error: "DUPLICATE_CODE",
          fieldErrors: { code: ["كود العميل مستخدم بالفعل / Customer code already exists"] },
        };
      }
    }

    const updated = await db.customer.update({
      where: { id },
      data: {
        code: data.code ? data.code.trim().toUpperCase() : existing.code,
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        taxNumber: data.taxNumber?.trim() || null,
        creditLimit: new Prisma.Decimal(data.creditLimit || 0),
      },
    });

    await logAudit({
      action: "CUSTOMER_UPDATE",
      entity: "Customer",
      entityId: updated.id,
      userId: currentUser.id,
      before: { name: existing.name, creditLimit: Number(existing.creditLimit) },
      after: { name: updated.name, creditLimit: data.creditLimit },
    });

    revalidatePath("/sales/customers");
    revalidatePath(`/sales/customers/${id}`);

    return { ok: true, data: { id: updated.id, name: updated.name } };
  } catch (error) {
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}

export async function deleteCustomerAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user: currentUser } = await requirePermission("sales.customer.manage");

    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { invoices: true, orders: true },
        },
      },
    });

    if (!customer || customer.deletedAt) {
      return { ok: false, error: "CUSTOMER_NOT_FOUND" };
    }

    if (Number(customer.balance) !== 0) {
      return {
        ok: false,
        error: "CUSTOMER_HAS_OUTSTANDING_BALANCE",
      };
    }

    if (customer._count.invoices > 0 || customer._count.orders > 0) {
      return {
        ok: false,
        error: "CUSTOMER_HAS_TRANSACTIONS",
      };
    }

    await db.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await logAudit({
      action: "CUSTOMER_DELETE",
      entity: "Customer",
      entityId: id,
      userId: currentUser.id,
      before: { name: customer.name, code: customer.code },
    });

    revalidatePath("/sales/customers");

    return { ok: true, data: { id } };
  } catch (error) {
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}
