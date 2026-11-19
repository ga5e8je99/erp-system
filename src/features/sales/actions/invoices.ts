"use server";

import { logger } from "@/lib/logger";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { Prisma, SalesInvoiceStatus } from "@prisma/client";
import { toSafeError } from "@/lib/safe-error";
import {
  salesInvoiceSchema,
  type SalesInvoiceInput,
} from "../schemas/sales";
import { calculateDocumentTotals } from "../services/sales-calculations";
import {
  getNextSalesDocNumber,
  issueSalesInvoiceTransaction,
  voidSalesInvoiceTransaction,
} from "../services/sales-service";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createInvoiceAction(
  input: SalesInvoiceInput
): Promise<ActionResult<{ id: string; invoiceNumber: string }>> {
  try {
    const parsed = salesInvoiceSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission("sales.invoice.create");
    const data = parsed.data;

    const customer = await db.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) return { ok: false, error: "CUSTOMER_NOT_FOUND" };

    const warehouse = await db.warehouse.findUnique({ where: { id: data.warehouseId } });
    if (!warehouse) return { ok: false, error: "WAREHOUSE_NOT_FOUND" };

    // Calculate document totals with header-level discount
    const calc = calculateDocumentTotals({
      invoiceDiscount: data.discount || 0,
      items: data.items.map((i) => ({
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
        taxRate: i.taxRate,
      })),
    });

    const companySettings = await db.companySettings.findFirst();

    const invoice = await db.$transaction(async (tx) => {
      const invoiceNumber = await getNextSalesDocNumber(
        tx,
        "INV",
        companySettings?.invoicePrefix || "INV"
      );

      const createdInvoice = await tx.salesInvoice.create({
        data: {
          invoiceNumber,
          customerId: data.customerId,
          orderId: data.orderId || null,
          issueDate: new Date(data.issueDate),
          dueDate: new Date(data.dueDate),
          status: SalesInvoiceStatus.DRAFT,
          subtotal: new Prisma.Decimal(calc.subtotal),
          discount: new Prisma.Decimal(calc.totalDiscount),
          tax: new Prisma.Decimal(calc.tax),
          total: new Prisma.Decimal(calc.total),
          paidAmount: new Prisma.Decimal(0),
          notes: data.notes || null,
          items: {
            create: data.items.map((item, idx) => {
              const lineCalc = calc.items[idx];
              return {
                productId: item.productId,
                quantity: new Prisma.Decimal(item.quantity),
                unitPrice: new Prisma.Decimal(item.unitPrice),
                discount: new Prisma.Decimal(item.discount || 0),
                taxRate: new Prisma.Decimal(item.taxRate || 0),
                taxAmount: new Prisma.Decimal(lineCalc?.taxAmount || 0),
                total: new Prisma.Decimal(lineCalc?.total || 0),
              };
            }),
          },
        },
      });

      return createdInvoice;
    });

    await logAudit({
      action: "INVOICE_CREATE",
      entity: "SalesInvoice",
      entityId: invoice.id,
      userId: currentUser.id,
      after: {
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        total: calc.total,
      },
    });

    revalidatePath("/sales/invoices");

    return {
      ok: true,
      data: { id: invoice.id, invoiceNumber: invoice.invoiceNumber },
    };
  } catch (error) {
    logger.error({ err: error }, "createInvoiceAction error:");
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}

export async function updateInvoiceAction(
  id: string,
  input: SalesInvoiceInput
): Promise<ActionResult<{ id: string; invoiceNumber: string }>> {
  try {
    const parsed = salesInvoiceSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission("sales.invoice.create");
    const data = parsed.data;

    const existing = await db.salesInvoice.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) return { ok: false, error: "INVOICE_NOT_FOUND" };

    if (existing.status !== SalesInvoiceStatus.DRAFT) {
      return {
        ok: false,
        error: "IMMUTABLE_DOCUMENT: الفواتير الصادرة لا يمكن تعديلها مباشرة إلا عبر الإرجاع أو الإلغاء",
      };
    }

    const calc = calculateDocumentTotals({
      invoiceDiscount: data.discount || 0,
      items: data.items.map((i) => ({
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
        taxRate: i.taxRate,
      })),
    });

    const updated = await db.$transaction(async (tx) => {
      await tx.salesInvoiceItem.deleteMany({ where: { invoiceId: id } });

      const res = await tx.salesInvoice.update({
        where: { id },
        data: {
          customerId: data.customerId,
          issueDate: new Date(data.issueDate),
          dueDate: new Date(data.dueDate),
          subtotal: new Prisma.Decimal(calc.subtotal),
          discount: new Prisma.Decimal(calc.totalDiscount),
          tax: new Prisma.Decimal(calc.tax),
          total: new Prisma.Decimal(calc.total),
          notes: data.notes || null,
          items: {
            create: data.items.map((item, idx) => {
              const lineCalc = calc.items[idx];
              return {
                productId: item.productId,
                quantity: new Prisma.Decimal(item.quantity),
                unitPrice: new Prisma.Decimal(item.unitPrice),
                discount: new Prisma.Decimal(item.discount || 0),
                taxRate: new Prisma.Decimal(item.taxRate || 0),
                taxAmount: new Prisma.Decimal(lineCalc?.taxAmount || 0),
                total: new Prisma.Decimal(lineCalc?.total || 0),
              };
            }),
          },
        },
      });

      return res;
    });

    await logAudit({
      action: "INVOICE_UPDATE",
      entity: "SalesInvoice",
      entityId: id,
      userId: currentUser.id,
      before: { total: Number(existing.total) },
      after: { total: calc.total },
    });

    revalidatePath("/sales/invoices");
    revalidatePath(`/sales/invoices/${id}`);

    return {
      ok: true,
      data: { id: updated.id, invoiceNumber: updated.invoiceNumber },
    };
  } catch (error) {
    logger.error({ err: error }, "updateInvoiceAction error:");
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}

export async function deleteInvoiceAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user: currentUser } = await requirePermission("sales.invoice.create");

    const existing = await db.salesInvoice.findUnique({
      where: { id },
    });

    if (!existing) return { ok: false, error: "INVOICE_NOT_FOUND" };

    if (existing.status !== SalesInvoiceStatus.DRAFT) {
      return {
        ok: false,
        error: "CANNOT_DELETE_ISSUED: لا يمكن حذف الفواتير الصادرة نهائياً. استخدم خيار الإلغاء (Void)",
      };
    }

    await db.$transaction(async (tx) => {
      await tx.salesInvoiceItem.deleteMany({ where: { invoiceId: id } });
      await tx.salesInvoice.delete({ where: { id } });
    });

    await logAudit({
      action: "INVOICE_DELETE",
      entity: "SalesInvoice",
      entityId: id,
      userId: currentUser.id,
      before: { invoiceNumber: existing.invoiceNumber, total: Number(existing.total) },
    });

    revalidatePath("/sales/invoices");

    return { ok: true, data: { id } };
  } catch (error) {
    logger.error({ err: error }, "deleteInvoiceAction error:");
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}

export async function issueInvoiceAction(params: {
  invoiceId: string;
  warehouseId: string;
}): Promise<ActionResult<{ id: string; status: SalesInvoiceStatus }>> {
  try {
    const { user: currentUser } = await requirePermission("sales.invoice.post");
    const { invoiceId, warehouseId } = params;

    const result = await issueSalesInvoiceTransaction(
      invoiceId,
      warehouseId,
      currentUser.id
    );

    await logAudit({
      action: "INVOICE_ISSUE",
      entity: "SalesInvoice",
      entityId: invoiceId,
      userId: currentUser.id,
      after: {
        status: result.invoice.status,
        journalEntryId: result.journalEntry.id,
        entryNumber: result.journalEntry.entryNumber,
      },
    });

    revalidatePath("/sales/invoices");
    revalidatePath(`/sales/invoices/${invoiceId}`);
    revalidatePath("/sales/customers");
    revalidatePath("/inventory/stock");

    return {
      ok: true,
      data: { id: result.invoice.id, status: result.invoice.status },
    };
  } catch (error) {
    logger.error({ err: error }, "issueInvoiceAction error:");
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}

export async function voidInvoiceAction(params: {
  invoiceId: string;
  warehouseId: string;
  reason: string;
}): Promise<ActionResult<{ success: boolean }>> {
  try {
    const { user: currentUser } = await requirePermission("sales.invoice.post");
    const { invoiceId, warehouseId, reason } = params;

    if (!reason || reason.trim() === "") {
      return { ok: false, error: "REASON_REQUIRED: يرجى كتابة سبب الإلغاء" };
    }

    const result = await voidSalesInvoiceTransaction(
      invoiceId,
      warehouseId,
      currentUser.id,
      reason
    );

    await logAudit({
      action: "INVOICE_VOID",
      entity: "SalesInvoice",
      entityId: invoiceId,
      userId: currentUser.id,
      after: { reason },
    });

    revalidatePath("/sales/invoices");
    revalidatePath(`/sales/invoices/${invoiceId}`);
    revalidatePath("/sales/customers");
    revalidatePath("/inventory/stock");

    return { ok: true, data: result };
  } catch (error) {
    logger.error({ err: error }, "voidInvoiceAction error:");
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}
