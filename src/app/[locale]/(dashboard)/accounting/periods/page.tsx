import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { listFiscalPeriods } from "@/features/accounting/services/accounting-service";
import { FiscalPeriodsTable } from "@/features/accounting/components/fiscal-periods-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("accounting.periods");
  return {
    title: `${t("title")} | Masar ERP`,
    description: t("description"),
  };
}

export default async function FiscalPeriodsPage() {
  await requirePermission("accounting.period.manage");
  const t = await getTranslations("accounting.periods");

  const periods = await listFiscalPeriods();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />
      <FiscalPeriodsTable periods={periods} />
    </div>
  );
}
