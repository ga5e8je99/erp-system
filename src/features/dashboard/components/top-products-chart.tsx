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
import { Button } from "@/components/ui/button";
import { TopProductItem } from "../types";
import { useLocale } from "next-intl";
import { formatNumber } from "@/lib/formatters";
import { BarChart3, ListFilter, Package } from "lucide-react";

interface TopProductsChartProps {
  data: TopProductItem[];
}

export function TopProductsChart({ data }: TopProductsChartProps) {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const [mounted, setMounted] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"list" | "chart">("list");

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const formatVal = (num: number) => {
    return formatNumber(num, { locale: isArabic ? "ar-EG" : "en-US", decimals: 0 });
  };

  const maxRevenue = React.useMemo(() => {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map((p) => p.totalRevenue), 1);
  }, [data]);

  const rankColors = [
    { badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700", bar: "from-amber-500 to-amber-600" },
    { badge: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-300 dark:border-sky-700", bar: "from-sky-500 to-sky-600" },
    { badge: "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-300 dark:border-teal-700", bar: "from-teal-500 to-teal-600" },
    { badge: "bg-muted text-muted-foreground border-border", bar: "from-slate-500 to-slate-600" },
    { badge: "bg-muted text-muted-foreground border-border", bar: "from-slate-500 to-slate-600" },
  ];

  return (
    <Card className="col-span-full md:col-span-1 flex flex-col justify-between">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-semibold">
            {isArabic ? "أعلى 5 منتجات مبيعاً" : "Top 5 Products by Revenue"}
          </CardTitle>
          <CardDescription className="text-xs">
            {isArabic ? "المنتجات الأكثر مساهمة في الإيرادات" : "Highest revenue contributing items"}
          </CardDescription>
        </div>
        {data.length > 0 && (
          <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/30">
            <Button
              type="button"
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-6 w-6 rounded-md"
              title={isArabic ? "عرض قائمة تفصيلية" : "List view"}
              onClick={() => setViewMode("list")}
            >
              <ListFilter className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant={viewMode === "chart" ? "secondary" : "ghost"}
              size="icon"
              className="h-6 w-6 rounded-md"
              title={isArabic ? "عرض مخطط بياني" : "Chart view"}
              onClick={() => setViewMode("chart")}
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-2 flex-1 flex flex-col justify-center">
        {!mounted ? (
          <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
            {isArabic ? "جاري التحميل..." : "Loading..."}
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-[260px] flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
            <Package className="h-8 w-8 opacity-30" />
            <span>{isArabic ? "لا توجد بيانات مبيعات في هذه الفترة" : "No sales data in this period"}</span>
          </div>
        ) : viewMode === "list" ? (
          /* Sleek Progress List View (100% RTL compliant, zero clipping or overlap bugs) */
          <div className="flex flex-col justify-around h-[260px] space-y-2 py-1">
            {data.map((item, idx) => {
              const pct = Math.min(100, Math.max(8, Math.round((item.totalRevenue / maxRevenue) * 100)));
              const color = rankColors[idx] || rankColors[3];
              return (
                <div key={item.id} className="group flex flex-col gap-1 p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold border ${color.badge}`}>
                        {idx + 1}
                      </span>
                      <span
                        className="font-medium text-foreground truncate max-w-[150px] sm:max-w-[180px]"
                        title={item.name}
                      >
                        {item.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
                        ({item.sku})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 font-mono">
                      <span className="font-bold text-foreground">
                        {formatVal(item.totalRevenue)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {isArabic ? "ج.م" : "EGP"}
                      </span>
                    </div>
                  </div>
                  {/* Visual percentage bar */}
                  <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${color.bar} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Modern Recharts Column BarChart in explicit LTR direction to prevent coordinate inversion */
          <div dir="ltr" className="h-[260px] w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #E2E8F0)" opacity={0.5} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground, #64748B)" }}
                  tickFormatter={(_val, index) => `#${index + 1}`}
                  stroke="var(--border, #E2E8F0)"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground, #64748B)" }}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                  width={35}
                  stroke="var(--border, #E2E8F0)"
                />
                <Tooltip
                  wrapperStyle={{ direction: isArabic ? "rtl" : "ltr" }}
                  formatter={(val: unknown) => [
                    `${formatVal(Number(val))} ${isArabic ? "ج.م" : "EGP"}`,
                    isArabic ? "الإيراد" : "Revenue",
                  ]}
                  labelFormatter={(_label, payload) => {
                    const item = payload?.[0]?.payload as TopProductItem | undefined;
                    return item ? `${item.name} (${item.sku})` : "";
                  }}
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
                  dataKey="totalRevenue"
                  name={isArabic ? "الإيراد" : "Revenue"}
                  fill="#0F766E"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
