import { NotificationType } from "@prisma/client";

export type { NotificationType };

export interface NotificationItem {
  id: string;
  userId: string | null;
  title: string;
  message: string;
  type: NotificationType;
  link: string | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  metadata?: Record<string, unknown> | null;
}

export interface NotificationFilter {
  type?: NotificationType;
  unreadOnly?: boolean;
  limit?: number;
}
