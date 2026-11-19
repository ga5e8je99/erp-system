import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { getStockMovementSummaryReport } from "@/features/reports/queries/report-queries";
import { StockMovementView } from "@/features/reports/components/stock-movement-view";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "تقرير ملخص حركة المخزون | Masar ERP",
};

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; to?: string; search?: string; warehouseId?: string }>;
}

export default async function StockMovementPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("reports.inventory.view");

  const resolvedFilters = await searchParams;
  const data = await getStockMovementSummaryReport(resolvedFilters);

  return <StockMovementView data={data} />;
}
