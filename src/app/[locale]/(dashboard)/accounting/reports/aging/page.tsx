import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { getAgingReport } from "@/features/accounting/services/reports-service";
import { AgingReportView } from "@/features/accounting/components/aging-report-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("accounting.reports");
  return {
    title: `${t("agingTitle")} | Masar ERP`,
  };
}

interface PageProps {
  searchParams: Promise<{
    type?: "CUSTOMERS" | "SUPPLIERS";
    asOfDate?: string;
  }>;
}

export default async function AgingPage({ searchParams }: PageProps) {
  await requirePermission("reports.financial.view");

  const resolved = await searchParams;
  const type = resolved.type === "SUPPLIERS" ? "SUPPLIERS" : "CUSTOMERS";
  const report = await getAgingReport({
    type,
    asOfDate: resolved.asOfDate,
  });

  return (
    <AgingReportView
      report={report}
      asOfDate={resolved.asOfDate}
    />
  );
}
