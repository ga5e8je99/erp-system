import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { requirePermission, hasPermission } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { getPayrollRuns } from "@/features/hr/services/payroll-service";
import { PayrollRunsTable } from "@/features/hr/components/payroll-runs-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hr.payroll");
  return {
    title: `${t("title")} | Masar ERP`,
    description: t("description"),
  };
}

export default async function PayrollPage() {
  const session = await auth();
  await requirePermission("hr.payroll.manage");
  const t = await getTranslations("hr.payroll");

  const canViewSalary = hasPermission(session, "hr.salary.view");
  const canManage = hasPermission(session, "hr.payroll.manage");

  const runs = await getPayrollRuns();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      <PayrollRunsTable
        runs={runs}
        canViewSalary={canViewSalary}
        canManage={canManage}
      />
    </div>
  );
}
