import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { getTaxSummaryReport } from "@/features/accounting/services/reports-service";
import { TaxSummaryReportView } from "@/features/accounting/components/tax-summary-report-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("accounting.reports");
  return {
    title: `${t("taxSummaryTitle")} | Masar ERP`,
  };
}

interface PageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function TaxSummaryPage({ searchParams }: PageProps) {
  await requirePermission("reports.financial.view");

  const resolved = await searchParams;
  const report = await getTaxSummaryReport({
    startDate: resolved.startDate,
    endDate: resolved.endDate,
  });

  return (
    <TaxSummaryReportView
      report={report}
      startDate={resolved.startDate}
      endDate={resolved.endDate}
    />
  );
}
