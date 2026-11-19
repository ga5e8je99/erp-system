import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { getHrAttendanceSummaryReport } from "@/features/reports/queries/report-queries";
import { HrAttendanceView } from "@/features/reports/components/hr-attendance-view";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "تقرير ملخص حضور الموظفين | Masar ERP",
};

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; to?: string; search?: string; departmentId?: string }>;
}

export default async function HrAttendancePage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("hr.employee.view");

  const resolvedFilters = await searchParams;
  const data = await getHrAttendanceSummaryReport(resolvedFilters);

  return <HrAttendanceView data={data} />;
}
