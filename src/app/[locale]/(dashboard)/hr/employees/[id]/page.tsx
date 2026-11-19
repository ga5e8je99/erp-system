import { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requirePermission, hasPermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getEmployeeById } from "@/features/hr/services/employee-service";
import { getEmployeeLeaveBalance } from "@/features/hr/services/leave-service";
import { getDepartments, getPositions } from "@/features/hr/services/department-service";
import { EmployeeDetailView } from "@/features/hr/components/employee-detail-view";

interface EmployeeDetailPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: EmployeeDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const employee = await getEmployeeById(id);
  if (!employee) return { title: "الموظف غير موجود | Masar ERP" };

  return {
    title: `${employee.fullName} (${employee.code}) | Masar ERP`,
    description: `ملف الموظف وبيانات الحضور والإجازات والرواتب`,
  };
}

export default async function EmployeeDetailPage({
  params,
}: EmployeeDetailPageProps) {
  const { id } = await params;
  const session = await auth();
  await requirePermission("hr.employee.view");

  const employee = await getEmployeeById(id);
  if (!employee) {
    notFound();
  }

  const canViewSalary = hasPermission(session, "hr.salary.view");
  const canManage = hasPermission(session, "hr.employee.manage");

  const [leaveBalances, departments, positions, users] = await Promise.all([
    getEmployeeLeaveBalance(employee.id),
    getDepartments(),
    getPositions(),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <EmployeeDetailView
        employee={employee}
        leaveBalances={leaveBalances}
        departments={departments.map((d) => ({ id: d.id, name: d.name }))}
        positions={positions.map((p) => ({
          id: p.id,
          title: p.title,
          departmentId: p.departmentId,
        }))}
        users={users}
        canViewSalary={canViewSalary}
        canManage={canManage}
      />
    </div>
  );
}
