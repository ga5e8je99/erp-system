"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { Prisma, PurchaseOrderStatus } from "@prisma/client";
import {
  purchaseOrderSchema,
  type PurchaseOrderFormValues,
} from "../schemas/purchasing";
import { calculatePurchasingDocumentTotals } from "../services/purchasing-calculations";
import { getNextPurchasingDocNumber } from "../services/purchasing-service";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createPurchaseOrderAction(
  input: PurchaseOrderFormValues
): Promise<ActionResult<{ id: string; poNumber: string }>> {
  try {
    const parsed = purchaseOrderSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission(
      "purchasing.order.manage"
    );
    const data = parsed.data;

    const totals = calculatePurchasingDocumentTotals(
      data.items,
      data.discount || 0
    );

    const result = await db.$transaction(async (tx) => {
      const companySettings = await tx.companySettings.findFirst();
      const poNumber = await getNextPurchasingDocNumber(
        tx,
        "PURCHASE_ORDER",
        companySettings?.poPrefix || "PO"
      );

      const po = await tx.purchaseOrder.create({
        data: {
          poNumber,
          supplierId: data.supplierId,
          status: PurchaseOrderStatus.DRAFT,
          expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
          subtotal: new Prisma.Decimal(totals.subtotal),
          discount: new Prisma.Decimal(totals.totalDiscount),
          tax: new Prisma.Decimal(totals.taxAmount),
          total: new Prisma.Decimal(totals.total),
          notes: data.notes?.trim() || null,
          items: {
            create: data.items.map((item) => {
              const lineSubtotal = item.quantity * item.unitPrice;
              const lineDiscount = item.discount || 0;
              const taxable = Math.max(0, lineSubtotal - lineDiscount);
              const tax = (taxable * (item.taxRate || 14)) / 100;
              const lineTotal = taxable + tax;

              return {
                productId: item.productId,
                quantity: new Prisma.Decimal(item.quantity),
                unitPrice: new Prisma.Decimal(item.unitPrice),
                discount: new Prisma.Decimal(lineDiscount),
                taxRate: new Prisma.Decimal(item.taxRate || 14),
                taxAmount: new Prisma.Decimal(Math.round(tax * 100) / 100),
                total: new Prisma.Decimal(Math.round(lineTotal * 100) / 100),
              };
            }),
          },
        },
      });

      return po;
    });

    await logAudit({
      userId: currentUser.id,
      action: "CREATE",
      entity: "PurchaseOrder",
      entityId: result.id,
      after: {
        poNumber: result.poNumber,
        total: Number(result.total),
      },
    });

    revalidatePath("/[locale]/purchasing/orders", "page");
    return { ok: true, data: { id: result.id, poNumber: result.poNumber } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return { ok: false, error: message };
  }
}

export async function updatePurchaseOrderAction(
  input: PurchaseOrderFormValues & { id: string }
): Promise<ActionResult<{ id: string; poNumber: string }>> {
  try {
    const parsed = purchaseOrderSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission(
      "purchasing.order.manage"
    );
    const data = parsed.data;

    const existing = await db.purchaseOrder.findUnique({
      where: { id: input.id },
    });

    if (!existing) {
      return { ok: false, error: "ORDER_NOT_FOUND" };
    }

    if (existing.status !== PurchaseOrderStatus.DRAFT) {
      return {
        ok: false,
        error: "CANNOT_EDIT_NON_DRAFT: يمكن فقط تعديل أوامر الشراء في حالة المسودة.",
      };
    }

    const totals = calculatePurchasingDocumentTotals(
      data.items,
      data.discount || 0
    );

    const updated = await db.$transaction(async (tx) => {
      await tx.purchaseOrderItem.deleteMany({
        where: { poId: input.id },
      });

      return tx.purchaseOrder.update({
        where: { id: input.id },
        data: {
          supplierId: data.supplierId,
          expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
          subtotal: new Prisma.Decimal(totals.subtotal),
          discount: new Prisma.Decimal(totals.totalDiscount),
          tax: new Prisma.Decimal(totals.taxAmount),
          total: new Prisma.Decimal(totals.total),
          notes: data.notes?.trim() || null,
          items: {
            create: data.items.map((item) => {
              const lineSubtotal = item.quantity * item.unitPrice;
              const lineDiscount = item.discount || 0;
              const taxable = Math.max(0, lineSubtotal - lineDiscount);
              const tax = (taxable * (item.taxRate || 14)) / 100;
              const lineTotal = taxable + tax;

              return {
                productId: item.productId,
                quantity: new Prisma.Decimal(item.quantity),
                unitPrice: new Prisma.Decimal(item.unitPrice),
                discount: new Prisma.Decimal(lineDiscount),
                taxRate: new Prisma.Decimal(item.taxRate || 14),
                taxAmount: new Prisma.Decimal(Math.round(tax * 100) / 100),
                total: new Prisma.Decimal(Math.round(lineTotal * 100) / 100),
              };
            }),
          },
        },
      });
    });

    await logAudit({
      userId: currentUser.id,
      action: "UPDATE",
      entity: "PurchaseOrder",
      entityId: updated.id,
      before: { total: Number(existing.total) },
      after: { total: Number(updated.total) },
    });

    revalidatePath("/[locale]/purchasing/orders", "page");
    revalidatePath(`/[locale]/purchasing/orders/${input.id}`, "page");
    return { ok: true, data: { id: updated.id, poNumber: updated.poNumber } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return { ok: false, error: message };
  }
}

export async function sendPurchaseOrderAction(
  id: string
): Promise<ActionResult<{ id: string; status: PurchaseOrderStatus }>> {
  try {
    const { user: currentUser } = await requirePermission(
      "purchasing.order.manage"
    );

    const po = await db.purchaseOrder.findUnique({
      where: { id },
    });

    if (!po) {
      return { ok: false, error: "ORDER_NOT_FOUND" };
    }

    if (po.status !== PurchaseOrderStatus.DRAFT) {
      return {
        ok: false,
        error: "INVALID_STATUS: أمر الشراء ليس في حالة مسودة.",
      };
    }

    const updated = await db.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.SENT },
    });

    await logAudit({
      userId: currentUser.id,
      action: "UPDATE",
      entity: "PurchaseOrder",
      entityId: id,
      before: { status: po.status },
      after: { status: updated.status },
    });

    revalidatePath("/[locale]/purchasing/orders", "page");
    revalidatePath(`/[locale]/purchasing/orders/${id}`, "page");
    return { ok: true, data: { id: updated.id, status: updated.status } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return { ok: false, error: message };
  }
}

export async function cancelPurchaseOrderAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user: currentUser } = await requirePermission(
      "purchasing.order.manage"
    );

    const po = await db.purchaseOrder.findUnique({
      where: { id },
      include: { receipts: true },
    });

    if (!po) {
      return { ok: false, error: "ORDER_NOT_FOUND" };
    }

    if (po.receipts.length > 0) {
      return {
        ok: false,
        error: "CANNOT_CANCEL_WITH_RECEIPTS: لا يمكن إلغاء أمر شراء تم استلام بضائع عليه جزئياً أو كلياً.",
      };
    }

    const updated = await db.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.CANCELLED },
    });

    await logAudit({
      userId: currentUser.id,
      action: "UPDATE",
      entity: "PurchaseOrder",
      entityId: id,
      before: { status: po.status },
      after: { status: updated.status },
    });

    revalidatePath("/[locale]/purchasing/orders", "page");
    revalidatePath(`/[locale]/purchasing/orders/${id}`, "page");
    return { ok: true, data: { id } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return { ok: false, error: message };
  }
}

export async function deletePurchaseOrderAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user: currentUser } = await requirePermission(
      "purchasing.order.manage"
    );

    const po = await db.purchaseOrder.findUnique({
      where: { id },
      include: { receipts: true, invoices: true },
    });

    if (!po) {
      return { ok: false, error: "ORDER_NOT_FOUND" };
    }

    if (po.status !== PurchaseOrderStatus.DRAFT) {
      return {
        ok: false,
        error: "CANNOT_DELETE_NON_DRAFT: يمكن فقط حذف أوامر الشراء في حالة المسودة.",
      };
    }

    if (po.receipts.length > 0 || po.invoices.length > 0) {
      return {
        ok: false,
        error: "CANNOT_DELETE_WITH_RECORDS: أمر الشراء مرتبط بإيصالات أو فواتير مسجلة.",
      };
    }

    await db.purchaseOrder.delete({ where: { id } });

    await logAudit({
      userId: currentUser.id,
      action: "DELETE",
      entity: "PurchaseOrder",
      entityId: id,
      before: { poNumber: po.poNumber },
    });

    revalidatePath("/[locale]/purchasing/orders", "page");
    return { ok: true, data: { id } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return { ok: false, error: message };
  }
}
