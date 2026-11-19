import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { requirePermission, hasPermission } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { db } from "@/lib/db";
import { getEmployees } from "@/features/hr/services/employee-service";
import { getDepartments, getPositions } from "@/features/hr/services/department-service";
import { EmployeesTable } from "@/features/hr/components/employees-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hr.employees");
  return {
    title: `${t("title")} | Masar ERP`,
    description: t("description"),
  };
}

export default async function EmployeesPage() {
  const session = await auth();
  await requirePermission("hr.employee.view");
  const t = await getTranslations("hr.employees");

  const canViewSalary = hasPermission(session, "hr.salary.view");
  const canManage = hasPermission(session, "hr.employee.manage");

  const [employees, departments, positions, users] = await Promise.all([
    getEmployees(),
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
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      <EmployeesTable
        employees={employees}
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
