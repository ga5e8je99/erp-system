import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { getSalesByCustomerReport } from "@/features/reports/queries/report-queries";
import { SalesByCustomerView } from "@/features/reports/components/sales-by-customer-view";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "تقرير المبيعات حسب العميل | Masar ERP",
};

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; to?: string; search?: string }>;
}

export default async function SalesByCustomerPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("reports.sales.view");

  const resolvedFilters = await searchParams;
  const data = await getSalesByCustomerReport(resolvedFilters);

  return <SalesByCustomerView data={data} />;
}
