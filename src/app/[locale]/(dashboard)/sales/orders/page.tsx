import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { getOrders } from "@/features/sales/queries/orders";
import { getWarehousesForSelect } from "@/features/inventory/queries/warehouses";
import { OrdersTable } from "@/features/sales/components/orders-table";
import { SalesOrderStatus } from "@prisma/client";

interface OrdersPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  await requirePermission("sales.order.view");
  const t = await getTranslations("sales.orders");

  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const pageSize = Number(resolvedParams.pageSize) || 20;
  const search = resolvedParams.search;
  const status = resolvedParams.status as SalesOrderStatus | "all" | undefined;

  const [ordersResult, warehouses] = await Promise.all([
    getOrders({ page, pageSize, search, status }),
    getWarehousesForSelect(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
      />

      <OrdersTable
        data={ordersResult.items}
        warehouses={warehouses}
        pageCount={ordersResult.pagination.totalPages}
        currentPage={ordersResult.pagination.page}
        pageSize={ordersResult.pagination.pageSize}
        totalRecords={ordersResult.pagination.total}
      />
    </div>
  );
}
