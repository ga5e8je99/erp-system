"use client";

import * as React from "react";
import { ReportShell } from "./report-shell";
import { SalesBySalespersonRow } from "../types";
import { exportToCsv } from "../utils/export-csv";
import { useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";

interface SalesBySalespersonViewProps {
  data: SalesBySalespersonRow[];
}

export function SalesBySalespersonView({ data }: SalesBySalespersonViewProps) {
  const locale = useLocale();
  const isArabic = locale === "ar";

  const totalInvoices = data.reduce((s, r) => s + r.invoiceCount, 0);
  const totalSales = data.reduce((s, r) => s + r.totalSales, 0);

  const handleExportCsv = () => {
    const headers = [
      isArabic ? "مسؤول المبيعات" : "Salesperson",
      isArabic ? "البريد الإلكتروني" : "Email",
      isArabic ? "عدد الفواتير" : "Invoices Count",
      isArabic ? "إجمالي المبيعات" : "Total Sales",
      isArabic ? "متوسط قيمة الفاتورة" : "Avg Invoice Value",
    ];

    const rows = data.map((r) => [
      r.userName,
      r.userEmail,
      r.invoiceCount,
      r.totalSales,
      r.avgInvoiceValue,
    ]);

    rows.push([
      isArabic ? "الإجمالي الكلي" : "Grand Total",
      "",
      totalInvoices,
      totalSales,
      "",
    ]);

    exportToCsv("sales_by_salesperson_report", headers, rows);
  };

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2 });

  return (
    <ReportShell
      title={isArabic ? "تقرير المبيعات حسب مسؤول المبيعات" : "Sales by Salesperson Report"}
      description={
        isArabic
          ? "أداء مسؤولي المبيعات والمستخدمين وحجم الفواتير المصدرة ومتوسط قيمة العمليات"
          : "Performance analysis of sales reps, invoice counts, and total sales volume"
      }
      moduleName={isArabic ? "المبيعات" : "Sales"}
      onExportCsv={handleExportCsv}
    >
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="py-3 px-4 text-start font-medium">{isArabic ? "مسؤول المبيعات" : "Salesperson"}</th>
                <th className="py-3 px-4 text-start font-medium">{isArabic ? "البريد الإلكتروني" : "Email"}</th>
                <th className="py-3 px-4 text-center font-medium">{isArabic ? "عدد الفواتير" : "Invoices"}</th>
                <th className="py-3 px-4 text-end font-medium">{isArabic ? "إجمالي المبيعات" : "Total Sales"}</th>
                <th className="py-3 px-4 text-end font-medium">{isArabic ? "متوسط قيمة الفاتورة" : "Avg Invoice Value"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    {isArabic ? "لا توجد سجلات مبيعات في هذه الفترة" : "No salesperson records found"}
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.userId} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-foreground">{row.userName}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{row.userEmail}</td>
                    <td className="py-2.5 px-4 text-center font-mono font-medium">{row.invoiceCount}</td>
                    <td className="py-2.5 px-4 text-end font-mono font-bold text-foreground">{fmt(row.totalSales)}</td>
                    <td className="py-2.5 px-4 text-end font-mono text-muted-foreground">{fmt(row.avgInvoiceValue)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Totals Row */}
            {data.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/60 font-bold">
                  <td colSpan={2} className="py-3 px-4 text-start">
                    {isArabic ? "الإجمالي الكلي" : "Grand Total"} ({data.length} {isArabic ? "مستخدم" : "users"})
                  </td>
                  <td className="py-3 px-4 text-center font-mono">{totalInvoices}</td>
                  <td className="py-3 px-4 text-end font-mono text-primary text-sm font-bold">
                    {fmt(totalSales)}
                  </td>
                  <td className="py-3 px-4 text-end font-mono text-muted-foreground">
                    {totalInvoices > 0 ? fmt(totalSales / totalInvoices) : "—"}
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
