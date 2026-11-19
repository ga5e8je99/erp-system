import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { WarehousesTable } from "@/features/inventory/components/warehouses-table";
import { getWarehouses } from "@/features/inventory/queries/warehouses";

export const metadata: Metadata = {
  title: "المستودعات والفروع | Masar ERP",
};

export default async function WarehousesPage() {
  const t = await getTranslations("inventory.warehouses");
  const warehouses = await getWarehouses();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
      />

      <WarehousesTable warehouses={warehouses} />
    </div>
  );
}
