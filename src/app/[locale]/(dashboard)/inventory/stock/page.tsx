import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { StockOverviewTable } from "@/features/inventory/components/stock-overview-table";
import { getStockOverview } from "@/features/inventory/queries/stock";
import { getWarehouses } from "@/features/inventory/queries/warehouses";

export const metadata: Metadata = {
  title: "أرصدة المخزون | Masar ERP",
};

interface StockPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    q?: string;
    warehouse?: string;
    lowStock?: string;
  }>;
}

export default async function StockPage({ searchParams }: StockPageProps) {
  const params = await searchParams;
  const t = await getTranslations("inventory.stock");

  const page = Number(params.page || "1");
  const pageSize = Number(params.pageSize || "10");
  const search = params.q || "";
  const warehouseId = params.warehouse;
  const lowStockOnly = params.lowStock === "true";

  const [stockData, warehouses] = await Promise.all([
    getStockOverview({
      page,
      pageSize,
      search,
      warehouseId,
      lowStockOnly,
    }),
    getWarehouses(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
      />

      <StockOverviewTable
        data={stockData.items}
        totalCount={stockData.pagination.total}
        pageCount={stockData.pagination.totalPages}
        warehouses={warehouses.map((w) => ({ id: w.id, name: w.name, code: w.code }))}
        selectedWarehouse={warehouseId}
        lowStockOnly={lowStockOnly}
      />
    </div>
  );
}
