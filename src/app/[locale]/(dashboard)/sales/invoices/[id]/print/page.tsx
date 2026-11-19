import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getInvoiceById } from "@/features/sales/queries/invoices";
import { PrintableInvoice } from "@/features/sales/components/printable-invoice";

interface InvoicePrintPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InvoicePrintPage({ params }: InvoicePrintPageProps) {
  await requirePermission("sales.invoice.view");
  const { id } = await params;

  const invoice = await getInvoiceById(id);
  if (!invoice) {
    notFound();
  }

  return (
    <PrintableInvoice
      invoice={invoice}
      companySettings={invoice.companySettings}
    />
  );
}
