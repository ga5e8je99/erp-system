"use client";

import * as React from "react";
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Info,
  ExternalLink,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  fetchNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/features/notifications/actions/notification-actions";
import { NotificationType } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { arSA, enUS } from "date-fns/locale";

interface NotificationItemData {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  link: string | null;
  isRead: boolean;
  createdAt: Date | string;
}

export function NotificationsBell() {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<NotificationItemData[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isOpen, setIsOpen] = React.useState(false);

  const loadNotifications = React.useCallback(async () => {
    try {
      const res = await fetchNotificationsAction({ limit: 10 });
      if (res.ok && res.data) {
        setNotifications(res.data.items as unknown as NotificationItemData[]);
        setUnreadCount(res.data.unreadCount);
      }
    } catch {
      // Ignore network errors in header widget
    }
  }, []);

  React.useEffect(() => {
    loadNotifications();
    // Poll every 60s
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await markAllNotificationsReadAction();
  };

  const handleNotificationClick = async (item: NotificationItemData) => {
    if (!item.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      await markNotificationReadAction(item.id);
    }
    setIsOpen(false);
    if (item.link) {
      router.push(item.link);
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "LOW_STOCK":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "OVERDUE_INVOICE":
        return <AlertCircle className="h-4 w-4 text-rose-500" />;
      case "LEAVE_REQUEST":
        return <Calendar className="h-4 w-4 text-sky-500" />;
      case "APPROVAL":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "WARNING":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "ERROR":
        return <AlertCircle className="h-4 w-4 text-rose-500" />;
      case "SUCCESS":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "INFO":
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const formatTime = (dateInput: Date | string) => {
    try {
      const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: locale === "ar" ? arSA : enUS,
      });
    } catch {
      return "";
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
            aria-label={t("title")}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute end-1.5 top-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80 p-0 sm:w-96">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {t("title")}
            </span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-medium">
                {t("unreadCount", { count: unreadCount })}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="me-1 h-3.5 w-3.5" />
              {t("markAllRead")}
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              {t("empty")}
            </div>
          ) : (
            notifications.map((item) => (
              <DropdownMenuItem
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`flex items-start gap-3 p-3 transition-colors cursor-pointer ${
                  !item.isRead ? "bg-accent/40 font-medium" : ""
                }`}
              >
                <div className="mt-0.5 rounded-full bg-background p-1.5 shadow-xs border border-border shrink-0">
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 space-y-1 overflow-hidden">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {item.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatTime(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {item.message}
                  </p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>

        <div className="border-t border-border p-2 text-center">
          <Button asChild variant="ghost" size="sm" className="w-full text-xs text-primary justify-center">
            <Link href="/notifications" onClick={() => setIsOpen(false)}>
              <span>{t("viewAll")}</span>
              <ExternalLink className="ms-1.5 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
