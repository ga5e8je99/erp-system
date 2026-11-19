"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CashFlowMonthItem } from "../types";
import { useLocale } from "next-intl";
import { formatNumber } from "@/lib/formatters";

interface CashFlowChartProps {
  data: CashFlowMonthItem[];
}

export function CashFlowChart({ data }: CashFlowChartProps) {
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
            {isArabic ? "اتجاه التدفق النقدي (آخر 6 أشهر)" : "Cash Flow Trend (Last 6 Months)"}
          </CardTitle>
          <CardDescription className="text-xs">
            {isArabic
              ? "مقارنة المقبوضات النقدية والمدفوعات وصافي السيولة"
              : "Cash inflows vs outflows and net monthly change"}
          </CardDescription>
        </div>
        {/* Custom RTL-safe HTML legend with consistent spacing */}
        <div className="flex items-center gap-4 text-xs font-medium shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
            <span className="text-muted-foreground">{isArabic ? "المقبوضات (الداخل)" : "Inflow"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#F43F5E]" />
            <span className="text-muted-foreground">{isArabic ? "المدفوعات (الخارج)" : "Outflow"}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2 flex-1">
        {!mounted ? (
          <div className="flex h-[280px] items-center justify-center text-xs text-muted-foreground">
            {isArabic ? "جاري التحميل..." : "Loading..."}
          </div>
        ) : (
          <div dir="ltr" className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{
                  top: 10,
                  right: 15,
                  left: 5,
                  bottom: 20,
                }}
              >
                <defs>
                  <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #E2E8F0)" opacity={0.5} vertical={false} />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground, #64748B)" }}
                  tickFormatter={(val: string) => {
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
                    name === "inflow" || name === (isArabic ? "المقبوضات (الداخل)" : "Inflow")
                      ? (isArabic ? "المقبوضات" : "Inflow")
                      : (isArabic ? "المدفوعات" : "Outflow"),
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
                <Area
                  type="monotone"
                  dataKey="inflow"
                  name={isArabic ? "المقبوضات (الداخل)" : "Inflow"}
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorInflow)"
                />
                <Area
                  type="monotone"
                  dataKey="outflow"
                  name={isArabic ? "المدفوعات (الخارج)" : "Outflow"}
                  stroke="#F43F5E"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorOutflow)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
