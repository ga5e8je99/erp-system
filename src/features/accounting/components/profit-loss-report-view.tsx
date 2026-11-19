"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfitLossReport } from "../types";
import { ReportHeader } from "./report-header";
import { formatCurrency } from "@/lib/money";

interface ProfitLossReportViewProps {
  report: ProfitLossReport;
  startDate?: string;
  endDate?: string;
}

export function ProfitLossReportView({
  report,
  startDate,
  endDate,
}: ProfitLossReportViewProps) {
  const t = useTranslations("accounting.reports");

  const exportCsv = () => {
    const lines = [
      ["قائمة الدخل (الأرباح والخسائر)"],
      [`الفترة من: ${startDate || "البداية"} إلى: ${endDate || "اليوم"}`],
      [""],
      ["البيان", "المبلغ"],
      ["-- الإيرادات التشغيلية --", ""],
      ...report.revenue.items.map((i) => [`"${i.code} - ${i.name}"`, i.amount.toFixed(2)]),
      ["إجمالي الإيرادات", report.revenue.total.toFixed(2)],
      [""],
      ["-- تكلفة المبيعات (COGS) --", ""],
      ...report.cogs.items.map((i) => [`"${i.code} - ${i.name}"`, i.amount.toFixed(2)]),
      ["إجمالي تكلفة المبيعات", report.cogs.total.toFixed(2)],
      [""],
      ["مجمل الربح (Gross Profit)", report.grossProfit.toFixed(2)],
      [""],
      ["-- المصروفات التشغيلية والإدارية --", ""],
      ...report.operatingExpenses.items.map((i) => [`"${i.code} - ${i.name}"`, i.amount.toFixed(2)]),
      ["إجمالي المصروفات", report.operatingExpenses.total.toFixed(2)],
      [""],
      ["صافي الربح / الخسارة (Net Income)", report.netIncome.toFixed(2)],
    ];

    const csvContent =
      "\uFEFF" + lines.map((l) => (Array.isArray(l) ? l.join(",") : l)).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `income-statement-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <ReportHeader
        title={t("profitLossTitle")}
        description={t("profitLossDesc")}
        startDate={startDate}
        endDate={endDate}
        onExportCsv={exportCsv}
      />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* 1. Revenues Section */}
        <Card>
          <CardHeader className="py-3 border-b bg-muted/30">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-semibold">{t("revenuesSection")}</CardTitle>
              <span className="font-mono font-bold text-base" dir="ltr">
                {formatCurrency(report.revenue.total)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/30">
              {report.revenue.items.length === 0 ? (
                <div className="py-3 px-4 text-xs text-muted-foreground">{t("noRevenues")}</div>
              ) : (
                report.revenue.items.map((item) => (
                  <div key={item.code} className="flex justify-between py-2 px-4 text-sm hover:bg-muted/20">
                    <span className="text-muted-foreground">
                      <span className="font-mono text-xs me-2" dir="ltr">{item.code}</span>
                      {item.name}
                    </span>
                    <span className="font-mono tabular-nums font-medium" dir="ltr">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2. COGS Section */}
        <Card>
          <CardHeader className="py-3 border-b bg-muted/30">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-semibold">{t("cogsSection")}</CardTitle>
              <span className="font-mono font-bold text-base text-rose-600 dark:text-rose-400" dir="ltr">
                ({formatCurrency(report.cogs.total)})
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/30">
              {report.cogs.items.length === 0 ? (
                <div className="py-3 px-4 text-xs text-muted-foreground">{t("noCogs")}</div>
              ) : (
                report.cogs.items.map((item) => (
                  <div key={item.code} className="flex justify-between py-2 px-4 text-sm hover:bg-muted/20">
                    <span className="text-muted-foreground">
                      <span className="font-mono text-xs me-2" dir="ltr">{item.code}</span>
                      {item.name}
                    </span>
                    <span className="font-mono tabular-nums font-medium" dir="ltr">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gross Profit Banner */}
        <div className="flex justify-between items-center p-4 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 font-bold text-lg">
          <span className="text-teal-900 dark:text-teal-100">{t("grossProfit")}:</span>
          <span className="font-mono text-teal-700 dark:text-teal-300" dir="ltr">
            {formatCurrency(report.grossProfit)}
          </span>
        </div>

        {/* 3. Operating Expenses Section */}
        <Card>
          <CardHeader className="py-3 border-b bg-muted/30">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-semibold">{t("operatingExpensesSection")}</CardTitle>
              <span className="font-mono font-bold text-base text-rose-600 dark:text-rose-400" dir="ltr">
                ({formatCurrency(report.operatingExpenses.total)})
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/30">
              {report.operatingExpenses.items.length === 0 ? (
                <div className="py-3 px-4 text-xs text-muted-foreground">{t("noExpenses")}</div>
              ) : (
                report.operatingExpenses.items.map((item) => (
                  <div key={item.code} className="flex justify-between py-2 px-4 text-sm hover:bg-muted/20">
                    <span className="text-muted-foreground">
                      <span className="font-mono text-xs me-2" dir="ltr">{item.code}</span>
                      {item.name}
                    </span>
                    <span className="font-mono tabular-nums font-medium" dir="ltr">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Net Income Banner */}
        <div
          className={`flex justify-between items-center p-5 rounded-lg border text-xl font-bold ${
            report.netIncome >= 0
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100"
          }`}
        >
          <span>{report.netIncome >= 0 ? t("netProfit") : t("netLoss")}:</span>
          <span className="font-mono tracking-tight" dir="ltr">
            {formatCurrency(report.netIncome)}
          </span>
        </div>
      </div>
    </div>
  );
}
