import { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requirePermission, hasPermission } from "@/lib/rbac";
import { getPayrollRunById } from "@/features/hr/services/payroll-service";
import { getPaymentAccounts } from "@/features/hr/queries";
import { PayrollRunDetailView } from "@/features/hr/components/payroll-run-detail-view";

interface PayrollRunDetailPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: PayrollRunDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const run = await getPayrollRunById(id);
  if (!run) return { title: "مسير الرواتب غير موجود | Masar ERP" };

  return {
    title: `مسير رواتب ${run.runNumber} (${run.month}/${run.year}) | Masar ERP`,
    description: `مراجعة واعتماد وصرف مسير الرواتب الشهري`,
  };
}

export default async function PayrollRunDetailPage({
  params,
}: PayrollRunDetailPageProps) {
  const { id } = await params;
  const session = await auth();
  await requirePermission("hr.payroll.manage");

  const run = await getPayrollRunById(id);
  if (!run) {
    notFound();
  }

  const canViewSalary = hasPermission(session, "hr.salary.view");
  const canManage = hasPermission(session, "hr.payroll.manage");

  const paymentAccounts = await getPaymentAccounts();

  return (
    <div className="space-y-6">
      <PayrollRunDetailView
        run={run}
        paymentAccounts={paymentAccounts.map((a) => ({
          id: a.id,
          code: a.code,
          name: a.name,
        }))}
        canViewSalary={canViewSalary}
        canManage={canManage}
      />
    </div>
  );
}
