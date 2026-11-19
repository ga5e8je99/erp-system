"use client";

import * as React from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Info,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
  deleteNotificationAction,
  triggerSystemNotificationScanAction,
} from "../actions/notification-actions";
import { NotificationType } from "@prisma/client";
import { formatDistanceToNow, format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { toast } from "sonner";

interface NotificationItemData {
  id: string;
  userId: string | null;
  title: string;
  message: string;
  type: NotificationType;
  link: string | null;
  isRead: boolean;
  readAt: Date | string | null;
  createdAt: Date | string;
}

interface NotificationsPageViewProps {
  initialNotifications: NotificationItemData[];
}

export function NotificationsPageView({ initialNotifications }: NotificationsPageViewProps) {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const [items, setItems] = React.useState<NotificationItemData[]>(initialNotifications);
  const [activeTab, setActiveTab] = React.useState<string>("all");
  const [isScanning, setIsScanning] = React.useState(false);

  const unreadCount = items.filter((n) => !n.isRead).length;

  const handleMarkRead = async (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );
    await markNotificationReadAction(id);
    toast.success(locale === "ar" ? "تم تحديد الإشعار كمقروء" : "Notification marked as read");
  };

  const handleMarkAllRead = async () => {
    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    await markAllNotificationsReadAction();
    toast.success(locale === "ar" ? "تم تحديد جميع الإشعارات كمقروءة" : "All notifications marked as read");
  };

  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    await deleteNotificationAction(id);
    toast.info(locale === "ar" ? "تم حذف الإشعار" : "Notification deleted");
  };

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const res = await triggerSystemNotificationScanAction();
      if (res.ok && res.data) {
        const total = res.data.lowStockCount + res.data.overdueCount + res.data.leaveRequestCount;
        toast.success(
          locale === "ar"
            ? `اكتمل الفحص: تم إنشاء ${total} إشعار جديد`
            : `Scan complete: ${total} new notifications generated`
        );
        window.location.reload();
      } else {
        toast.error(res.error || "Failed scan");
      }
    } catch {
      toast.error(locale === "ar" ? "فشل تنفيذ الفحص" : "Scan failed");
    } finally {
      setIsScanning(false);
    }
  };

  const filteredItems = React.useMemo(() => {
    switch (activeTab) {
      case "unread":
        return items.filter((n) => !n.isRead);
      case "stock":
        return items.filter((n) => n.type === "LOW_STOCK");
      case "invoices":
        return items.filter((n) => n.type === "OVERDUE_INVOICE");
      case "hr":
        return items.filter((n) => n.type === "LEAVE_REQUEST" || n.type === "APPROVAL");
      case "all":
      default:
        return items;
    }
  }, [items, activeTab]);

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "LOW_STOCK":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "OVERDUE_INVOICE":
        return <AlertCircle className="h-5 w-5 text-rose-500" />;
      case "LEAVE_REQUEST":
        return <Calendar className="h-5 w-5 text-sky-500" />;
      case "APPROVAL":
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case "WARNING":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "ERROR":
        return <AlertCircle className="h-5 w-5 text-rose-500" />;
      case "SUCCESS":
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case "INFO":
      default:
        return <Info className="h-5 w-5 text-primary" />;
    }
  };

  const formatRelative = (dInput: Date | string) => {
    try {
      const d = typeof dInput === "string" ? new Date(dInput) : dInput;
      return formatDistanceToNow(d, {
        addSuffix: true,
        locale: locale === "ar" ? arSA : enUS,
      });
    } catch {
      return "";
    }
  };

  const formatAbsolute = (dInput: Date | string) => {
    try {
      const d = typeof dInput === "string" ? new Date(dInput) : dInput;
      return format(d, "yyyy-MM-dd HH:mm", {
        locale: locale === "ar" ? arSA : enUS,
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {locale === "ar" ? "مركز الإشعارات والتنبيهات" : "Notifications Center"}
            </h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="font-semibold">
                {unreadCount} {locale === "ar" ? "جديد" : "new"}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {locale === "ar"
              ? "متابعة تنبيهات المخزون المنخفض، الفواتير المتأخرة، وطلبات الإجازات"
              : "Track low-stock alerts, overdue invoices, and employee leave requests"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleScan}
            disabled={isScanning}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isScanning ? "animate-spin" : ""}`} />
            <span>{locale === "ar" ? "فحص النظام الآن" : "Scan System Now"}</span>
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleMarkAllRead}
              className="gap-2"
            >
              <CheckCheck className="h-4 w-4" />
              <span>{t("markAllRead")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Filter */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 h-auto p-1">
          <TabsTrigger value="all" className="text-xs py-2">
            {locale === "ar" ? "الكل" : "All"} ({items.length})
          </TabsTrigger>
          <TabsTrigger value="unread" className="text-xs py-2">
            {locale === "ar" ? "غير المقروءة" : "Unread"} ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="stock" className="text-xs py-2">
            {locale === "ar" ? "تنبيهات المخزون" : "Stock"} (
            {items.filter((n) => n.type === "LOW_STOCK").length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs py-2">
            {locale === "ar" ? "الفواتير المتأخرة" : "Overdue"} (
            {items.filter((n) => n.type === "OVERDUE_INVOICE").length})
          </TabsTrigger>
          <TabsTrigger value="hr" className="text-xs py-2">
            {locale === "ar" ? "الموارد البشرية" : "HR"} (
            {items.filter((n) => n.type === "LEAVE_REQUEST" || n.type === "APPROVAL").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Notifications List */}
      <Card>
        <CardContent className="p-0 divide-y divide-border">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold">{t("empty")}</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {locale === "ar"
                  ? "لا توجد إشعارات تطابق التصفية الحالية. سيتم تنبيهك تلقائياً عند وجود أي أحداث جديدة."
                  : "No notifications match this filter. You will be automatically notified when new events occur."}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/40 ${
                  !item.isRead ? "bg-primary/5 font-medium" : ""
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 rounded-full bg-background p-2 shadow-xs border border-border shrink-0">
                    {getIcon(item.type)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {item.title}
                      </span>
                      {!item.isRead && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">
                          {locale === "ar" ? "جديد" : "New"}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        • {formatRelative(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                      {item.message}
                    </p>
                    <div className="text-[11px] text-muted-foreground/75">
                      {formatAbsolute(item.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {item.link && (
                    <Button asChild variant="outline" size="xs" className="h-8 gap-1.5 text-xs">
                      <Link href={item.link}>
                        <span>{locale === "ar" ? "فتح السجل" : "View"}</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                  {!item.isRead && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleMarkRead(item.id)}
                      title={locale === "ar" ? "تحديد كمقروء" : "Mark as read"}
                    >
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(item.id)}
                    title={locale === "ar" ? "حذف الإشعار" : "Delete"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
