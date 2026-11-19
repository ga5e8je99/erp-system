"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CashFlowMonthItem } from "../types";
import { useLocale } from "next-intl";

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

  const formatNumber = (num: number) => {
    return num.toLocaleString("en-US");
  };

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          {isArabic ? "اتجاه التدفق النقدي (آخر 6 أشهر)" : "Cash Flow Trend (Last 6 Months)"}
        </CardTitle>
        <CardDescription className="text-xs">
          {isArabic
            ? "مقارنة المقبوضات النقدية والمدفوعات وصافي السيولة"
            : "Cash inflows vs outflows and net monthly change"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full pt-4">
          {!mounted ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {isArabic ? "جاري التحميل..." : "Loading..."}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={40}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                  width={40}
                />
                <Tooltip
                  formatter={(val: unknown) => [`${formatNumber(Number(val))}`, ""]}
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
          )}
        </div>
      </CardContent>
    </Card>
  );
}
