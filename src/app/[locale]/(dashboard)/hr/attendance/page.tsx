import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { requirePermission, hasPermission } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { db } from "@/lib/db";
import { EmployeeStatus } from "@prisma/client";
import { getDailyAttendance } from "@/features/hr/services/attendance-service";
import { AttendanceDailySheet } from "@/features/hr/components/attendance-daily-sheet";

interface AttendancePageProps {
  searchParams: Promise<{
    date?: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hr.attendance");
  return {
    title: `${t("title")} | Masar ERP`,
    description: t("description"),
  };
}

export default async function AttendancePage({
  searchParams,
}: AttendancePageProps) {
  const session = await auth();
  await requirePermission("hr.attendance.manage");
  const t = await getTranslations("hr.attendance");
  const canManage = hasPermission(session, "hr.attendance.manage");

  const { date } = await searchParams;
  const targetDateStr = date || new Date().toISOString().slice(0, 10);
  const targetDate = new Date(targetDateStr);

  const [dailyRows, activeEmployees] = await Promise.all([
    getDailyAttendance(targetDate),
    db.employee.findMany({
      where: { deletedAt: null, status: EmployeeStatus.ACTIVE },
      select: { id: true, fullName: true, code: true },
      orderBy: { code: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      <AttendanceDailySheet
        initialDate={targetDateStr}
        initialRows={dailyRows}
        employees={activeEmployees.map((e) => ({
          id: e.id,
          name: e.fullName,
          code: e.code,
        }))}
        canManage={canManage}
      />
    </div>
  );
}
