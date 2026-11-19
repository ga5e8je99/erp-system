import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { getTrialBalanceReport } from "@/features/accounting/services/reports-service";
import { TrialBalanceReportView } from "@/features/accounting/components/trial-balance-report-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("accounting.reports");
  return {
    title: `${t("trialBalanceTitle")} | Masar ERP`,
  };
}

interface PageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function TrialBalancePage({ searchParams }: PageProps) {
  await requirePermission("reports.financial.view");

  const resolved = await searchParams;
  const report = await getTrialBalanceReport({
    startDate: resolved.startDate,
    endDate: resolved.endDate,
  });

  return (
    <TrialBalanceReportView
      report={report}
      startDate={resolved.startDate}
      endDate={resolved.endDate}
    />
  );
}
