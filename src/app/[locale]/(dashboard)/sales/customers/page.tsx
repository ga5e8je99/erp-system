import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { getCustomers } from "@/features/sales/queries/customers";
import { CustomersTable } from "@/features/sales/components/customers-table";

interface CustomersPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    q?: string;
  }>;
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  await requirePermission("sales.customer.view");
  const t = await getTranslations("sales.customers");

  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const pageSize = Number(resolvedParams.pageSize) || 20;
  const search = resolvedParams.q || resolvedParams.search;

  const result = await getCustomers({ page, pageSize, search });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
      />

      <CustomersTable
        data={result.items}
        pageCount={result.pagination.totalPages}
        currentPage={result.pagination.page}
        pageSize={result.pagination.pageSize}
        totalRecords={result.pagination.total}
      />
    </div>
  );
}
