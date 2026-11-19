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
import { SalesVsPurchasesMonth } from "../types";
import { useLocale } from "next-intl";
import { formatNumber } from "@/lib/formatters";

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

  const formatVal = (num: number) => {
    return formatNumber(num, { locale: isArabic ? "ar-EG" : "en-US", decimals: 0 });
  };

  return (
    <Card className="col-span-full lg:col-span-2 flex flex-col justify-between">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 gap-2">
        <div>
          <CardTitle className="text-sm font-semibold">
            {isArabic ? "المبيعات مقابل المشتريات (آخر 12 شهراً)" : "Sales vs Purchases (Last 12 Months)"}
          </CardTitle>
          <CardDescription className="text-xs">
            {isArabic
              ? "مقارنة شهرية لحجم المبيعات المحققة مقابل فواتير الشراء"
              : "Monthly comparison of issued sales revenue against purchases"}
          </CardDescription>
        </div>
        {/* Custom RTL-safe HTML legend with consistent spacing */}
        <div className="flex items-center gap-4 text-xs font-medium shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#0F766E]" />
            <span className="text-muted-foreground">{isArabic ? "المبيعات" : "Sales"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
            <span className="text-muted-foreground">{isArabic ? "المشتريات" : "Purchases"}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2 flex-1">
        {!mounted ? (
          <div className="flex h-[280px] items-center justify-center text-xs text-muted-foreground">
            {isArabic ? "جاري تحميل الرسم البياني..." : "Loading chart..."}
          </div>
        ) : (
          <div dir="ltr" className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{
                  top: 10,
                  right: 15,
                  left: 5,
                  bottom: 20,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #E2E8F0)" opacity={0.5} vertical={false} />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground, #64748B)" }}
                  tickFormatter={(val: string) => {
                    // Show just the short month to prevent overlapping 12 full date strings
                    if (typeof val === "string") {
                      return val.split(" ")[0];
                    }
                    return val;
                  }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={38}
                  stroke="var(--border, #E2E8F0)"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground, #64748B)" }}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                  width={45}
                  stroke="var(--border, #E2E8F0)"
                />
                <Tooltip
                  wrapperStyle={{ direction: isArabic ? "rtl" : "ltr" }}
                  formatter={(val: unknown, name?: unknown) => [
                    `${formatVal(Number(val))} ${isArabic ? "ج.م" : "EGP"}`,
                    name === "sales" || name === (isArabic ? "المبيعات" : "Sales")
                      ? (isArabic ? "المبيعات" : "Sales")
                      : (isArabic ? "المشتريات" : "Purchases"),
                  ]}
                  labelFormatter={(label) => `${isArabic ? "الفترة" : "Period"}: ${label}`}
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
                <Bar
                  dataKey="sales"
                  name={isArabic ? "المبيعات" : "Sales"}
                  fill="#0F766E"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
                <Bar
                  dataKey="purchases"
                  name={isArabic ? "المشتريات" : "Purchases"}
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
