import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { getBalanceSheetReport } from "@/features/accounting/services/reports-service";
import { BalanceSheetReportView } from "@/features/accounting/components/balance-sheet-report-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("accounting.reports");
  return {
    title: `${t("balanceSheetTitle")} | Masar ERP`,
  };
}

interface PageProps {
  searchParams: Promise<{
    asOfDate?: string;
  }>;
}

export default async function BalanceSheetPage({ searchParams }: PageProps) {
  await requirePermission("reports.financial.view");

  const resolved = await searchParams;
  const report = await getBalanceSheetReport({
    asOfDate: resolved.asOfDate,
  });

  return (
    <BalanceSheetReportView
      report={report}
      asOfDate={resolved.asOfDate}
    />
  );
}
