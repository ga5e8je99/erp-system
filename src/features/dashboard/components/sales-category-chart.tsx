"use client";

import * as React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CategorySalesItem } from "../types";
import { useLocale } from "next-intl";
import { formatNumber } from "@/lib/formatters";
import { PieChart as PieChartIcon } from "lucide-react";

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
    <Card className="col-span-full md:col-span-1 flex flex-col justify-between">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          {isArabic ? "المبيعات حسب التصنيف" : "Sales by Category"}
        </CardTitle>
        <CardDescription className="text-xs">
          {isArabic ? "توزيع الإيرادات المحققة حسب تصنيفات المنتجات" : "Revenue distribution by product categories"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2 flex-1 flex flex-col justify-center">
        {!mounted ? (
          <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
            {isArabic ? "جاري التحميل..." : "Loading..."}
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-[260px] flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
            <PieChartIcon className="h-8 w-8 opacity-30" />
            <span>{isArabic ? "لا توجد بيانات تصنيفات" : "No category sales data"}</span>
          </div>
        ) : (
          <div dir="ltr" className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="totalRevenue"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={78}
                  paddingAngle={3}
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  wrapperStyle={{ direction: isArabic ? "rtl" : "ltr" }}
                  formatter={(val: unknown) => [
                    `${formatVal(Number(val))} ${isArabic ? "ج.م" : "EGP"}`,
                    isArabic ? "الإيراد" : "Revenue",
                  ]}
                  labelStyle={{ fontWeight: "bold", fontSize: 12, color: "var(--foreground, #0F172A)" }}
                  contentStyle={{
                    backgroundColor: "var(--card, #FFFFFF)",
                    borderColor: "var(--border, #E2E8F0)",
                    color: "var(--card-foreground, #0F172A)",
                    borderRadius: "8px",
                    fontSize: 12,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  formatter={(value) => {
                    const item = data.find((d) => d.name === value);
                    const pct = item ? ` (${item.percentage}%)` : "";
                    return (
                      <span className="text-[11px] text-muted-foreground font-medium px-1">
                        {value}{pct}
                      </span>
                    );
                  }}
                  wrapperStyle={{ fontSize: 11, paddingTop: 8, direction: isArabic ? "rtl" : "ltr" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
