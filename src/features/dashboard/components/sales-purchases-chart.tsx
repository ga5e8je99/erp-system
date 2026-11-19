"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SalesVsPurchasesMonth } from "../types";
import { useLocale } from "next-intl";

interface SalesPurchasesChartProps {
  data: SalesVsPurchasesMonth[];
}

export function SalesPurchasesChart({ data }: SalesPurchasesChartProps) {
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
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          {isArabic ? "المبيعات مقابل المشتريات (آخر 12 شهراً)" : "Sales vs Purchases (Last 12 Months)"}
        </CardTitle>
        <CardDescription className="text-xs">
          {isArabic
            ? "مقارنة شهرية لحجم المبيعات المحققة مقابل فواتير الشراء"
            : "Monthly comparison of issued sales revenue against purchases"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full pt-4">
          {!mounted ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {isArabic ? "جاري تحميل الرسم البياني..." : "Loading chart..."}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={45}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                  width={40}
                />
                <Tooltip
                  formatter={(val: unknown) => [`${formatNumber(Number(val))}`, ""]}
                  labelStyle={{ fontWeight: "bold", fontSize: 12 }}
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, paddingBottom: 10 }}
                />
                <Bar
                  dataKey="sales"
                  name={isArabic ? "المبيعات" : "Sales"}
                  fill="#0F766E"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="purchases"
                  name={isArabic ? "المشتريات" : "Purchases"}
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
