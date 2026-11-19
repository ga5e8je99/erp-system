"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TopProductItem } from "../types";
import { useLocale } from "next-intl";
import { formatNumber } from "@/lib/formatters";

interface TopProductsChartProps {
  data: TopProductItem[];
}

export function TopProductsChart({ data }: TopProductsChartProps) {
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
          {isArabic ? "أعلى 5 منتجات مبيعاً" : "Top 5 Products by Revenue"}
        </CardTitle>
        <CardDescription className="text-xs">
          {isArabic ? "المنتجات الأكثر مساهمة في الإيرادات" : "Highest revenue contributing items"}
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
              {isArabic ? "لا توجد بيانات مبيعات في هذه الفترة" : "No sales data in this period"}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{
                  top: 5,
                  right: isArabic ? 10 : 25,
                  left: isArabic ? 25 : 10,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                  stroke="hsl(var(--border))"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  orientation={isArabic ? "right" : "left"}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  width={90}
                  stroke="hsl(var(--border))"
                />
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
                <Bar
                  dataKey="totalRevenue"
                  name={isArabic ? "الإيراد" : "Revenue"}
                  fill="hsl(var(--primary))"
                  radius={isArabic ? [4, 0, 0, 4] : [0, 4, 4, 0]}
                  maxBarSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
