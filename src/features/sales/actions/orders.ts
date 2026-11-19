"use server";

import { logger } from "@/lib/logger";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { Prisma, SalesOrderStatus, SalesInvoiceStatus } from "@prisma/client";
import { toSafeError } from "@/lib/safe-error";
import {
  salesOrderSchema,
  type SalesOrderInput,
} from "../schemas/sales";
import { calculateDocumentTotals } from "../services/sales-calculations";
import { getNextSalesDocNumber } from "../services/sales-service";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createOrderAction(
  input: SalesOrderInput
): Promise<ActionResult<{ id: string; orderNumber: string }>> {
  try {
    const parsed = salesOrderSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission("sales.order.manage");
    const data = parsed.data;

    const customer = await db.customer.findUnique({
      where: { id: data.customerId },
    });
    if (!customer) {
      return { ok: false, error: "CUSTOMER_NOT_FOUND" };
    }

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
      const orderNumber = await getNextSalesDocNumber(
        tx,
        "SO",
        companySettings?.orderPrefix || "SO"
      );

      const order = await tx.salesOrder.create({
        data: {
          orderNumber,
          customerId: data.customerId,
          quotationId: data.quotationId || null,
          issueDate: new Date(data.issueDate),
          status: SalesOrderStatus.DRAFT,
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

      return order;
    });

    await logAudit({
      action: "ORDER_CREATE",
      entity: "SalesOrder",
      entityId: result.id,
      userId: currentUser.id,
      after: {
        orderNumber: result.orderNumber,
        customerId: result.customerId,
        total: calc.total,
      },
    });

    revalidatePath("/sales/orders");

    return {
      ok: true,
      data: { id: result.id, orderNumber: result.orderNumber },
    };
  } catch (error) {
    logger.error({ err: error }, "createOrderAction error:");
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}

export async function updateOrderAction(
  id: string,
  input: SalesOrderInput
): Promise<ActionResult<{ id: string; orderNumber: string }>> {
  try {
    const parsed = salesOrderSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission("sales.order.manage");
    const data = parsed.data;

    const existing = await db.salesOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return { ok: false, error: "ORDER_NOT_FOUND" };
    }

    if (existing.status !== SalesOrderStatus.DRAFT) {
      return {
        ok: false,
        error: "IMMUTABLE_DOCUMENT: لا يمكن تعديل أمر بيع تم تأكيده أو تنفيذه أو إلغاؤه",
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
      await tx.salesOrderItem.deleteMany({
        where: { orderId: id },
      });

      const updated = await tx.salesOrder.update({
        where: { id },
        data: {
          customerId: data.customerId,
          issueDate: new Date(data.issueDate),
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
      action: "ORDER_UPDATE",
      entity: "SalesOrder",
      entityId: id,
      userId: currentUser.id,
      before: { total: Number(existing.total), status: existing.status },
      after: { total: calc.total, status: result.status },
    });

    revalidatePath("/sales/orders");
    revalidatePath(`/sales/orders/${id}`);

    return {
      ok: true,
      data: { id: result.id, orderNumber: result.orderNumber },
    };
  } catch (error) {
    logger.error({ err: error }, "updateOrderAction error:");
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}

export async function confirmOrderAction(
  id: string
): Promise<ActionResult<{ id: string; status: SalesOrderStatus }>> {
  try {
    const { user: currentUser } = await requirePermission("sales.order.manage");

    const order = await db.salesOrder.findUnique({ where: { id } });
    if (!order) return { ok: false, error: "ORDER_NOT_FOUND" };

    if (order.status !== SalesOrderStatus.DRAFT) {
      return { ok: false, error: "INVALID_STATUS: أمر البيع ليس بحالة مسودة" };
    }

    const updated = await db.salesOrder.update({
      where: { id },
      data: { status: SalesOrderStatus.CONFIRMED },
    });

    await logAudit({
      action: "ORDER_CONFIRM",
      entity: "SalesOrder",
      entityId: id,
      userId: currentUser.id,
      before: { status: order.status },
      after: { status: updated.status },
    });

    revalidatePath("/sales/orders");
    revalidatePath(`/sales/orders/${id}`);

    return { ok: true, data: { id, status: updated.status } };
  } catch (error) {
    logger.error({ err: error }, "confirmOrderAction error:");
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}

export async function cancelOrderAction(
  id: string,
  reason?: string
): Promise<ActionResult<{ id: string; status: SalesOrderStatus }>> {
  try {
    const { user: currentUser } = await requirePermission("sales.order.manage");

    const order = await db.salesOrder.findUnique({
      where: { id },
      include: { invoices: true },
    });
    if (!order) return { ok: false, error: "ORDER_NOT_FOUND" };

    if (order.status === SalesOrderStatus.FULFILLED) {
      return {
        ok: false,
        error: "CANNOT_CANCEL_FULFILLED: لا يمكن إلغاء أمر بيع تم تنفيذه وإصدار فاتورته",
      };
    }

    const activeInvoices = order.invoices.filter((i) => i.status !== SalesInvoiceStatus.VOID);
    if (activeInvoices.length > 0) {
      return {
        ok: false,
        error: "ACTIVE_INVOICES_EXIST: لا يمكن إلغاء أمر البيع لوجود فواتير نشطة مرتبطة به",
      };
    }

    const updated = await db.salesOrder.update({
      where: { id },
      data: {
        status: SalesOrderStatus.CANCELLED,
        notes: reason ? `${order.notes || ""} | سبب الإلغاء: ${reason}` : order.notes,
      },
    });

    await logAudit({
      action: "ORDER_CANCEL",
      entity: "SalesOrder",
      entityId: id,
      userId: currentUser.id,
      before: { status: order.status },
      after: { status: updated.status, reason },
    });

    revalidatePath("/sales/orders");
    revalidatePath(`/sales/orders/${id}`);

    return { ok: true, data: { id, status: updated.status } };
  } catch (error) {
    logger.error({ err: error }, "cancelOrderAction error:");
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}

export async function convertOrderToInvoiceAction(params: {
  orderId: string;
  warehouseId: string;
  dueDate?: string;
}): Promise<ActionResult<{ invoiceId: string; invoiceNumber: string }>> {
  try {
    const { user: currentUser } = await requirePermission("sales.invoice.create");
    const { orderId, warehouseId, dueDate } = params;

    const order = await db.salesOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) return { ok: false, error: "ORDER_NOT_FOUND" };

    if (order.status === SalesOrderStatus.CANCELLED) {
      return { ok: false, error: "CANNOT_CONVERT_CANCELLED: أمر البيع ملغي" };
    }

    const warehouse = await db.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) return { ok: false, error: "WAREHOUSE_NOT_FOUND" };

    const companySettings = await db.companySettings.findFirst();

    const invoice = await db.$transaction(async (tx) => {
      const invoiceNumber = await getNextSalesDocNumber(
        tx,
        "INV",
        companySettings?.invoicePrefix || "INV"
      );

      const issueDate = new Date();
      const invoiceDueDate = dueDate
        ? new Date(dueDate)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default

      const createdInvoice = await tx.salesInvoice.create({
        data: {
          invoiceNumber,
          customerId: order.customerId,
          orderId: order.id,
          issueDate,
          dueDate: invoiceDueDate,
          status: SalesInvoiceStatus.DRAFT,
          subtotal: order.subtotal,
          discount: new Prisma.Decimal(0),
          tax: order.tax,
          total: order.total,
          paidAmount: new Prisma.Decimal(0),
          notes: `تم إنشاء الفاتورة من أمر البيع ${order.orderNumber}`,
          items: {
            create: order.items.map((item) => ({
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

      // Update order status to FULFILLED
      await tx.salesOrder.update({
        where: { id: orderId },
        data: { status: SalesOrderStatus.FULFILLED },
      });

      return createdInvoice;
    });

    await logAudit({
      action: "ORDER_CONVERT_TO_INVOICE",
      entity: "SalesInvoice",
      entityId: invoice.id,
      userId: currentUser.id,
      after: {
        invoiceNumber: invoice.invoiceNumber,
        orderId,
        orderNumber: order.orderNumber,
      },
    });

    revalidatePath("/sales/orders");
    revalidatePath(`/sales/orders/${orderId}`);
    revalidatePath("/sales/invoices");

    return {
      ok: true,
      data: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
    };
  } catch (error) {
    logger.error({ err: error }, "convertOrderToInvoiceAction error:");
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}

export async function deleteOrderAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user: currentUser } = await requirePermission("sales.order.manage");

    const existing = await db.salesOrder.findUnique({
      where: { id },
      include: { invoices: { select: { id: true } } },
    });

    if (!existing) return { ok: false, error: "ORDER_NOT_FOUND" };

    if (existing.invoices.length > 0) {
      return {
        ok: false,
        error: "CANNOT_DELETE_HAS_INVOICES: لا يمكن حذف أمر بيع مرتبط بفواتير",
      };
    }

    if (existing.status !== SalesOrderStatus.DRAFT) {
      return {
        ok: false,
        error: "CANNOT_DELETE_NON_DRAFT: لا يمكن حذف أمر بيع مؤكد أو منفذ",
      };
    }

    await db.$transaction(async (tx) => {
      await tx.salesOrderItem.deleteMany({ where: { orderId: id } });
      await tx.salesOrder.delete({ where: { id } });
    });

    await logAudit({
      action: "ORDER_DELETE",
      entity: "SalesOrder",
      entityId: id,
      userId: currentUser.id,
      before: { orderNumber: existing.orderNumber, total: Number(existing.total) },
    });

    revalidatePath("/sales/orders");

    return { ok: true, data: { id } };
  } catch (error) {
    logger.error({ err: error }, "deleteOrderAction error:");
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}
