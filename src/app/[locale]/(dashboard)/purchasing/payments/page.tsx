import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { getSupplierPayments } from "@/features/purchasing/queries/payments";
import { SupplierPaymentsTable } from "@/features/purchasing/components/supplier-payments-table";

interface PaymentsPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
  }>;
}

export default async function SupplierPaymentsPage({
  searchParams,
}: PaymentsPageProps) {
  await requirePermission("purchasing.payment.view");
  const t = await getTranslations("purchasing.payments");

  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const pageSize = Number(resolvedParams.pageSize) || 20;
  const search = resolvedParams.search;

  const result = await getSupplierPayments({ page, pageSize, search });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <SupplierPaymentsTable
        data={result.items}
        pageCount={result.pagination.totalPages}
        totalRecords={result.pagination.total}
      />
    </div>
  );
}
