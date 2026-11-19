import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { UnitsTable } from "@/features/inventory/components/units-table";
import { getUnits } from "@/features/inventory/queries/units";

export const metadata: Metadata = {
  title: "وحدات القياس | Masar ERP",
};

export default async function UnitsPage() {
  const t = await getTranslations("inventory.units");
  const units = await getUnits();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
      />

      <UnitsTable units={units} />
    </div>
  );
}
