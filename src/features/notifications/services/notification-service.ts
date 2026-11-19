import { db } from "@/lib/db";
import { NotificationType, Prisma } from "@prisma/client";
import { NotificationFilter } from "../types";

/**
 * Fetch notifications for a user (including global broadcast notifications)
 */
export async function getUserNotifications(
  userId?: string | null,
  filter?: NotificationFilter
) {
  const where: Prisma.NotificationWhereInput = {
    OR: [
      { userId: null },
      ...(userId ? [{ userId }] : []),
    ],
  };

  if (filter?.type) {
    where.type = filter.type;
  }

  if (filter?.unreadOnly) {
    where.isRead = false;
  }

  const notifications = await db.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filter?.limit ?? 50,
  });

  return notifications;
}

/**
 * Get count of unread notifications for a user
 */
export async function getUnreadNotificationCount(userId?: string | null): Promise<number> {
  return db.notification.count({
    where: {
      OR: [
        { userId: null },
        ...(userId ? [{ userId }] : []),
      ],
      isRead: false,
    },
  });
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(id: string, userId?: string | null) {
  return db.notification.updateMany({
    where: {
      id,
      OR: [
        { userId: null },
        ...(userId ? [{ userId }] : []),
      ],
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

/**
 * Mark all unread notifications as read
 */
export async function markAllNotificationsAsRead(userId?: string | null) {
  return db.notification.updateMany({
    where: {
      OR: [
        { userId: null },
        ...(userId ? [{ userId }] : []),
      ],
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

/**
 * Delete a notification
 */
export async function deleteNotification(id: string, userId?: string | null) {
  return db.notification.deleteMany({
    where: {
      id,
      OR: [
        { userId: null },
        ...(userId ? [{ userId }] : []),
      ],
    },
  });
}

/**
 * Scans system state and generates notifications for:
 * 1. Low stock products
 * 2. Overdue sales invoices
 * 3. Pending leave requests
 * Deduplicates to prevent spamming within 24 hours.
 */
export async function generateSystemNotifications(): Promise<{
  lowStockCount: number;
  overdueCount: number;
  leaveRequestCount: number;
}> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const now = new Date();

  let lowStockCount = 0;
  let overdueCount = 0;
  let leaveRequestCount = 0;

  // 1. Check Low Stock Items (bounded)
  const products = await db.product.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      trackStock: true,
    },
    take: 200,
    include: {
      stockLevels: true,
      unit: true,
    },
  });

  for (const product of products) {
    const totalQty = product.stockLevels.reduce(
      (sum, sl) => sum + Number(sl.quantity),
      0
    );

    if (totalQty <= product.reorderLevel) {
      // Check if notification exists for this product in past 24h
      const existing = await db.notification.findFirst({
        where: {
          type: NotificationType.LOW_STOCK,
          createdAt: { gte: oneDayAgo },
          metadata: {
            path: ["productId"],
            equals: product.id,
          },
        },
      });

      if (!existing) {
        await db.notification.create({
          data: {
            title: `تنبيه نقص مخزون: ${product.name}`,
            message: `الرصيد الحالي (${totalQty} ${product.unit?.symbol || ""}) وصل أو قل عن حد إعادة الطلب (${product.reorderLevel}).`,
            type: NotificationType.LOW_STOCK,
            link: `/inventory/products/${product.id}`,
            metadata: {
              productId: product.id,
              currentStock: totalQty,
              reorderLevel: product.reorderLevel,
            },
          },
        });
        lowStockCount++;
      }
    }
  }

  // 2. Check Overdue Invoices (bounded)
  const overdueInvoices = await db.salesInvoice.findMany({
    where: {
      status: { in: ["ISSUED", "PARTIALLY_PAID"] },
      dueDate: { lt: now },
    },
    take: 100,
    include: {
      customer: true,
    },
  });

  for (const inv of overdueInvoices) {
    const remaining = Number(inv.total) - Number(inv.paidAmount);
    if (remaining > 0) {
      const existing = await db.notification.findFirst({
        where: {
          type: NotificationType.OVERDUE_INVOICE,
          createdAt: { gte: oneDayAgo },
          metadata: {
            path: ["invoiceId"],
            equals: inv.id,
          },
        },
      });

      if (!existing) {
        await db.notification.create({
          data: {
            title: `فاتورة مبيعات مستحقة: ${inv.invoiceNumber}`,
            message: `فاتورة العميل (${inv.customer.name}) بقيمة متبقية ${remaining.toLocaleString("en-US", { minimumFractionDigits: 2 })} تجاوزت تاريخ الاستحقاق (${inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : ""}).`,
            type: NotificationType.OVERDUE_INVOICE,
            link: `/sales/invoices/${inv.id}`,
            metadata: {
              invoiceId: inv.id,
              invoiceNumber: inv.invoiceNumber,
              remainingBalance: remaining,
            },
          },
        });
        overdueCount++;
      }
    }
  }

  // 3. Check Pending Leave Requests (bounded)
  const pendingLeaves = await db.leaveRequest.findMany({
    where: {
      status: "PENDING",
    },
    take: 100,
    include: {
      employee: true,
      leaveType: true,
    },
  });

  for (const leave of pendingLeaves) {
    const existing = await db.notification.findFirst({
      where: {
        type: NotificationType.LEAVE_REQUEST,
        createdAt: { gte: oneDayAgo },
        metadata: {
          path: ["leaveRequestId"],
          equals: leave.id,
        },
      },
    });

    if (!existing) {
      const days =
        Math.ceil(
          (new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1;

      await db.notification.create({
        data: {
          title: `طلب إجازة معلق: ${leave.employee.fullName}`,
          message: `طلب إجازة (${leave.leaveType.name}) لمدة ${days} يوم ابتداءً من ${new Date(leave.startDate).toISOString().slice(0, 10)} بانتظار الاعتماد.`,
          type: NotificationType.LEAVE_REQUEST,
          link: "/hr/leave",
          metadata: {
            leaveRequestId: leave.id,
            employeeId: leave.employeeId,
          },
        },
      });
      leaveRequestCount++;
    }
  }

  return { lowStockCount, overdueCount, leaveRequestCount };
}
