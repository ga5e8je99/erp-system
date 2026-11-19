"use server";

import { logger } from "@/lib/logger";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { Prisma, SalesQuotationStatus, SalesOrderStatus } from "@prisma/client";
import { toSafeError } from "@/lib/safe-error";
import {
  salesQuotationSchema,
  type SalesQuotationInput,
} from "../schemas/sales";
import { calculateDocumentTotals } from "../services/sales-calculations";
import { getNextSalesDocNumber } from "../services/sales-service";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createQuotationAction(
  input: SalesQuotationInput
): Promise<ActionResult<{ id: string; quotationNumber: string }>> {
  try {
    const parsed = salesQuotationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission("sales.quotation.manage");
    const data = parsed.data;

    // Verify customer exists
    const customer = await db.customer.findUnique({
      where: { id: data.customerId },
    });
    if (!customer) {
      return { ok: false, error: "CUSTOMER_NOT_FOUND" };
    }

    // Server-side recalculation of totals
    const calc = calculateDocumentTotals({
      items: data.items.map((i) => ({
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
        taxRate: i.taxRate,
      })),
    });

    const companySettings = await db.companySettings.findFirst();

    const result = await db.$transaction(async (tx) => {
      const quotationNumber = await getNextSalesDocNumber(
        tx,
        "QUO",
        companySettings?.quotationPrefix || "QUO"
      );

      const quotation = await tx.salesQuotation.create({
        data: {
          quotationNumber,
          customerId: data.customerId,
          issueDate: new Date(data.issueDate),
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          status: SalesQuotationStatus.DRAFT,
          subtotal: new Prisma.Decimal(calc.subtotal),
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

      return quotation;
    });

    await logAudit({
      action: "QUOTATION_CREATE",
      entity: "SalesQuotation",
      entityId: result.id,
      userId: currentUser.id,
      after: {
        quotationNumber: result.quotationNumber,
        customerId: result.customerId,
        total: calc.total,
      },
    });

    revalidatePath("/sales/quotations");

    return {
      ok: true,
      data: { id: result.id, quotationNumber: result.quotationNumber },
    };
  } catch (error) {
    logger.error({ err: error }, "createQuotationAction error:");
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}

export async function updateQuotationAction(
  id: string,
  input: SalesQuotationInput
): Promise<ActionResult<{ id: string; quotationNumber: string }>> {
  try {
    const parsed = salesQuotationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission("sales.quotation.manage");
    const data = parsed.data;

    const existing = await db.salesQuotation.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return { ok: false, error: "QUOTATION_NOT_FOUND" };
    }

    if (existing.status !== SalesQuotationStatus.DRAFT && existing.status !== SalesQuotationStatus.SENT) {
      return {
        ok: false,
        error: "IMMUTABLE_DOCUMENT: لا يمكن تعديل عرض أسعار تم قبوله أو رفضه أو تحويله لأمر بيع",
      };
    }

    const calc = calculateDocumentTotals({
      items: data.items.map((i) => ({
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
        taxRate: i.taxRate,
      })),
    });

    const result = await db.$transaction(async (tx) => {
      // Delete old lines
      await tx.salesQuotationItem.deleteMany({
        where: { quotationId: id },
      });

      // Update header and recreate lines
      const updated = await tx.salesQuotation.update({
        where: { id },
        data: {
          customerId: data.customerId,
          issueDate: new Date(data.issueDate),
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          subtotal: new Prisma.Decimal(calc.subtotal),
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

      return updated;
    });

    await logAudit({
      action: "QUOTATION_UPDATE",
      entity: "SalesQuotation",
      entityId: id,
      userId: currentUser.id,
      before: { total: Number(existing.total), status: existing.status },
      after: { total: calc.total, status: result.status },
    });

    revalidatePath("/sales/quotations");
    revalidatePath(`/sales/quotations/${id}`);

    return {
      ok: true,
      data: { id: result.id, quotationNumber: result.quotationNumber },
    };
  } catch (error) {
    logger.error({ err: error }, "updateQuotationAction error:");
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}

export async function deleteQuotationAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user: currentUser } = await requirePermission("sales.quotation.manage");

    const existing = await db.salesQuotation.findUnique({
      where: { id },
      include: { orders: { select: { id: true } } },
    });

    if (!existing) {
      return { ok: false, error: "QUOTATION_NOT_FOUND" };
    }

    if (existing.orders.length > 0) {
      return {
        ok: false,
        error: "CANNOT_DELETE_CONVERTED: تم تحويل عرض السعر إلى أمر بيع بالفعل، لا يمكن حذفه",
      };
    }

    if (existing.status !== SalesQuotationStatus.DRAFT) {
      return {
        ok: false,
        error: "CANNOT_DELETE_NON_DRAFT: لا يمكن حذف إلا عروض الأسعار في حالة المسودة",
      };
    }

    await db.$transaction(async (tx) => {
      await tx.salesQuotationItem.deleteMany({ where: { quotationId: id } });
      await tx.salesQuotation.delete({ where: { id } });
    });

    await logAudit({
      action: "QUOTATION_DELETE",
      entity: "SalesQuotation",
      entityId: id,
      userId: currentUser.id,
      before: { quotationNumber: existing.quotationNumber, total: Number(existing.total) },
    });

    revalidatePath("/sales/quotations");

    return { ok: true, data: { id } };
  } catch (error) {
    logger.error({ err: error }, "deleteQuotationAction error:");
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}

export async function convertQuotationToOrderAction(
  quotationId: string
): Promise<ActionResult<{ orderId: string; orderNumber: string }>> {
  try {
    const { user: currentUser } = await requirePermission("sales.order.manage");

    const quotation = await db.salesQuotation.findUnique({
      where: { id: quotationId },
      include: { items: true },
    });

    if (!quotation) {
      return { ok: false, error: "QUOTATION_NOT_FOUND" };
    }

    if (quotation.status === SalesQuotationStatus.REJECTED || quotation.status === SalesQuotationStatus.EXPIRED) {
      return {
        ok: false,
        error: "INVALID_STATUS: لا يمكن تحويل عرض أسعار ملغي أو مرفوض",
      };
    }

    const companySettings = await db.companySettings.findFirst();

    const order = await db.$transaction(async (tx) => {
      const orderNumber = await getNextSalesDocNumber(
        tx,
        "SO",
        companySettings?.orderPrefix || "SO"
      );

      const createdOrder = await tx.salesOrder.create({
        data: {
          orderNumber,
          customerId: quotation.customerId,
          quotationId: quotation.id,
          issueDate: new Date(),
          status: SalesOrderStatus.DRAFT,
          subtotal: quotation.subtotal,
          tax: quotation.tax,
          total: quotation.total,
          notes: quotation.notes ? `من عرض سعر ${quotation.quotationNumber}: ${quotation.notes}` : `من عرض سعر ${quotation.quotationNumber}`,
          items: {
            create: quotation.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              taxRate: item.taxRate,
              taxAmount: item.taxAmount,
              total: item.total,
            })),
          },
        },
      });

      // Mark quotation accepted
      await tx.salesQuotation.update({
        where: { id: quotationId },
        data: { status: SalesQuotationStatus.ACCEPTED },
      });

      return createdOrder;
    });

    await logAudit({
      action: "QUOTATION_CONVERT_TO_ORDER",
      entity: "SalesOrder",
      entityId: order.id,
      userId: currentUser.id,
      after: {
        orderNumber: order.orderNumber,
        quotationId,
        quotationNumber: quotation.quotationNumber,
      },
    });

    revalidatePath("/sales/quotations");
    revalidatePath(`/sales/quotations/${quotationId}`);
    revalidatePath("/sales/orders");

    return {
      ok: true,
      data: { orderId: order.id, orderNumber: order.orderNumber },
    };
  } catch (error) {
    logger.error({ err: error }, "convertQuotationToOrderAction error:");
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}
