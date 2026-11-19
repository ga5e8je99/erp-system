import { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requirePermission, hasPermission } from "@/lib/rbac";
import { getPayslipById } from "@/features/hr/services/payroll-service";
import { getCompanySettingsForPrint } from "@/features/hr/queries";
import { PayslipPrintView } from "@/features/hr/components/payslip-print-view";

interface PayslipPrintPageProps {
  params: Promise<{
    locale: string;
    id: string;
    slipId: string;
  }>;
}

export async function generateMetadata({
  params,
}: PayslipPrintPageProps): Promise<Metadata> {
  const { slipId } = await params;
  const payslip = await getPayslipById(slipId);
  if (!payslip) return { title: "مفردات المرتب غير موجودة | Masar ERP" };

  return {
    title: `مفردات مرتب ${payslip.employee.fullName} (${payslip.payrollRun.month}/${payslip.payrollRun.year}) | Masar ERP`,
    description: "طباعة مفردات المرتب الرسمية",
  };
}

export default async function PayslipPrintPage({
  params,
}: PayslipPrintPageProps) {
  const { slipId } = await params;
  const session = await auth();
  await requirePermission("hr.payroll.manage");

  const payslip = await getPayslipById(slipId);
  if (!payslip) {
    notFound();
  }

  const canViewSalary = hasPermission(session, "hr.salary.view");
  const companySettings = await getCompanySettingsForPrint();

  return (
    <div className="py-4">
      <PayslipPrintView
        payslip={payslip}
        companySettings={companySettings}
        canViewSalary={canViewSalary}
      />
    </div>
  );
}
