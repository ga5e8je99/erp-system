import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { getGeneralLedgerReport } from "@/features/accounting/services/reports-service";
import { getFlatAccountsList } from "@/features/accounting/services/accounting-service";
import { GeneralLedgerReportView } from "@/features/accounting/components/general-ledger-report-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("accounting.reports");
  return {
    title: `${t("generalLedgerTitle")} | Masar ERP`,
  };
}

interface PageProps {
  searchParams: Promise<{
    accountId?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function GeneralLedgerPage({ searchParams }: PageProps) {
  await requirePermission("reports.financial.view");

  const resolved = await searchParams;
  const [report, accounts] = await Promise.all([
    getGeneralLedgerReport({
      accountId: resolved.accountId,
      startDate: resolved.startDate,
      endDate: resolved.endDate,
    }),
    getFlatAccountsList({ postableOnly: true }),
  ]);

  return (
    <GeneralLedgerReportView
      report={report}
      accounts={accounts}
      selectedAccountId={resolved.accountId}
      startDate={resolved.startDate}
      endDate={resolved.endDate}
    />
  );
}
