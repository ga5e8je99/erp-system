import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { getPurchaseInvoices } from "@/features/purchasing/queries/invoices";
import { PurchaseInvoicesTable } from "@/features/purchasing/components/purchase-invoices-table";
import { PurchaseInvoiceStatus } from "@prisma/client";

interface InvoicesPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    supplierId?: string;
    status?: string;
  }>;
}

export default async function PurchaseInvoicesPage({
  searchParams,
}: InvoicesPageProps) {
  await requirePermission("purchasing.invoice.view");
  const t = await getTranslations("purchasing.invoices");

  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const pageSize = Number(resolvedParams.pageSize) || 20;
  const search = resolvedParams.search;
  const supplierId = resolvedParams.supplierId;
  const status = resolvedParams.status as PurchaseInvoiceStatus | "ALL" | undefined;

  const result = await getPurchaseInvoices({
    page,
    pageSize,
    search,
    supplierId,
    status,
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <PurchaseInvoicesTable
        data={result.items}
        pageCount={result.pagination.totalPages}
        totalRecords={result.pagination.total}
      />
    </div>
  );
}
