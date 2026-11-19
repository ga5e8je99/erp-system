"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TaxSummaryReport } from "../types";
import { ReportHeader } from "./report-header";
import { formatCurrency } from "@/lib/money";

interface TaxSummaryReportViewProps {
  report: TaxSummaryReport;
  startDate?: string;
  endDate?: string;
}

export function TaxSummaryReportView({
  report,
  startDate,
  endDate,
}: TaxSummaryReportViewProps) {
  const t = useTranslations("accounting.reports");

  const exportCsv = () => {
    const lines = [
      ["تقرير ملخص وإقرار ضريبة القيمة المضافة (VAT Summary)"],
      [`الفترة من: ${startDate || "البداية"} إلى: ${endDate || "اليوم"}`],
      [""],
      ["البيان", "القيمة الخاضعة للضريبة", "مبلغ الضريبة"],
      ["-- 1. ضريبة المخرجات (المبيعات) --", "", ""],
      ["المبيعات المحلية الخاضعة للضريبة", report.salesTaxableAmount.toFixed(2), report.salesTaxAmount.toFixed(2)],
      ["مرتجعات المبيعات (تخفيض الضريبة)", report.salesReturnsTaxableAmount.toFixed(2), `-${report.salesReturnsTaxAmount.toFixed(2)}`],
      ["صافي ضريبة المخرجات", "", report.netOutputTax.toFixed(2)],
      [""],
      ["-- 2. ضريبة المدخلات (المشتريات) --", "", ""],
      ["المشتريات المحلية الخاضعة للضريبة", report.purchasesTaxableAmount.toFixed(2), report.purchasesTaxAmount.toFixed(2)],
      ["مرتجعات المشتريات (تخفيض الضريبة)", report.purchasesReturnsTaxableAmount.toFixed(2), `-${report.purchasesReturnsTaxAmount.toFixed(2)}`],
      ["صافي ضريبة المدخلات", "", report.netInputTax.toFixed(2)],
      [""],
      ["-- 3. صافي الضريبة المستحقة / (المستردة) --", "", ""],
      [
        report.netTaxPayable >= 0 ? "صافي ضريبة مستحقة السداد" : "رصيد ضريبي دائن قابل للاسترداد",
        "",
        report.netTaxPayable.toFixed(2),
      ],
    ];

    const csvContent =
      "\uFEFF" + lines.map((l) => (Array.isArray(l) ? l.join(",") : l)).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `tax-summary-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <ReportHeader
        title={t("taxSummaryTitle")}
        description={t("taxSummaryDesc")}
        startDate={startDate}
        endDate={endDate}
        onExportCsv={exportCsv}
      />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Net Tax Result Card */}
        <div
          className={`p-6 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            report.netTaxPayable >= 0
              ? "bg-amber-50/70 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
              : "bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
          }`}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              {t("vatReturnSummary")}
            </span>
            <h2 className="text-xl font-bold text-foreground">
              {report.netTaxPayable >= 0 ? t("netTaxPayable") : t("netTaxRefundable")}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("taxEquationDesc")}
            </p>
          </div>
          <div className="text-end">
            <span
              className={`text-3xl font-extrabold font-mono tracking-tight ${
                report.netTaxPayable >= 0
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-emerald-700 dark:text-emerald-300"
              }`}
              dir="ltr"
            >
              {formatCurrency(Math.abs(report.netTaxPayable))}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Output Tax (Sales) */}
          <Card>
            <CardHeader className="py-4 border-b bg-muted/30">
              <CardTitle className="text-base font-semibold">{t("outputTaxSection")}</CardTitle>
              <CardDescription>{t("outputTaxDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{t("taxableSales")}:</span>
                <span className="font-mono tabular-nums font-medium" dir="ltr">
                  {formatCurrency(report.salesTaxableAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{t("salesTaxAmount")}:</span>
                <span className="font-mono tabular-nums font-semibold" dir="ltr">
                  {formatCurrency(report.salesTaxAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-rose-600 dark:text-rose-400">
                <span>{t("salesReturnsTax")}:</span>
                <span className="font-mono tabular-nums font-semibold" dir="ltr">
                  -{formatCurrency(report.salesReturnsTaxAmount)}
                </span>
              </div>
              <div className="pt-3 border-t flex justify-between items-center font-bold text-base">
                <span>{t("netOutputTax")}:</span>
                <span className="font-mono text-primary" dir="ltr">
                  {formatCurrency(report.netOutputTax)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 2. Input Tax (Purchases) */}
          <Card>
            <CardHeader className="py-4 border-b bg-muted/30">
              <CardTitle className="text-base font-semibold">{t("inputTaxSection")}</CardTitle>
              <CardDescription>{t("inputTaxDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{t("taxablePurchases")}:</span>
                <span className="font-mono tabular-nums font-medium" dir="ltr">
                  {formatCurrency(report.purchasesTaxableAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{t("purchasesTaxAmount")}:</span>
                <span className="font-mono tabular-nums font-semibold" dir="ltr">
                  {formatCurrency(report.purchasesTaxAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-rose-600 dark:text-rose-400">
                <span>{t("purchasesReturnsTax")}:</span>
                <span className="font-mono tabular-nums font-semibold" dir="ltr">
                  -{formatCurrency(report.purchasesReturnsTaxAmount)}
                </span>
              </div>
              <div className="pt-3 border-t flex justify-between items-center font-bold text-base">
                <span>{t("netInputTax")}:</span>
                <span className="font-mono text-primary" dir="ltr">
                  {formatCurrency(report.netInputTax)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
