import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getPurchaseInvoiceById } from "@/features/purchasing/queries/invoices";
import { InvoiceDetailClient } from "./invoice-detail-client";

interface InvoiceDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  await requirePermission("purchasing.invoice.view");
  const { id } = await params;

  const invoice = await getPurchaseInvoiceById(id);
  if (!invoice) {
    notFound();
  }

  return <InvoiceDetailClient invoice={invoice} />;
}
