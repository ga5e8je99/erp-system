import React, { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { DateRangeFilter } from "@/features/dashboard/components/date-range-filter";
import { DashboardContent } from "@/features/dashboard/components/dashboard-content";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "لوحة التحكم الرئيسية | Masar ERP",
};

interface DashboardPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    period?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function DashboardPage({
  params,
  searchParams,
}: DashboardPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const resolvedSearchParams = await searchParams;
  const session = await auth();
  const isArabic = locale === "ar";

  const userPermissions = (session?.user as { permissions?: string[] })?.permissions || [];
  const userRole = (session?.user as { role?: string })?.role || "User";

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">
              {isArabic ? "لوحة التحكم والعمليات" : "Executive Dashboard"}
            </h1>
            <Badge variant="outline" className="gap-1 px-2.5 py-0.5 text-xs">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span>{isArabic ? "نشط" : "Live"}</span>
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {userRole}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isArabic
              ? `أهلاً بك، ${session?.user?.name || "المستخدم"} • ملخص فوري لأداء المبيعات والمشتريات والسيولة والمخزون`
              : `Welcome back, ${session?.user?.name || "User"} • Real-time overview of sales, purchasing, cash & inventory`}
          </p>
        </div>

        {/* Global Date Filter */}
        <DateRangeFilter />
      </div>

      {/* Streaming Dashboard Content */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent
          searchParams={resolvedSearchParams}
          permissions={userPermissions}
          locale={locale}
        />
      </Suspense>
    </div>
  );
}
