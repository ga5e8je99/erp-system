import React from "react";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { LowStockProductItem } from "../types";

interface LowStockWidgetProps {
  products: LowStockProductItem[];
  locale: string;
}

export function LowStockWidget({ products, locale }: LowStockWidgetProps) {
  const isArabic = locale === "ar";
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;

  return (
    <Card className="col-span-full xl:col-span-1">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold text-amber-600">
              {isArabic ? "تنبيهات انخفاض المخزون" : "Low Stock Alerts"}
            </CardTitle>
            {products.length > 0 && (
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 h-5 px-1.5 text-[10px]">
                {products.length}
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs">
            {isArabic ? "أصناف قاربت على النفاد وتحتاج إعادة طلب" : "Products below safety reorder threshold"}
          </CardDescription>
        </div>
        <Button asChild variant="ghost" size="xs" className="h-7 text-xs text-primary gap-1">
          <Link href="/inventory/stock">
            <span>{isArabic ? "جرد المخزون" : "View stock"}</span>
            <ArrowIcon className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground">
                <th className="py-2 px-3 text-start font-medium">{isArabic ? "الرمز (SKU)" : "SKU"}</th>
                <th className="py-2 px-3 text-start font-medium">{isArabic ? "اسم الصنف" : "Product"}</th>
                <th className="py-2 px-3 text-start font-medium">{isArabic ? "التصنيف" : "Category"}</th>
                <th className="py-2 px-3 text-center font-medium">{isArabic ? "الرصيد الحالي" : "Current"}</th>
                <th className="py-2 px-3 text-center font-medium">{isArabic ? "حد الطلب" : "Reorder"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    {isArabic ? "جميع الأصناف ضمن الحدود الآمنة للمخزون" : "All products are safely stocked"}
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-semibold text-primary">
                      <Link href={`/inventory/products/${p.id}`} className="hover:underline">
                        {p.sku}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-foreground truncate max-w-[140px]">
                      {p.name}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {p.categoryName}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold font-mono text-rose-600">
                      {p.currentStock} {p.unitSymbol}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">
                      {p.reorderLevel} {p.unitSymbol}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
