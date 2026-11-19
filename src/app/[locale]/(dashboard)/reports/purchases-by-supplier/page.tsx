import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { getPurchasesBySupplierReport } from "@/features/reports/queries/report-queries";
import { PurchasesBySupplierView } from "@/features/reports/components/purchases-by-supplier-view";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "تقرير المشتريات حسب المورد | Masar ERP",
};

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; to?: string; search?: string }>;
}

export default async function PurchasesBySupplierPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("reports.purchases.view");

  const resolvedFilters = await searchParams;
  const data = await getPurchasesBySupplierReport(resolvedFilters);

  return <PurchasesBySupplierView data={data} />;
}
