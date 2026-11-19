import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import {
  MovementLedgerTable,
  type StockMovementItem,
} from "@/features/inventory/components/movement-ledger-table";
import { getMovementLedger } from "@/features/inventory/queries/stock";
import { getWarehouses } from "@/features/inventory/queries/warehouses";
import { StockAdjustmentTrigger } from "@/features/inventory/components/stock-adjustment-trigger";
import { StockMovementType } from "@prisma/client";

export const metadata: Metadata = {
  title: "تسويات المخزون | Masar ERP",
};

interface AdjustmentsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    q?: string;
    warehouse?: string;
  }>;
}

export default async function AdjustmentsPage({
  params,
  searchParams,
}: AdjustmentsPageProps) {
  const { locale } = await params;
  const sParams = await searchParams;
  const t = await getTranslations("inventory.adjustments");

  const page = Number(sParams.page || "1");
  const pageSize = Number(sParams.pageSize || "20");
  const search = sParams.q || "";
  const warehouseId = sParams.warehouse;

  const [ledgerData, warehouses] = await Promise.all([
    getMovementLedger({
      page,
      pageSize,
      search,
      warehouseId,
      type: StockMovementType.ADJUSTMENT,
    }),
    getWarehouses(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title={t("title")}
          description={t("subtitle")}
        />
        <StockAdjustmentTrigger
          warehouses={warehouses.map((w) => ({
            id: w.id,
            name: w.name,
            code: w.code,
          }))}
        />
      </div>

      <MovementLedgerTable
        data={ledgerData.items as StockMovementItem[]}
        totalCount={ledgerData.pagination.total}
        pageCount={ledgerData.pagination.totalPages}
        warehouses={warehouses.map((w) => ({ id: w.id, name: w.name, code: w.code }))}
        selectedWarehouse={warehouseId}
        selectedType={StockMovementType.ADJUSTMENT}
        locale={locale}
      />
    </div>
  );
}
