"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { Prisma, PurchaseInvoiceStatus } from "@prisma/client";
import {
  purchaseInvoiceSchema,
  type PurchaseInvoiceFormValues,
} from "../schemas/purchasing";
import { calculatePurchasingDocumentTotals } from "../services/purchasing-calculations";
import {
  getNextPurchasingDocNumber,
  postPurchaseInvoiceTransaction,
} from "../services/purchasing-service";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createPurchaseInvoiceAction(
  input: PurchaseInvoiceFormValues
): Promise<ActionResult<{ id: string; invoiceNumber: string }>> {
  try {
    const parsed = purchaseInvoiceSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission(
      "purchasing.invoice.create"
    );
    const data = parsed.data;

    const totals = calculatePurchasingDocumentTotals(
      data.items,
      data.discount || 0
    );

    const invoice = await db.$transaction(async (tx) => {
      const companySettings = await tx.companySettings.findFirst();
      const invoiceNumber = await getNextPurchasingDocNumber(
        tx,
        "PURCHASE_INVOICE",
        companySettings?.purchaseInvoicePrefix || "PINV"
      );

      return tx.purchaseInvoice.create({
        data: {
          invoiceNumber,
          supplierId: data.supplierId,
          poId: data.poId || null,
          receiptId: data.receiptId || null,
          status: PurchaseInvoiceStatus.DRAFT,
          dueDate: new Date(data.dueDate),
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
      action: "CREATE",
      entity: "PurchaseInvoice",
      entityId: invoice.id,
      after: {
        invoiceNumber: invoice.invoiceNumber,
        total: Number(invoice.total),
      },
    });

    revalidatePath("/[locale]/purchasing/invoices", "page");
    return {
      ok: true,
      data: { id: invoice.id, invoiceNumber: invoice.invoiceNumber },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return { ok: false, error: message };
  }
}

export async function updatePurchaseInvoiceAction(
  input: PurchaseInvoiceFormValues & { id: string }
): Promise<ActionResult<{ id: string; invoiceNumber: string }>> {
  try {
    const parsed = purchaseInvoiceSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission(
      "purchasing.invoice.create"
    );
    const data = parsed.data;

    const existing = await db.purchaseInvoice.findUnique({
      where: { id: input.id },
    });

    if (!existing) {
      return { ok: false, error: "INVOICE_NOT_FOUND" };
    }

    if (existing.status !== PurchaseInvoiceStatus.DRAFT) {
      return {
        ok: false,
        error: "CANNOT_EDIT_NON_DRAFT: يمكن فقط تعديل الفواتير في حالة المسودة.",
      };
    }

    const totals = calculatePurchasingDocumentTotals(
      data.items,
      data.discount || 0
    );

    const updated = await db.$transaction(async (tx) => {
      await tx.purchaseInvoiceItem.deleteMany({
        where: { invoiceId: input.id },
      });

      return tx.purchaseInvoice.update({
        where: { id: input.id },
        data: {
          supplierId: data.supplierId,
          poId: data.poId || null,
          receiptId: data.receiptId || null,
          dueDate: new Date(data.dueDate),
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
      entity: "PurchaseInvoice",
      entityId: updated.id,
      before: { total: Number(existing.total) },
      after: { total: Number(updated.total) },
    });

    revalidatePath("/[locale]/purchasing/invoices", "page");
    revalidatePath(`/[locale]/purchasing/invoices/${input.id}`, "page");
    return {
      ok: true,
      data: { id: updated.id, invoiceNumber: updated.invoiceNumber },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return { ok: false, error: message };
  }
}

export async function postPurchaseInvoiceAction(
  id: string
): Promise<ActionResult<{ id: string; status: PurchaseInvoiceStatus }>> {
  try {
    const { user: currentUser } = await requirePermission(
      "purchasing.invoice.post"
    );

    const updated = await postPurchaseInvoiceTransaction({
      invoiceId: id,
      userId: currentUser.id,
    });

    await logAudit({
      userId: currentUser.id,
      action: "POST",
      entity: "PurchaseInvoice",
      entityId: id,
      after: { status: updated.status, total: Number(updated.total) },
    });

    revalidatePath("/[locale]/purchasing/invoices", "page");
    revalidatePath(`/[locale]/purchasing/invoices/${id}`, "page");
    revalidatePath(`/[locale]/purchasing/suppliers/${updated.supplierId}`, "page");
    return { ok: true, data: { id: updated.id, status: updated.status } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return { ok: false, error: message };
  }
}

export async function deletePurchaseInvoiceAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user: currentUser } = await requirePermission(
      "purchasing.invoice.create"
    );

    const existing = await db.purchaseInvoice.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!existing) {
      return { ok: false, error: "INVOICE_NOT_FOUND" };
    }

    if (existing.status !== PurchaseInvoiceStatus.DRAFT) {
      return {
        ok: false,
        error: "CANNOT_DELETE_POSTED: يمكن فقط حذف الفواتير في حالة المسودة.",
      };
    }

    await db.purchaseInvoice.delete({ where: { id } });

    await logAudit({
      userId: currentUser.id,
      action: "DELETE",
      entity: "PurchaseInvoice",
      entityId: id,
      before: { invoiceNumber: existing.invoiceNumber },
    });

    revalidatePath("/[locale]/purchasing/invoices", "page");
    return { ok: true, data: { id } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return { ok: false, error: message };
  }
}
