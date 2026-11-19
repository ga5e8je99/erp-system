"use client";

import * as React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CategorySalesItem } from "../types";
import { useLocale } from "next-intl";
import { formatNumber } from "@/lib/formatters";

interface SalesCategoryChartProps {
  data: CategorySalesItem[];
}

const COLORS = ["#0F766E", "#0284C7", "#F59E0B", "#10B981", "#8B5CF6", "#EC4899", "#64748B"];

export function SalesCategoryChart({ data }: SalesCategoryChartProps) {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const formatVal = (num: number) => {
    return formatNumber(num, { locale: isArabic ? "ar-EG" : "en-US", decimals: 0 });
  };

  return (
    <Card className="col-span-full md:col-span-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          {isArabic ? "المبيعات حسب التصنيف" : "Sales by Category"}
        </CardTitle>
        <CardDescription className="text-xs">
          {isArabic ? "توزيع الإيرادات المحققة حسب تصنيفات المنتجات" : "Revenue distribution by product categories"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full pt-2">
          {!mounted ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {isArabic ? "جاري التحميل..." : "Loading..."}
            </div>
          ) : data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {isArabic ? "لا توجد بيانات تصنيفات" : "No category sales data"}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="totalRevenue"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  wrapperStyle={{ direction: isArabic ? "rtl" : "ltr" }}
                  formatter={(val: unknown) => [formatVal(Number(val)), ""]}
                  labelStyle={{ fontWeight: "bold", fontSize: 12, color: "hsl(var(--popover-foreground))" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    borderColor: "hsl(var(--border))",
                    color: "hsl(var(--popover-foreground))",
                    borderRadius: "8px",
                    fontSize: 12,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
