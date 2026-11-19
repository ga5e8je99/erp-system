"use client";

import * as React from "react";
import { ReportShell } from "./report-shell";
import { SalesByCustomerRow } from "../types";
import { exportToCsv } from "../utils/export-csv";
import { useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";

interface SalesByCustomerViewProps {
  data: SalesByCustomerRow[];
}

export function SalesByCustomerView({ data }: SalesByCustomerViewProps) {
  const locale = useLocale();
  const isArabic = locale === "ar";

  const totalInvoices = data.reduce((s, r) => s + r.invoiceCount, 0);
  const totalSales = data.reduce((s, r) => s + r.totalSales, 0);
  const totalPaid = data.reduce((s, r) => s + r.totalPaid, 0);
  const totalBalance = data.reduce((s, r) => s + r.balance, 0);

  const handleExportCsv = () => {
    const headers = [
      isArabic ? "كود العميل" : "Customer Code",
      isArabic ? "اسم العميل" : "Customer Name",
      isArabic ? "الهاتف" : "Phone",
      isArabic ? "عدد الفواتير" : "Invoices Count",
      isArabic ? "إجمالي المبيعات" : "Total Sales",
      isArabic ? "إجمالي المسدد" : "Total Paid",
      isArabic ? "الرصيد المتبقي" : "Balance",
    ];

    const rows = data.map((r) => [
      r.customerCode,
      r.customerName,
      r.phone || "",
      r.invoiceCount,
      r.totalSales,
      r.totalPaid,
      r.balance,
    ]);

    // Totals row in CSV
    rows.push([
      isArabic ? "الإجمالي الكلي" : "Grand Total",
      "",
      "",
      totalInvoices,
      totalSales,
      totalPaid,
      totalBalance,
    ]);

    exportToCsv("sales_by_customer_report", headers, rows);
  };

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2 });

  return (
    <ReportShell
      title={isArabic ? "تقرير المبيعات حسب العميل" : "Sales by Customer Report"}
      description={
        isArabic
          ? "تحليل مبيعات العملاء وعدد الفواتير الصادرة والمبالغ المسددة والأرصدة المستحقة"
          : "Analysis of customer sales volume, issued invoices, collections, and outstanding receivables"
      }
      moduleName={isArabic ? "المبيعات" : "Sales"}
      onExportCsv={handleExportCsv}
    >
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="py-3 px-4 text-start font-medium">{isArabic ? "كود العميل" : "Code"}</th>
                <th className="py-3 px-4 text-start font-medium">{isArabic ? "اسم العميل" : "Customer"}</th>
                <th className="py-3 px-4 text-start font-medium">{isArabic ? "الهاتف" : "Phone"}</th>
                <th className="py-3 px-4 text-center font-medium">{isArabic ? "عدد الفواتير" : "Invoices"}</th>
                <th className="py-3 px-4 text-end font-medium">{isArabic ? "إجمالي المبيعات" : "Total Sales"}</th>
                <th className="py-3 px-4 text-end font-medium">{isArabic ? "المسدد" : "Paid"}</th>
                <th className="py-3 px-4 text-end font-medium">{isArabic ? "الرصيد المتبقي" : "Balance"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    {isArabic ? "لا توجد سجلات مبيعات في هذه الفترة" : "No sales records found"}
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.customerId} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-primary">{row.customerCode}</td>
                    <td className="py-2.5 px-4 font-semibold text-foreground">{row.customerName}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{row.phone || "—"}</td>
                    <td className="py-2.5 px-4 text-center font-mono font-medium">{row.invoiceCount}</td>
                    <td className="py-2.5 px-4 text-end font-mono font-bold">{fmt(row.totalSales)}</td>
                    <td className="py-2.5 px-4 text-end font-mono text-emerald-600">{fmt(row.totalPaid)}</td>
                    <td className="py-2.5 px-4 text-end font-mono font-bold text-sky-700 dark:text-sky-400">
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
                    {isArabic ? "الإجمالي الكلي" : "Grand Total"} ({data.length} {isArabic ? "عميل" : "customers"})
                  </td>
                  <td className="py-3 px-4 text-center font-mono">{totalInvoices}</td>
                  <td className="py-3 px-4 text-end font-mono text-foreground">{fmt(totalSales)}</td>
                  <td className="py-3 px-4 text-end font-mono text-emerald-600">{fmt(totalPaid)}</td>
                  <td className="py-3 px-4 text-end font-mono text-sky-700 dark:text-sky-400">
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
