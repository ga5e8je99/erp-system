import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { getSalesBySalespersonReport } from "@/features/reports/queries/report-queries";
import { SalesBySalespersonView } from "@/features/reports/components/sales-by-salesperson-view";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "تقرير المبيعات حسب مسؤول المبيعات | Masar ERP",
};

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; to?: string; search?: string }>;
}

export default async function SalesBySalespersonPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("reports.sales.view");

  const resolvedFilters = await searchParams;
  const data = await getSalesBySalespersonReport(resolvedFilters);

  return <SalesBySalespersonView data={data} />;
}
