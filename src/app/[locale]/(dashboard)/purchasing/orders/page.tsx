import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { getPurchaseOrders } from "@/features/purchasing/queries/orders";
import { PurchaseOrdersTable } from "@/features/purchasing/components/purchase-orders-table";
import { PurchaseOrderStatus } from "@prisma/client";

interface OrdersPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function PurchaseOrdersPage({
  searchParams,
}: OrdersPageProps) {
  await requirePermission("purchasing.order.view");
  const t = await getTranslations("purchasing.orders");

  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const pageSize = Number(resolvedParams.pageSize) || 20;
  const search = resolvedParams.search;
  const status = resolvedParams.status as PurchaseOrderStatus | "ALL" | undefined;

  const result = await getPurchaseOrders({ page, pageSize, search, status });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <PurchaseOrdersTable
        data={result.items}
        pageCount={result.pagination.totalPages}
        totalRecords={result.pagination.total}
      />
    </div>
  );
}
