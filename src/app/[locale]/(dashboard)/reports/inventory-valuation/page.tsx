import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { getInventoryValuationReport } from "@/features/reports/queries/report-queries";
import { InventoryValuationView } from "@/features/reports/components/inventory-valuation-view";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "تقرير تقييم المخزون | Masar ERP",
};

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; categoryId?: string; warehouseId?: string }>;
}

export default async function InventoryValuationPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("reports.inventory.view");

  const resolvedFilters = await searchParams;
  const data = await getInventoryValuationReport(resolvedFilters);

  return <InventoryValuationView data={data} />;
}
