"use client";

import * as React from "react";
import { ReportShell } from "./report-shell";
import { ProfitByProductRow } from "../types";
import { exportToCsv } from "../utils/export-csv";
import { useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";

interface ProfitByProductViewProps {
  data: ProfitByProductRow[];
}

export function ProfitByProductView({ data }: ProfitByProductViewProps) {
  const locale = useLocale();
  const isArabic = locale === "ar";

  const totalQuantity = data.reduce((s, r) => s + r.quantitySold, 0);
  const totalRevenue = data.reduce((s, r) => s + r.revenue, 0);
  const totalCogs = data.reduce((s, r) => s + r.cogs, 0);
  const totalGrossProfit = totalRevenue - totalCogs;
  const overallMargin =
    totalRevenue > 0 ? Math.round((totalGrossProfit / totalRevenue) * 10000) / 100 : 0;

  const handleExportCsv = () => {
    const headers = [
      isArabic ? "الرمز (SKU)" : "SKU",
      isArabic ? "اسم المنتج" : "Product Name",
      isArabic ? "التصنيف" : "Category",
      isArabic ? "الوحدة" : "Unit",
      isArabic ? "الكمية المباعة" : "Qty Sold",
      isArabic ? "إجمالي الإيراد" : "Revenue",
      isArabic ? "تكلفة المبيعات (COGS)" : "COGS",
      isArabic ? "إجمالي الربح" : "Gross Profit",
      isArabic ? "هامش الربح %" : "Margin %",
    ];

    const rows = data.map((r) => [
      r.sku,
      r.productName,
      r.categoryName,
      r.unitSymbol,
      r.quantitySold,
      r.revenue,
      r.cogs,
      r.grossProfit,
      `${r.marginPercent}%`,
    ]);

    rows.push([
      isArabic ? "الإجمالي الكلي" : "Grand Total",
      "",
      "",
      "",
      totalQuantity,
      totalRevenue,
      totalCogs,
      totalGrossProfit,
      `${overallMargin}%`,
    ]);

    exportToCsv("profit_by_product_report", headers, rows);
  };

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2 });

  return (
    <ReportShell
      title={isArabic ? "تقرير ربحية المنتجات" : "Profit by Product Report"}
      description={
        isArabic
          ? "تحليل هوامش الربح للمنتجات المباعة: مقارنة إيرادات البيع بتكلفة البضاعة المباعة (COGS)"
          : "Gross margin analysis per product comparing sales revenue against cost of goods sold (COGS)"
      }
      moduleName={isArabic ? "الربحية" : "Profitability"}
      onExportCsv={handleExportCsv}
    >
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="py-3 px-4 text-start font-medium">{isArabic ? "الرمز (SKU)" : "SKU"}</th>
                <th className="py-3 px-4 text-start font-medium">{isArabic ? "اسم المنتج" : "Product"}</th>
                <th className="py-3 px-4 text-start font-medium">{isArabic ? "التصنيف" : "Category"}</th>
                <th className="py-3 px-4 text-center font-medium">{isArabic ? "الكمية المباعة" : "Qty Sold"}</th>
                <th className="py-3 px-4 text-end font-medium">{isArabic ? "الإيرادات" : "Revenue"}</th>
                <th className="py-3 px-4 text-end font-medium">{isArabic ? "التكلفة (COGS)" : "COGS"}</th>
                <th className="py-3 px-4 text-end font-medium">{isArabic ? "مجمل الربح" : "Gross Profit"}</th>
                <th className="py-3 px-4 text-center font-medium">{isArabic ? "الهامش %" : "Margin %"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    {isArabic ? "لا توجد مبيعات في هذه الفترة" : "No product profitability records found"}
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.productId} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-semibold text-primary">{row.sku}</td>
                    <td className="py-2.5 px-4 font-medium text-foreground">{row.productName}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{row.categoryName}</td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold">
                      {row.quantitySold} {row.unitSymbol}
                    </td>
                    <td className="py-2.5 px-4 text-end font-mono font-bold">{fmt(row.revenue)}</td>
                    <td className="py-2.5 px-4 text-end font-mono text-muted-foreground">{fmt(row.cogs)}</td>
                    <td className="py-2.5 px-4 text-end font-mono font-bold text-emerald-600">
                      {fmt(row.grossProfit)}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold">
                      <span
                        className={
                          row.marginPercent >= 20
                            ? "text-emerald-600"
                            : row.marginPercent > 0
                            ? "text-amber-600"
                            : "text-rose-600"
                        }
                      >
                        {row.marginPercent}%
                      </span>
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
                    {isArabic ? "الإجمالي الكلي" : "Grand Total"} ({data.length} {isArabic ? "منتج" : "products"})
                  </td>
                  <td className="py-3 px-4 text-center font-mono">{totalQuantity}</td>
                  <td className="py-3 px-4 text-end font-mono text-foreground">{fmt(totalRevenue)}</td>
                  <td className="py-3 px-4 text-end font-mono text-muted-foreground">{fmt(totalCogs)}</td>
                  <td className="py-3 px-4 text-end font-mono text-emerald-600 text-sm font-bold">
                    {fmt(totalGrossProfit)}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-emerald-600 font-bold">
                    {overallMargin}%
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
