"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BalanceSheetReport } from "../types";
import { ReportHeader } from "./report-header";
import { formatCurrency } from "@/lib/money";

interface BalanceSheetReportViewProps {
  report: BalanceSheetReport;
  asOfDate?: string;
}

export function BalanceSheetReportView({
  report,
  asOfDate,
}: BalanceSheetReportViewProps) {
  const t = useTranslations("accounting.reports");

  const exportCsv = () => {
    const lines = [
      ["الميزانية العمومية (قائمة المركز المالي)"],
      [`كما في تاريخ: ${asOfDate || new Date().toLocaleDateString("ar-EG")}`],
      [""],
      ["البيان", "المبلغ"],
      ["=== 1. الأصول (ASSETS) ===", ""],
      ["-- الأصول المتداولة --", ""],
      ...report.assets.currentAssets.items.map((i) => [`"${i.code} - ${i.name}"`, i.amount.toFixed(2)]),
      ["إجمالي الأصول المتداولة", report.assets.currentAssets.total.toFixed(2)],
      [""],
      ["-- الأصول الثابتة --", ""],
      ...report.assets.fixedAssets.items.map((i) => [`"${i.code} - ${i.name}"`, i.amount.toFixed(2)]),
      ["إجمالي الأصول الثابتة", report.assets.fixedAssets.total.toFixed(2)],
      [""],
      ["إجمالي الأصول (Total Assets)", report.assets.totalAssets.toFixed(2)],
      [""],
      ["=== 2. الالتزامات (LIABILITIES) ===", ""],
      ["-- الالتزامات المتداولة --", ""],
      ...report.liabilities.currentLiabilities.items.map((i) => [`"${i.code} - ${i.name}"`, i.amount.toFixed(2)]),
      ["إجمالي الالتزامات المتداولة", report.liabilities.currentLiabilities.total.toFixed(2)],
      [""],
      ["-- الالتزامات طويلة الأجل --", ""],
      ...report.liabilities.longTermLiabilities.items.map((i) => [`"${i.code} - ${i.name}"`, i.amount.toFixed(2)]),
      ["إجمالي الالتزامات", report.liabilities.totalLiabilities.toFixed(2)],
      [""],
      ["=== 3. حقوق الملكية (EQUITY) ===", ""],
      ...report.equity.items.map((i) => [`"${i.code} - ${i.name}"`, i.amount.toFixed(2)]),
      ["أرباح وخسائر الفترة الحالية (من قائمة الدخل)", report.equity.currentPeriodIncome.toFixed(2)],
      ["إجمالي حقوق الملكية", report.equity.totalEquity.toFixed(2)],
      [""],
      ["إجمالي الالتزامات وحقوق الملكية", report.totalLiabilitiesAndEquity.toFixed(2)],
    ];

    const csvContent =
      "\uFEFF" + lines.map((l) => (Array.isArray(l) ? l.join(",") : l)).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `balance-sheet-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <ReportHeader
        title={t("balanceSheetTitle")}
        description={t("balanceSheetDesc")}
        endDate={asOfDate}
        hideDateFilter={false}
        onExportCsv={exportCsv}
      />

      {/* Verification Banner */}
      <div
        className={`p-3.5 rounded-lg border flex items-center justify-between text-sm ${
          report.isBalanced
            ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
            : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
        }`}
      >
        <div className="flex items-center gap-2">
          {report.isBalanced ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span className="font-semibold">{t("balanceSheetBalanced")}</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
              <span className="font-semibold">{t("balanceSheetUnbalanced")}</span>
            </>
          )}
        </div>
        <div className="font-mono text-xs" dir="ltr">
          {formatCurrency(report.assets.totalAssets)} = {formatCurrency(report.totalLiabilitiesAndEquity)}
        </div>
      </div>

      {/* Grid: Assets on one side, Liabilities + Equity on the other */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Assets */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span>{t("assets")}</span>
            <span className="text-xs font-normal text-muted-foreground">(1000)</span>
          </h2>

          {/* Current Assets */}
          <Card>
            <CardHeader className="py-3 border-b bg-muted/30">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-semibold">{t("currentAssets")}</CardTitle>
                <span className="font-mono font-semibold" dir="ltr">
                  {formatCurrency(report.assets.currentAssets.total)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/30">
                {report.assets.currentAssets.items.map((item) => (
                  <div key={item.code} className="flex justify-between py-2 px-4 text-sm hover:bg-muted/20">
                    <span className="text-muted-foreground truncate">
                      <span className="font-mono text-xs me-2" dir="ltr">{item.code}</span>
                      {item.name}
                    </span>
                    <span className="font-mono tabular-nums" dir="ltr">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Fixed Assets */}
          <Card>
            <CardHeader className="py-3 border-b bg-muted/30">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-semibold">{t("fixedAssets")}</CardTitle>
                <span className="font-mono font-semibold" dir="ltr">
                  {formatCurrency(report.assets.fixedAssets.total)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/30">
                {report.assets.fixedAssets.items.length === 0 ? (
                  <div className="py-3 px-4 text-xs text-muted-foreground">{t("noFixedAssets")}</div>
                ) : (
                  report.assets.fixedAssets.items.map((item) => (
                    <div key={item.code} className="flex justify-between py-2 px-4 text-sm hover:bg-muted/20">
                      <span className="text-muted-foreground truncate">
                        <span className="font-mono text-xs me-2" dir="ltr">{item.code}</span>
                        {item.name}
                      </span>
                      <span className="font-mono tabular-nums" dir="ltr">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Total Assets Footer */}
          <div className="flex justify-between items-center p-4 rounded-lg bg-primary/10 border border-primary/20 font-bold text-base">
            <span>{t("totalAssets")}:</span>
            <span className="font-mono text-primary text-lg" dir="ltr">
              {formatCurrency(report.assets.totalAssets)}
            </span>
          </div>
        </div>

        {/* Right: Liabilities & Equity */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span>{t("liabilitiesAndEquity")}</span>
            <span className="text-xs font-normal text-muted-foreground">(2000 & 3000)</span>
          </h2>

          {/* Current Liabilities */}
          <Card>
            <CardHeader className="py-3 border-b bg-muted/30">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-semibold">{t("currentLiabilities")}</CardTitle>
                <span className="font-mono font-semibold" dir="ltr">
                  {formatCurrency(report.liabilities.currentLiabilities.total)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/30">
                {report.liabilities.currentLiabilities.items.map((item) => (
                  <div key={item.code} className="flex justify-between py-2 px-4 text-sm hover:bg-muted/20">
                    <span className="text-muted-foreground truncate">
                      <span className="font-mono text-xs me-2" dir="ltr">{item.code}</span>
                      {item.name}
                    </span>
                    <span className="font-mono tabular-nums" dir="ltr">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Equity */}
          <Card>
            <CardHeader className="py-3 border-b bg-muted/30">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-semibold">{t("equity")}</CardTitle>
                <span className="font-mono font-semibold" dir="ltr">
                  {formatCurrency(report.equity.totalEquity)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/30">
                {report.equity.items.map((item) => (
                  <div key={item.code} className="flex justify-between py-2 px-4 text-sm hover:bg-muted/20">
                    <span className="text-muted-foreground truncate">
                      <span className="font-mono text-xs me-2" dir="ltr">{item.code}</span>
                      {item.name}
                    </span>
                    <span className="font-mono tabular-nums" dir="ltr">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
                {/* Current Period Income row */}
                <div className="flex justify-between py-2 px-4 text-sm bg-muted/20 font-medium">
                  <span className="text-foreground">{t("currentPeriodNetIncome")}</span>
                  <span
                    className={`font-mono tabular-nums font-semibold ${
                      report.equity.currentPeriodIncome >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                    dir="ltr"
                  >
                    {formatCurrency(report.equity.currentPeriodIncome)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Liabilities & Equity Footer */}
          <div className="flex justify-between items-center p-4 rounded-lg bg-primary/10 border border-primary/20 font-bold text-base">
            <span>{t("totalLiabilitiesAndEquity")}:</span>
            <span className="font-mono text-primary text-lg" dir="ltr">
              {formatCurrency(report.totalLiabilitiesAndEquity)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
