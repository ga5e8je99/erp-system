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

  const formatNumber = (num: number) => {
    return num.toLocaleString("en-US");
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
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  width={90}
                />
                <Tooltip
                  formatter={(val: unknown, _name: unknown, item: { payload?: { quantitySold?: number } }) => [
                    `${formatNumber(Number(val))} (${item.payload?.quantitySold ?? 0} ${isArabic ? "قطعة" : "units"})`,
                    isArabic ? "الإيرادات" : "Revenue",
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="totalRevenue"
                  fill="#0284C7"
                  radius={[0, 4, 4, 0]}
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
