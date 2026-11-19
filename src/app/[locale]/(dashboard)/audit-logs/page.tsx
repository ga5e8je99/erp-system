import React from "react";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import {
  getAuditLogs,
  getAuditFilterOptions,
} from "@/features/audit/services/audit-service";
import { AuditLogTable } from "@/features/audit/components/audit-log-table";

interface AuditLogsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    search?: string;
    userId?: string;
    entity?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function AuditLogsPage({
  params,
  searchParams,
}: AuditLogsPageProps) {
  const { locale } = await params;
  const sParams = await searchParams;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Permission Gate: auth.audit.view or auth.user.manage
  if (
    !hasPermission(session, "auth.audit.view") &&
    !hasPermission(session, "auth.user.manage")
  ) {
    redirect(`/${locale}/forbidden`);
  }

  const isArabic = locale === "ar";

  const [auditData, filterOptions] = await Promise.all([
    getAuditLogs({
      page: sParams.page ? parseInt(sParams.page, 10) : 1,
      pageSize: 20,
      search: sParams.search,
      userId: sParams.userId,
      entity: sParams.entity,
      action: sParams.action,
      dateFrom: sParams.dateFrom,
      dateTo: sParams.dateTo,
    }),
    getAuditFilterOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div className="border-b pb-4 text-start">
        <h1 className="text-2xl font-bold tracking-tight">
          {isArabic ? "سجل العمليات والرقابة (Audit Log)" : "System Audit Logs"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isArabic
            ? "تتبع كافة التعديلات، الإضافات، والعمليات الحساسة في النظام مع إمكانية مقارنة الحالات السابقة واللاحقة (Diff)"
            : "Track system activities, sensitive mutations, and view before/after change snapshots."}
        </p>
      </div>

      <AuditLogTable
        logs={auditData.logs}
        pagination={auditData.pagination}
        filterOptions={filterOptions}
      />
    </div>
  );
}
