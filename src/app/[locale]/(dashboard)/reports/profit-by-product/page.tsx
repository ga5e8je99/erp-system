import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { getProfitByProductReport } from "@/features/reports/queries/report-queries";
import { ProfitByProductView } from "@/features/reports/components/profit-by-product-view";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "تقرير ربحية المنتجات | Masar ERP",
};

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; to?: string; search?: string; categoryId?: string }>;
}

export default async function ProfitByProductPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("reports.sales.view");

  const resolvedFilters = await searchParams;
  const data = await getProfitByProductReport(resolvedFilters);

  return <ProfitByProductView data={data} />;
}
