import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { getGoodsReceipts } from "@/features/purchasing/queries/receipts";
import { GoodsReceiptsTable } from "@/features/purchasing/components/goods-receipts-table";

interface ReceiptsPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
  }>;
}

export default async function GoodsReceiptsPage({
  searchParams,
}: ReceiptsPageProps) {
  await requirePermission("purchasing.receipt.create");
  const t = await getTranslations("purchasing.receipts");

  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const pageSize = Number(resolvedParams.pageSize) || 20;
  const search = resolvedParams.search;

  const result = await getGoodsReceipts({ page, pageSize, search });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <GoodsReceiptsTable
        data={result.items}
        pageCount={result.pagination.totalPages}
        totalRecords={result.pagination.total}
      />
    </div>
  );
}
