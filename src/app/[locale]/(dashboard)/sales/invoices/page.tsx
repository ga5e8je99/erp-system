import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { getInvoices } from "@/features/sales/queries/invoices";
import { getWarehousesForSelect } from "@/features/inventory/queries/warehouses";
import { InvoicesTable } from "@/features/sales/components/invoices-table";
import { SalesInvoiceStatus } from "@prisma/client";

interface InvoicesPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    customerId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }>;
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  await requirePermission("sales.invoice.view");
  const t = await getTranslations("sales.invoices");

  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const pageSize = Number(resolvedParams.pageSize) || 20;
  const search = resolvedParams.search;
  const customerId = resolvedParams.customerId;
  const status = resolvedParams.status as SalesInvoiceStatus | "all" | undefined;
  const fromDate = resolvedParams.fromDate;
  const toDate = resolvedParams.toDate;

  const [invoicesResult, warehouses] = await Promise.all([
    getInvoices({ page, pageSize, search, customerId, status, fromDate, toDate }),
    getWarehousesForSelect(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
      />

      <InvoicesTable
        data={invoicesResult.items}
        warehouses={warehouses}
        pageCount={invoicesResult.pagination.totalPages}
        currentPage={invoicesResult.pagination.page}
        pageSize={invoicesResult.pagination.pageSize}
        totalRecords={invoicesResult.pagination.total}
      />
    </div>
  );
}
