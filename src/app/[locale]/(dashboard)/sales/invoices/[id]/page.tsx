import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getInvoiceById } from "@/features/sales/queries/invoices";
import { getWarehousesForSelect } from "@/features/inventory/queries/warehouses";
import { InvoiceDetailClient } from "./invoice-detail-client";

interface InvoiceDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  await requirePermission("sales.invoice.view");
  const { id } = await params;

  const [invoice, warehouses] = await Promise.all([
    getInvoiceById(id),
    getWarehousesForSelect(),
  ]);

  if (!invoice) {
    notFound();
  }

  return <InvoiceDetailClient invoice={invoice} warehouses={warehouses} />;
}
