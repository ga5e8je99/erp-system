"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  generateSystemNotifications,
} from "../services/notification-service";
import { NotificationType } from "@prisma/client";
import { toSafeError } from "@/lib/safe-error";

export async function fetchNotificationsAction(filter?: {
  type?: NotificationType;
  unreadOnly?: boolean;
  limit?: number;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "UNAUTHORIZED: يرجى تسجيل الدخول" };
    }
    const userId = session.user.id;

    const [items, unreadCount] = await Promise.all([
      getUserNotifications(userId, filter),
      getUnreadNotificationCount(userId),
    ]);

    return {
      ok: true,
      data: {
        items,
        unreadCount,
      },
    };
  } catch (error: unknown) {
    return { ok: false, error: toSafeError(error, "فشل جلب الإشعارات") };
  }
}

export async function markNotificationReadAction(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "UNAUTHORIZED: يرجى تسجيل الدخول" };
    }
    const userId = session.user.id;

    await markNotificationAsRead(id, userId);

    revalidatePath("/notifications");
    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, error: toSafeError(error, "فشل تحديث الإشعار") };
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "UNAUTHORIZED: يرجى تسجيل الدخول" };
    }
    const userId = session.user.id;

    await markAllNotificationsAsRead(userId);

    revalidatePath("/notifications");
    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, error: toSafeError(error, "فشل تحديث الإشعارات") };
  }
}

export async function deleteNotificationAction(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "UNAUTHORIZED: يرجى تسجيل الدخول" };
    }
    const userId = session.user.id;

    await deleteNotification(id, userId);

    revalidatePath("/notifications");
    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, error: toSafeError(error, "فشل حذف الإشعار") };
  }
}

export async function triggerSystemNotificationScanAction() {
  try {
    // Only administrators or managers can trigger system-wide scanning
    await requirePermission("company.settings.manage");

    const counts = await generateSystemNotifications();
    revalidatePath("/notifications");
    return { ok: true, data: counts };
  } catch (error: unknown) {
    return { ok: false, error: toSafeError(error, "فشل فحص الإشعارات التلقائية") };
  }
}
