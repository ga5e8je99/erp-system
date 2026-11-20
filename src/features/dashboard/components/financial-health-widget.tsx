import React from "react";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Wallet,
  Scale,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { DashboardKpis } from "../types";
import { formatCurrency } from "@/lib/formatters";

interface FinancialHealthWidgetProps {
  kpis: DashboardKpis;
  locale: string;
}

export function FinancialHealthWidget({ kpis, locale }: FinancialHealthWidgetProps) {
  const isArabic = locale === "ar";
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;

  const cash = kpis.cashAndBankBalance || 0;
  const receivables = kpis.receivablesOutstanding || 0;
  const payables = kpis.payablesOutstanding || 0;

  // Quick / Liquid assets (Cash + Receivables)
  const quickAssets = cash + receivables;
  // Working capital (Quick assets minus short-term obligations)
  const workingCapital = quickAssets - payables;

  // Quick Ratio (Acid-Test Ratio) = Quick Assets / Current Liabilities
  let quickRatio = 1.0;
  let quickRatioText = "1.00x";
  let hasInfiniteLiquidity = false;

  if (payables > 0) {
    quickRatio = quickAssets / payables;
    quickRatioText = `${quickRatio.toFixed(2)}x`;
  } else if (quickAssets > 0) {
    quickRatio = 10.0;
    quickRatioText = "> 10x";
    hasInfiniteLiquidity = true;
  } else {
    quickRatioText = "0.00x";
  }

  // Determine financial status
  const isStrong = quickRatio >= 1.5;
  const isBalanced = quickRatio >= 1.0 && quickRatio < 1.5;

  // Relative percentages for progress visualization
  const totalAssetsAndObligations = quickAssets + payables;
  let cashPct = 50;
  let recPct = 0;
  let payPct = 0;

  if (totalAssetsAndObligations > 0) {
    cashPct = Math.round((cash / totalAssetsAndObligations) * 100);
    recPct = Math.round((receivables / totalAssetsAndObligations) * 100);
    payPct = Math.max(0, 100 - cashPct - recPct);
  }

  // Coverage percentage
  const coveragePercent = payables > 0 ? Math.round((quickAssets / payables) * 100) : 100;

  const formatMoney = (val: number) => {
    return formatCurrency(val, { locale: isArabic ? "ar-EG" : "en-US", decimals: 2 });
  };

  return (
    <Card className="col-span-full lg:col-span-2 flex flex-col justify-between">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 gap-2">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>{isArabic ? "مؤشرات الصحة المالية والسيولة" : "Financial Health & Liquidity Ratios"}</span>
          </CardTitle>
          <CardDescription className="text-xs">
            {isArabic
              ? "معدل تغطية الالتزامات قصيرة الأجل وصافي رأس المال العامل"
              : "Working capital health and short-term obligation coverage"}
          </CardDescription>
        </div>

        {/* Status Badge */}
        <div className="shrink-0">
          {isStrong ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1.5 py-1 px-2.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isArabic ? "سيولة قوية وممتازة" : "Strong Liquidity"}</span>
            </Badge>
          ) : isBalanced ? (
            <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30 gap-1.5 py-1 px-2.5">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              <span>{isArabic ? "وضع متوازن ومستقر" : "Balanced Position"}</span>
            </Badge>
          ) : (
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1.5 py-1 px-2.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>{isArabic ? "تحت المراقبة" : "Caution / Monitor"}</span>
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-2 flex-1 flex flex-col justify-between gap-4">
        {/* 1. Top 2 Ratio KPI Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Working Capital */}
          <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5 transition-colors hover:bg-muted/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium">{isArabic ? "صافي رأس المال العامل" : "Net Working Capital"}</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Wallet className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-xl font-bold font-mono tracking-tight text-foreground">
              {formatMoney(workingCapital)}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate">
                {isArabic ? "السيولة النقدية + ذمم العملاء - الموردين" : "Liquid cash + receivables - payables"}
              </span>
            </div>
          </div>

          {/* Quick Ratio (Acid-Test) */}
          <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5 transition-colors hover:bg-muted/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium">{isArabic ? "نسبة السيولة السريعة (Acid Test)" : "Quick Ratio (Acid Test)"}</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Scale className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono tracking-tight text-foreground">
                {quickRatioText}
              </span>
              <span
                className={`text-xs font-semibold ${
                  quickRatio >= 1.0 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                }`}
              >
                {quickRatio >= 1.0 ? (isArabic ? "✓ نطاق آمن" : "✓ Safe") : (isArabic ? "⚠️ منخفض" : "⚠️ Low")}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="truncate">
                {isArabic ? "المعيار المالي الآمن ≥ 1.0x" : "Safe industry standard ≥ 1.0x"}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Breakdown Visual Bar & Values */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">
              {isArabic ? "توزيع هيكل الأصول السريعة والالتزامات" : "Quick Assets vs Obligations"}
            </span>
            <span className="font-mono text-[11px] font-medium text-foreground">
              {isArabic
                ? `تغطية الالتزامات: ${hasInfiniteLiquidity ? "100%" : `${coveragePercent}%`}`
                : `Coverage: ${hasInfiniteLiquidity ? "100%" : `${coveragePercent}%`}`}
            </span>
          </div>

          {/* Multi-segment stacked progress bar */}
          <div className="h-2.5 w-full rounded-full bg-muted/60 overflow-hidden flex">
            <div
              style={{ width: `${cashPct}%` }}
              className="bg-emerald-500 transition-all duration-300"
              title={`${isArabic ? "نقد وبنوك" : "Cash & Bank"}: ${cashPct}%`}
            />
            <div
              style={{ width: `${recPct}%` }}
              className="bg-sky-500 transition-all duration-300"
              title={`${isArabic ? "ذمم العملاء" : "Receivables"}: ${recPct}%`}
            />
            {payPct > 0 && (
              <div
                style={{ width: `${payPct}%` }}
                className="bg-amber-500 transition-all duration-300"
                title={`${isArabic ? "مستحقات الموردين" : "Payables"}: ${payPct}%`}
              />
            )}
          </div>

          {/* 3 Metric Sub-stats */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">{isArabic ? "نقد وبنوك" : "Cash & Bank"}</span>
              </div>
              <span className="font-mono font-medium text-xs text-foreground mt-0.5 truncate">
                {formatMoney(cash)}
              </span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0" />
                <span className="truncate">{isArabic ? "ذمم العملاء" : "Receivables"}</span>
              </div>
              <span className="font-mono font-medium text-xs text-foreground mt-0.5 truncate">
                {formatMoney(receivables)}
              </span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                <span className="truncate">{isArabic ? "مستحقات الموردين" : "Payables"}</span>
              </div>
              <span className="font-mono font-medium text-xs text-foreground mt-0.5 truncate">
                {formatMoney(payables)}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Bottom Notice & Direct Action Link */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 border-t">
          <div className="flex items-center gap-2 text-muted-foreground">
            {isStrong ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <span className="text-[11px] leading-relaxed">
              {payables === 0
                ? isArabic
                  ? "لا توجد التزامات مستحقة للموردين حالياً؛ تغطي السيولة المتاحة خطط التشغيل بالكامل بأمان."
                  : "No supplier obligations due; liquid reserves fully secure operations."
                : isStrong
                ? isArabic
                  ? `الأصول السائلة تغطي التزامات الموردين بنسبة فائقة (${coveragePercent}%)، مما يمنح الشركة استقراراً عالياً.`
                  : `Liquid assets comfortably cover payables (${coveragePercent}%), ensuring high stability.`
                : isBalanced
                ? isArabic
                  ? `نسبة التغطية (${coveragePercent}%) متوازنة وتكفي لسداد الالتزامات المستحقة في مواعيدها.`
                  : `Coverage ratio (${coveragePercent}%) is balanced and sufficient to meet liabilities.`
                : isArabic
                ? "الالتزامات تتجاوز السيولة السريعة، يوصى بمتابعة تسريع تحصيل فواتير العملاء."
                : "Obligations exceed quick assets; prioritize collecting customer receivables."}
            </span>
          </div>

          <Button asChild variant="ghost" size="xs" className="h-7 text-xs text-primary gap-1 shrink-0 self-end sm:self-auto">
            <Link href="/accounting/reports/balance-sheet">
              <span>{isArabic ? "الميزانية العمومية" : "Balance Sheet"}</span>
              <ArrowIcon className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
