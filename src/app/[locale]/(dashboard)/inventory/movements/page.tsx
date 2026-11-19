import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import {
  MovementLedgerTable,
  type StockMovementItem,
} from "@/features/inventory/components/movement-ledger-table";
import { getMovementLedger } from "@/features/inventory/queries/stock";
import { getWarehouses } from "@/features/inventory/queries/warehouses";
import { StockMovementType } from "@prisma/client";

export const metadata: Metadata = {
  title: "سجل حركات المخزون | Masar ERP",
};

interface MovementsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    q?: string;
    productId?: string;
    warehouse?: string;
    type?: string;
    fromDate?: string;
    toDate?: string;
  }>;
}

export default async function MovementsPage({
  params,
  searchParams,
}: MovementsPageProps) {
  const { locale } = await params;
  const sParams = await searchParams;
  const t = await getTranslations("inventory.movements");

  const page = Number(sParams.page || "1");
  const pageSize = Number(sParams.pageSize || "25");
  const search = sParams.q || "";
  const productId = sParams.productId;
  const warehouseId = sParams.warehouse;
  const type = sParams.type as StockMovementType | "all" | undefined;
  const fromDate = sParams.fromDate;
  const toDate = sParams.toDate;

  const [ledgerData, warehouses] = await Promise.all([
    getMovementLedger({
      page,
      pageSize,
      search,
      productId,
      warehouseId,
      type,
      fromDate,
      toDate,
    }),
    getWarehouses(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
      />

      <MovementLedgerTable
        data={ledgerData.items as StockMovementItem[]}
        totalCount={ledgerData.pagination.total}
        pageCount={ledgerData.pagination.totalPages}
        warehouses={warehouses.map((w) => ({ id: w.id, name: w.name, code: w.code }))}
        selectedWarehouse={warehouseId}
        selectedType={type}
        locale={locale}
      />
    </div>
  );
}
