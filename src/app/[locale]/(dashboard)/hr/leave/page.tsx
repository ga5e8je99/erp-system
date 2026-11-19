import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { requirePermission, hasPermission } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { db } from "@/lib/db";
import { EmployeeStatus } from "@prisma/client";
import { getLeaveRequests, getLeaveTypes } from "@/features/hr/services/leave-service";
import { LeaveRequestsTable } from "@/features/hr/components/leave-requests-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hr.leave");
  return {
    title: `${t("title")} | Masar ERP`,
    description: t("description"),
  };
}

export default async function LeavePage() {
  const session = await auth();
  await requirePermission("hr.leave.manage");
  const t = await getTranslations("hr.leave");
  const canManage = hasPermission(session, "hr.leave.manage");

  const [leaveRequests, leaveTypes, activeEmployees] = await Promise.all([
    getLeaveRequests(),
    getLeaveTypes(),
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

      <LeaveRequestsTable
        leaveRequests={leaveRequests}
        leaveTypes={leaveTypes}
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
