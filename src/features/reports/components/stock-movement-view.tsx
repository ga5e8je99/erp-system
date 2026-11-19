"use client";

import * as React from "react";
import { ReportShell } from "./report-shell";
import { StockMovementSummaryRow } from "../types";
import { exportToCsv } from "../utils/export-csv";
import { useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";

interface StockMovementViewProps {
  data: StockMovementSummaryRow[];
}

export function StockMovementView({ data }: StockMovementViewProps) {
  const locale = useLocale();
  const isArabic = locale === "ar";

  const totalOpening = data.reduce((s, r) => s + r.openingStock, 0);
  const totalIn = data.reduce((s, r) => s + r.inQuantity, 0);
  const totalOut = data.reduce((s, r) => s + r.outQuantity, 0);
  const totalAdjustment = data.reduce((s, r) => s + r.adjustmentQuantity, 0);
  const totalClosing = data.reduce((s, r) => s + r.closingStock, 0);

  const handleExportCsv = () => {
    const headers = [
      isArabic ? "الرمز (SKU)" : "SKU",
      isArabic ? "اسم المنتج" : "Product Name",
      isArabic ? "الوحدة" : "Unit",
      isArabic ? "رصيد أول المدة" : "Opening Stock",
      isArabic ? "الوارد (+)" : "Inwards (+)",
      isArabic ? "المنصرف (-)" : "Outwards (-)",
      isArabic ? "تسويات (+/-)" : "Adjustments",
      isArabic ? "رصيد آخر المدة" : "Closing Stock",
    ];

    const rows = data.map((r) => [
      r.sku,
      r.productName,
      r.unitSymbol,
      r.openingStock,
      r.inQuantity,
      r.outQuantity,
      r.adjustmentQuantity,
      r.closingStock,
    ]);

    rows.push([
      isArabic ? "الإجمالي الكلي" : "Grand Total",
      "",
      "",
      totalOpening,
      totalIn,
      totalOut,
      totalAdjustment,
      totalClosing,
    ]);

    exportToCsv("stock_movement_summary_report", headers, rows);
  };

  const fmt = (n: number) => n.toLocaleString("en-US");

  return (
    <ReportShell
      title={isArabic ? "تقرير ملخص حركة المخزون" : "Stock Movement Summary Report"}
      description={
        isArabic
          ? "تتبع حركة تدفق البضائع: رصيد أول الفترة، الوارد، المنصرف، التسويات الجردية، ورصيد نهاية الفترة"
          : "Item inventory flow: opening balance, inwards, outwards, physical adjustments, and closing balance"
      }
      moduleName={isArabic ? "المخزون" : "Inventory"}
      onExportCsv={handleExportCsv}
    >
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="py-3 px-4 text-start font-medium">{isArabic ? "الرمز (SKU)" : "SKU"}</th>
                <th className="py-3 px-4 text-start font-medium">{isArabic ? "اسم المنتج" : "Product"}</th>
                <th className="py-3 px-4 text-center font-medium">{isArabic ? "أول المدة" : "Opening"}</th>
                <th className="py-3 px-4 text-center font-medium">{isArabic ? "الوارد (+)" : "In (+)"}</th>
                <th className="py-3 px-4 text-center font-medium">{isArabic ? "المنصرف (-)" : "Out (-)"}</th>
                <th className="py-3 px-4 text-center font-medium">{isArabic ? "تسويات (+/-)" : "Adjust"}</th>
                <th className="py-3 px-4 text-center font-medium">{isArabic ? "آخر المدة" : "Closing"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    {isArabic ? "لا توجد حركات مخزون مسجلة" : "No stock movement records found"}
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.productId} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-semibold text-primary">{row.sku}</td>
                    <td className="py-2.5 px-4 font-medium text-foreground">{row.productName}</td>
                    <td className="py-2.5 px-4 text-center font-mono text-muted-foreground">
                      {fmt(row.openingStock)} {row.unitSymbol}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono text-emerald-600 font-semibold">
                      +{fmt(row.inQuantity)}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono text-rose-600 font-semibold">
                      -{fmt(row.outQuantity)}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono text-amber-600">
                      {row.adjustmentQuantity > 0 ? `+${fmt(row.adjustmentQuantity)}` : fmt(row.adjustmentQuantity)}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold text-foreground">
                      {fmt(row.closingStock)} {row.unitSymbol}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Totals Row */}
            {data.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/60 font-bold">
                  <td colSpan={2} className="py-3 px-4 text-start">
                    {isArabic ? "الإجمالي الكلي" : "Grand Total"} ({data.length} {isArabic ? "منتج" : "products"})
                  </td>
                  <td className="py-3 px-4 text-center font-mono">{fmt(totalOpening)}</td>
                  <td className="py-3 px-4 text-center font-mono text-emerald-600">+{fmt(totalIn)}</td>
                  <td className="py-3 px-4 text-center font-mono text-rose-600">-{fmt(totalOut)}</td>
                  <td className="py-3 px-4 text-center font-mono text-amber-600">{fmt(totalAdjustment)}</td>
                  <td className="py-3 px-4 text-center font-mono text-primary text-sm font-bold">
                    {fmt(totalClosing)}
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
