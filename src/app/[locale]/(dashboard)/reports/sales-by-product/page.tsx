import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { getSalesByProductReport } from "@/features/reports/queries/report-queries";
import { SalesByProductView } from "@/features/reports/components/sales-by-product-view";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "تقرير المبيعات حسب المنتج | Masar ERP",
};

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; to?: string; search?: string; categoryId?: string }>;
}

export default async function SalesByProductPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("reports.sales.view");

  const resolvedFilters = await searchParams;
  const data = await getSalesByProductReport(resolvedFilters);

  return <SalesByProductView data={data} />;
}
