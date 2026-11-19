import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { getProfitLossReport } from "@/features/accounting/services/reports-service";
import { ProfitLossReportView } from "@/features/accounting/components/profit-loss-report-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("accounting.reports");
  return {
    title: `${t("profitLossTitle")} | Masar ERP`,
  };
}

interface PageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function ProfitLossPage({ searchParams }: PageProps) {
  await requirePermission("reports.financial.view");

  const resolved = await searchParams;
  const report = await getProfitLossReport({
    startDate: resolved.startDate,
    endDate: resolved.endDate,
  });

  return (
    <ProfitLossReportView
      report={report}
      startDate={resolved.startDate}
      endDate={resolved.endDate}
    />
  );
}
