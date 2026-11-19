import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { getReturns } from "@/features/sales/queries/returns";
import { getWarehousesForSelect } from "@/features/inventory/queries/warehouses";
import { ReturnsTable } from "@/features/sales/components/returns-table";

interface ReturnsPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    customerId?: string;
  }>;
}

export default async function ReturnsPage({ searchParams }: ReturnsPageProps) {
  await requirePermission("sales.return.manage");
  const t = await getTranslations("sales.returns");

  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const pageSize = Number(resolvedParams.pageSize) || 20;
  const search = resolvedParams.search;
  const customerId = resolvedParams.customerId;

  const [returnsResult, warehouses] = await Promise.all([
    getReturns({ page, pageSize, search, customerId }),
    getWarehousesForSelect(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
      />

      <ReturnsTable
        data={returnsResult.items}
        warehouses={warehouses}
        pageCount={returnsResult.pagination.totalPages}
        currentPage={returnsResult.pagination.page}
        pageSize={returnsResult.pagination.pageSize}
        totalRecords={returnsResult.pagination.total}
      />
    </div>
  );
}
