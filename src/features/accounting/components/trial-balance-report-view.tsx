"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { TrialBalanceReport } from "../types";
import { ReportHeader } from "./report-header";
import { formatCurrency } from "@/lib/money";

interface TrialBalanceReportViewProps {
  report: TrialBalanceReport;
  startDate?: string;
  endDate?: string;
}

export function TrialBalanceReportView({
  report,
  startDate,
  endDate,
}: TrialBalanceReportViewProps) {
  const t = useTranslations("accounting.reports");

  const isBalanced =
    Math.abs(report.totals.endingDebit - report.totals.endingCredit) < 0.05 &&
    Math.abs(report.totals.periodDebit - report.totals.periodCredit) < 0.05;

  const exportCsv = () => {
    const headers = [
      "رمز الحساب",
      "اسم الحساب",
      "رصيد أول مدين",
      "رصيد أول دائن",
      "حركات الفترة مدين",
      "حركات الفترة دائن",
      "رصيد ختامي مدين",
      "رصيد ختامي دائن",
    ];

    const rows = report.rows.map((r) => [
      `"${r.accountCode}"`,
      `"${r.accountName}"`,
      r.beginningDebit.toFixed(2),
      r.beginningCredit.toFixed(2),
      r.periodDebit.toFixed(2),
      r.periodCredit.toFixed(2),
      r.endingDebit.toFixed(2),
      r.endingCredit.toFixed(2),
    ]);

    const totalsRow = [
      `"الإجمالي"`,
      `""`,
      report.totals.beginningDebit.toFixed(2),
      report.totals.beginningCredit.toFixed(2),
      report.totals.periodDebit.toFixed(2),
      report.totals.periodCredit.toFixed(2),
      report.totals.endingDebit.toFixed(2),
      report.totals.endingCredit.toFixed(2),
    ];

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((row) => row.join(",")), totalsRow.join(",")].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `trial-balance-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <ReportHeader
        title={t("trialBalanceTitle")}
        description={t("trialBalanceDesc")}
        startDate={startDate}
        endDate={endDate}
        onExportCsv={exportCsv}
      />

      {/* Balance Verification Banner */}
      <div
        className={`p-3 rounded-lg border flex items-center justify-between text-sm ${
          isBalanced
            ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
            : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
        }`}
      >
        <div className="flex items-center gap-2">
          {isBalanced ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span className="font-semibold">{t("trialBalanceBalanced")}</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
              <span className="font-semibold">{t("trialBalanceUnbalanced")}</span>
            </>
          )}
        </div>
      </div>

      {/* Table Card */}
      <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-start">
            <thead className="bg-muted/70 text-muted-foreground border-b text-xs font-semibold">
              <tr>
                <th rowSpan={2} className="py-3 px-3 text-start border-e">{t("accountCode")}</th>
                <th rowSpan={2} className="py-3 px-3 text-start border-e">{t("accountName")}</th>
                <th colSpan={2} className="py-2 px-3 text-center border-e bg-muted/90">{t("beginningBalance")}</th>
                <th colSpan={2} className="py-2 px-3 text-center border-e bg-muted/50">{t("periodMovements")}</th>
                <th colSpan={2} className="py-2 px-3 text-center bg-muted/90">{t("endingBalance")}</th>
              </tr>
              <tr className="border-t text-[11px]">
                <th className="py-1 px-3 text-end">{t("debit")}</th>
                <th className="py-1 px-3 text-end border-e">{t("credit")}</th>
                <th className="py-1 px-3 text-end">{t("debit")}</th>
                <th className="py-1 px-3 text-end border-e">{t("credit")}</th>
                <th className="py-1 px-3 text-end">{t("debit")}</th>
                <th className="py-1 px-3 text-end">{t("credit")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {report.rows.map((row) => {
                const isZero =
                  row.beginningDebit === 0 &&
                  row.beginningCredit === 0 &&
                  row.periodDebit === 0 &&
                  row.periodCredit === 0 &&
                  row.endingDebit === 0 &&
                  row.endingCredit === 0;

                return (
                  <tr
                    key={row.accountId}
                    className={`hover:bg-muted/30 ${
                      !row.isPostable ? "font-semibold bg-muted/15" : ""
                    } ${isZero ? "opacity-50" : ""}`}
                  >
                    <td className="py-2.5 px-3 font-mono border-e" dir="ltr">
                      {row.accountCode}
                    </td>
                    <td className="py-2.5 px-3 border-e font-medium truncate max-w-[200px]">
                      {row.accountName}
                    </td>

                    {/* Beginning */}
                    <td className="py-2.5 px-3 text-end font-mono tabular-nums" dir="ltr">
                      {row.beginningDebit > 0 ? formatCurrency(row.beginningDebit) : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono tabular-nums border-e" dir="ltr">
                      {row.beginningCredit > 0 ? formatCurrency(row.beginningCredit) : "-"}
                    </td>

                    {/* Period */}
                    <td className="py-2.5 px-3 text-end font-mono tabular-nums font-semibold" dir="ltr">
                      {row.periodDebit > 0 ? formatCurrency(row.periodDebit) : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono tabular-nums font-semibold border-e" dir="ltr">
                      {row.periodCredit > 0 ? formatCurrency(row.periodCredit) : "-"}
                    </td>

                    {/* Ending */}
                    <td className="py-2.5 px-3 text-end font-mono tabular-nums font-bold text-primary" dir="ltr">
                      {row.endingDebit > 0 ? formatCurrency(row.endingDebit) : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono tabular-nums font-bold text-primary" dir="ltr">
                      {row.endingCredit > 0 ? formatCurrency(row.endingCredit) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 bg-muted/80 font-bold">
              <tr>
                <td colSpan={2} className="py-3 px-3 text-start border-e">
                  {t("totals")}
                </td>
                <td className="py-3 px-3 text-end font-mono tabular-nums" dir="ltr">
                  {formatCurrency(report.totals.beginningDebit)}
                </td>
                <td className="py-3 px-3 text-end font-mono tabular-nums border-e" dir="ltr">
                  {formatCurrency(report.totals.beginningCredit)}
                </td>
                <td className="py-3 px-3 text-end font-mono tabular-nums" dir="ltr">
                  {formatCurrency(report.totals.periodDebit)}
                </td>
                <td className="py-3 px-3 text-end font-mono tabular-nums border-e" dir="ltr">
                  {formatCurrency(report.totals.periodCredit)}
                </td>
                <td className="py-3 px-3 text-end font-mono tabular-nums text-primary" dir="ltr">
                  {formatCurrency(report.totals.endingDebit)}
                </td>
                <td className="py-3 px-3 text-end font-mono tabular-nums text-primary" dir="ltr">
                  {formatCurrency(report.totals.endingCredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
