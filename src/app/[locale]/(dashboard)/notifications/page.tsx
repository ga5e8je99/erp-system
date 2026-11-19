import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getUserNotifications } from "@/features/notifications/services/notification-service";
import { NotificationsPageView } from "@/features/notifications/components/notifications-page-view";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "الإشعارات والتنبيهات | Masar ERP",
};

interface NotificationsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NotificationsPage({ params }: NotificationsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const notifications = await getUserNotifications(userId, { limit: 100 });

  return (
    <NotificationsPageView
      initialNotifications={JSON.parse(JSON.stringify(notifications))}
    />
  );
}
