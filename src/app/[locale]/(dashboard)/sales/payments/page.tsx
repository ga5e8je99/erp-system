import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { getPayments } from "@/features/sales/queries/payments";
import { PaymentsTable } from "@/features/sales/components/payments-table";
import { PaymentMethod } from "@prisma/client";

interface PaymentsPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    customerId?: string;
    method?: string;
  }>;
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  await requirePermission("sales.payment.create");
  const t = await getTranslations("sales.payments");

  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const pageSize = Number(resolvedParams.pageSize) || 20;
  const search = resolvedParams.search;
  const customerId = resolvedParams.customerId;
  const method = resolvedParams.method as PaymentMethod | "all" | undefined;

  const result = await getPayments({ page, pageSize, search, customerId, method });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
      />

      <PaymentsTable
        data={result.items}
        pageCount={result.pagination.totalPages}
        currentPage={result.pagination.page}
        pageSize={result.pagination.pageSize}
        totalRecords={result.pagination.total}
      />
    </div>
  );
}
