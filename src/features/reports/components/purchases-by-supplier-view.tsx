"use client";

import * as React from "react";
import { ReportShell } from "./report-shell";
import { PurchasesBySupplierRow } from "../types";
import { exportToCsv } from "../utils/export-csv";
import { useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";

interface PurchasesBySupplierViewProps {
  data: PurchasesBySupplierRow[];
}

export function PurchasesBySupplierView({ data }: PurchasesBySupplierViewProps) {
  const locale = useLocale();
  const isArabic = locale === "ar";

  const totalInvoices = data.reduce((s, r) => s + r.invoiceCount, 0);
  const totalPurchases = data.reduce((s, r) => s + r.totalPurchases, 0);
  const totalPaid = data.reduce((s, r) => s + r.totalPaid, 0);
  const totalBalance = data.reduce((s, r) => s + r.balance, 0);

  const handleExportCsv = () => {
    const headers = [
      isArabic ? "كود المورد" : "Supplier Code",
      isArabic ? "اسم المورد" : "Supplier Name",
      isArabic ? "الهاتف" : "Phone",
      isArabic ? "عدد الفواتير" : "Invoices Count",
      isArabic ? "إجمالي المشتريات" : "Total Purchases",
      isArabic ? "إجمالي المسدد" : "Total Paid",
      isArabic ? "الرصيد المستحق" : "Payables Balance",
    ];

    const rows = data.map((r) => [
      r.supplierCode,
      r.supplierName,
      r.phone || "",
      r.invoiceCount,
      r.totalPurchases,
      r.totalPaid,
      r.balance,
    ]);

    rows.push([
      isArabic ? "الإجمالي الكلي" : "Grand Total",
      "",
      "",
      totalInvoices,
      totalPurchases,
      totalPaid,
      totalBalance,
    ]);

    exportToCsv("purchases_by_supplier_report", headers, rows);
  };

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2 });

  return (
    <ReportShell
      title={isArabic ? "تقرير المشتريات حسب المورد" : "Purchases by Supplier Report"}
      description={
        isArabic
          ? "تحليل أوامر وفواتير الشراء المسجلة للموردين والمدفوعات والمبالغ المستحقة"
          : "Supplier purchasing analysis, billing history, payment allocations, and outstanding payables"
      }
      moduleName={isArabic ? "المشتريات" : "Purchasing"}
      onExportCsv={handleExportCsv}
    >
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="py-3 px-4 text-start font-medium">{isArabic ? "كود المورد" : "Code"}</th>
                <th className="py-3 px-4 text-start font-medium">{isArabic ? "اسم المورد" : "Supplier"}</th>
                <th className="py-3 px-4 text-start font-medium">{isArabic ? "الهاتف" : "Phone"}</th>
                <th className="py-3 px-4 text-center font-medium">{isArabic ? "عدد الفواتير" : "Invoices"}</th>
                <th className="py-3 px-4 text-end font-medium">{isArabic ? "إجمالي المشتريات" : "Total Purchases"}</th>
                <th className="py-3 px-4 text-end font-medium">{isArabic ? "المسدد" : "Paid"}</th>
                <th className="py-3 px-4 text-end font-medium">{isArabic ? "المستحق للمورد" : "Payables"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    {isArabic ? "لا توجد سجلات مشتريات في هذه الفترة" : "No purchase records found"}
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.supplierId} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-amber-600">{row.supplierCode}</td>
                    <td className="py-2.5 px-4 font-semibold text-foreground">{row.supplierName}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{row.phone || "—"}</td>
                    <td className="py-2.5 px-4 text-center font-mono font-medium">{row.invoiceCount}</td>
                    <td className="py-2.5 px-4 text-end font-mono font-bold">{fmt(row.totalPurchases)}</td>
                    <td className="py-2.5 px-4 text-end font-mono text-emerald-600">{fmt(row.totalPaid)}</td>
                    <td className="py-2.5 px-4 text-end font-mono font-bold text-amber-700 dark:text-amber-400">
                      {fmt(row.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Totals Row */}
            {data.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/60 font-bold">
                  <td colSpan={3} className="py-3 px-4 text-start">
                    {isArabic ? "الإجمالي الكلي" : "Grand Total"} ({data.length} {isArabic ? "مورد" : "suppliers"})
                  </td>
                  <td className="py-3 px-4 text-center font-mono">{totalInvoices}</td>
                  <td className="py-3 px-4 text-end font-mono text-foreground">{fmt(totalPurchases)}</td>
                  <td className="py-3 px-4 text-end font-mono text-emerald-600">{fmt(totalPaid)}</td>
                  <td className="py-3 px-4 text-end font-mono text-amber-700 dark:text-amber-400">
                    {fmt(totalBalance)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </CardContent>
      </Card>
    </ReportShell>
  );
}
