import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { getPurchaseReturns } from "@/features/purchasing/queries/returns";
import { PurchaseReturnsTable } from "@/features/purchasing/components/purchase-returns-table";

interface ReturnsPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
  }>;
}

export default async function PurchaseReturnsPage({
  searchParams,
}: ReturnsPageProps) {
  await requirePermission("purchasing.return.manage");
  const t = await getTranslations("purchasing.returns");

  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const pageSize = Number(resolvedParams.pageSize) || 20;
  const search = resolvedParams.search;

  const result = await getPurchaseReturns({ page, pageSize, search });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <PurchaseReturnsTable
        data={result.items}
        pageCount={result.pagination.totalPages}
        totalRecords={result.pagination.total}
      />
    </div>
  );
}
