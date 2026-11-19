import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getQuotationById } from "@/features/sales/queries/quotations";
import { QuotationDetailClient } from "./quotation-detail-client";

interface QuotationDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function QuotationDetailPage({ params }: QuotationDetailPageProps) {
  await requirePermission("sales.quotation.view");
  const { id } = await params;

  const quotation = await getQuotationById(id);
  if (!quotation) {
    notFound();
  }

  return <QuotationDetailClient quotation={quotation} />;
}
