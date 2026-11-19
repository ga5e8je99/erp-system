import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { getSuppliers } from "@/features/purchasing/queries/suppliers";
import { SuppliersTable } from "@/features/purchasing/components/suppliers-table";

interface SuppliersPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    q?: string;
  }>;
}

export default async function SuppliersPage({
  searchParams,
}: SuppliersPageProps) {
  await requirePermission("purchasing.supplier.view");
  const t = await getTranslations("purchasing.suppliers");

  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const pageSize = Number(resolvedParams.pageSize) || 20;
  const search = resolvedParams.q || resolvedParams.search;

  const result = await getSuppliers({ page, pageSize, search });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <SuppliersTable
        data={result.items}
        pageCount={result.pagination.totalPages}
        totalRecords={result.pagination.total}
      />
    </div>
  );
}
