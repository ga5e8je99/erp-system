"use client";

import * as React from "react";
import { ReportShell } from "./report-shell";
import { InventoryValuationRow } from "../types";
import { exportToCsv } from "../utils/export-csv";
import { useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";

interface InventoryValuationViewProps {
  data: InventoryValuationRow[];
}

export function InventoryValuationView({ data }: InventoryValuationViewProps) {
  const locale = useLocale();
  const isArabic = locale === "ar";

  const totalStockUnits = data.reduce((s, r) => s + r.currentStock, 0);
  const totalValuation = data.reduce((s, r) => s + r.totalValuation, 0);

  const handleExportCsv = () => {
    const headers = [
      isArabic ? "الرمز (SKU)" : "SKU",
      isArabic ? "اسم المنتج" : "Product Name",
      isArabic ? "التصنيف" : "Category",
      isArabic ? "الوحدة" : "Unit",
      isArabic ? "الرصيد المتاح" : "Stock Quantity",
      isArabic ? "تكلفة الوحدة (WAC)" : "Unit Cost (WAC)",
      isArabic ? "إجمالي التقييم" : "Total Valuation",
    ];

    const rows = data.map((r) => [
      r.sku,
      r.productName,
      r.categoryName,
      r.unitSymbol,
      r.currentStock,
      r.unitCost,
      r.totalValuation,
    ]);

    rows.push([
      isArabic ? "الإجمالي الكلي" : "Grand Total",
      "",
      "",
      "",
      totalStockUnits,
      "",
      totalValuation,
    ]);

    exportToCsv("inventory_valuation_report", headers, rows);
  };

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2 });

  return (
    <ReportShell
      title={isArabic ? "تقرير تقييم المخزون" : "Inventory Valuation Report"}
      description={
        isArabic
          ? "حساب القيمة المالية الإجمالية للمخزون الحالي بالاعتماد على طريقة المتوسط المرجح للتكلفة (WAC)"
          : "Total asset valuation of on-hand inventory based on Weighted Average Cost (WAC)"
      }
      moduleName={isArabic ? "المخزون" : "Inventory"}
      onExportCsv={handleExportCsv}
      showDateFilter={false}
    >
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="py-3 px-4 text-start font-medium">{isArabic ? "الرمز (SKU)" : "SKU"}</th>
                <th className="py-3 px-4 text-start font-medium">{isArabic ? "اسم المنتج" : "Product"}</th>
                <th className="py-3 px-4 text-start font-medium">{isArabic ? "التصنيف" : "Category"}</th>
                <th className="py-3 px-4 text-center font-medium">{isArabic ? "الرصيد الحالي" : "Current Stock"}</th>
                <th className="py-3 px-4 text-end font-medium">{isArabic ? "تكلفة الوحدة (WAC)" : "Unit Cost (WAC)"}</th>
                <th className="py-3 px-4 text-end font-medium">{isArabic ? "إجمالي قيمة المخزون" : "Total Valuation"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    {isArabic ? "لا توجد أصناف في المخزون" : "No inventory items found"}
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.productId} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-semibold text-primary">{row.sku}</td>
                    <td className="py-2.5 px-4 font-medium text-foreground">{row.productName}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{row.categoryName}</td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold">
                      {row.currentStock} {row.unitSymbol}
                    </td>
                    <td className="py-2.5 px-4 text-end font-mono text-muted-foreground">{fmt(row.unitCost)}</td>
                    <td className="py-2.5 px-4 text-end font-mono font-bold text-teal-700 dark:text-teal-400">
                      {fmt(row.totalValuation)}
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
                  <td className="py-3 px-4 text-center font-mono">{totalStockUnits}</td>
                  <td className="py-3 px-4 text-end font-mono text-muted-foreground">—</td>
                  <td className="py-3 px-4 text-end font-mono text-teal-700 dark:text-teal-400 text-sm font-bold">
                    {fmt(totalValuation)}
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
