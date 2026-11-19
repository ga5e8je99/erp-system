import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { getQuotations } from "@/features/sales/queries/quotations";
import { QuotationsTable } from "@/features/sales/components/quotations-table";
import { SalesQuotationStatus } from "@prisma/client";

interface QuotationsPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function QuotationsPage({ searchParams }: QuotationsPageProps) {
  await requirePermission("sales.quotation.view");
  const t = await getTranslations("sales.quotations");

  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const pageSize = Number(resolvedParams.pageSize) || 20;
  const search = resolvedParams.search;
  const status = resolvedParams.status as SalesQuotationStatus | "all" | undefined;

  const result = await getQuotations({ page, pageSize, search, status });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
      />

      <QuotationsTable
        data={result.items}
        pageCount={result.pagination.totalPages}
        currentPage={result.pagination.page}
        pageSize={result.pagination.pageSize}
        totalRecords={result.pagination.total}
      />
    </div>
  );
}
