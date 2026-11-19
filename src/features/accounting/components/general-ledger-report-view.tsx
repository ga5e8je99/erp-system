"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter, usePathname } from "@/i18n/routing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GeneralLedgerReport } from "../types";
import { ReportHeader } from "./report-header";
import { formatCurrency } from "@/lib/money";

interface GeneralLedgerReportViewProps {
  report: GeneralLedgerReport;
  accounts: { id: string; code: string; name: string; label: string }[];
  selectedAccountId?: string;
  startDate?: string;
  endDate?: string;
}

export function GeneralLedgerReportView({
  report,
  accounts,
  selectedAccountId,
  startDate,
  endDate,
}: GeneralLedgerReportViewProps) {
  const t = useTranslations("accounting.reports");
  const router = useRouter();
  const pathname = usePathname();

  const handleAccountChange = (accId: string | null) => {
    if (!accId) return;
    const params = new URLSearchParams();
    params.set("accountId", accId);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    router.push(`${pathname}?${params.toString()}`);
  };

  const exportCsv = () => {
    if (!report.account) return;

    const headers = ["التاريخ", "رقم القيد", "البيان", "نوع المصدر", "مدين", "دائن", "الرصيد"];

    const openingRow = [
      `""`,
      `""`,
      `"رصيد أول المدة"`,
      `""`,
      `""`,
      `""`,
      report.beginningBalance.toFixed(2),
    ];

    const rows = report.lines.map((l) => [
      `"${new Date(l.date).toLocaleDateString("ar-EG")}"`,
      `"${l.entryNumber}"`,
      `"${l.description.replace(/"/g, '""')}"`,
      `"${l.sourceType || "يدوي"}"`,
      l.debit > 0 ? l.debit.toFixed(2) : "",
      l.credit > 0 ? l.credit.toFixed(2) : "",
      l.balanceAfter.toFixed(2),
    ]);

    const closingRow = [
      `""`,
      `""`,
      `"رصيد ختامي"`,
      `""`,
      report.totalDebit.toFixed(2),
      report.totalCredit.toFixed(2),
      report.endingBalance.toFixed(2),
    ];

    const csvContent =
      "\uFEFF" +
      [
        `"حساب: ${report.account.code} - ${report.account.name}"`,
        headers.join(","),
        openingRow.join(","),
        ...rows.map((r) => r.join(",")),
        closingRow.join(","),
      ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `general-ledger-${report.account.code}-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <ReportHeader
        title={t("generalLedgerTitle")}
        description={t("generalLedgerDesc")}
        startDate={startDate}
        endDate={endDate}
        onExportCsv={exportCsv}
      />

      {/* Account Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg bg-card">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <span className="text-sm font-semibold shrink-0">{t("selectAccount")}:</span>
          <Select
            value={report.account?.id || selectedAccountId}
            onValueChange={handleAccountChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("selectAccountPlaceholder")} />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {report.account && (
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">{t("openingBalance")}:</span>
              <span className="font-mono font-semibold" dir="ltr">
                {formatCurrency(report.beginningBalance)}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">{t("closingBalance")}:</span>
              <span className="font-mono font-bold text-primary" dir="ltr">
                {formatCurrency(report.endingBalance)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Ledger Table */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-muted/60 text-muted-foreground border-b text-xs font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">{t("date")}</th>
                <th className="py-3 px-4 text-start">{t("entryNumber")}</th>
                <th className="py-3 px-4 text-start">{t("description")}</th>
                <th className="py-3 px-4 text-start">{t("sourceType")}</th>
                <th className="py-3 px-4 text-end">{t("debit")}</th>
                <th className="py-3 px-4 text-end">{t("credit")}</th>
                <th className="py-3 px-4 text-end">{t("runningBalance")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {/* Opening balance row */}
              <tr className="bg-muted/20 font-medium">
                <td colSpan={6} className="py-2.5 px-4 text-muted-foreground">
                  {t("openingBalancePrior")}
                </td>
                <td className="py-2.5 px-4 text-end font-mono tabular-nums font-semibold" dir="ltr">
                  {formatCurrency(report.beginningBalance)}
                </td>
              </tr>

              {report.lines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    {t("noMovementsInPeriod")}
                  </td>
                </tr>
              ) : (
                report.lines.map((line) => (
                  <tr key={line.id} className="hover:bg-muted/30">
                    <td className="py-2.5 px-4 text-muted-foreground">
                      {new Date(line.date).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium" dir="ltr">
                      <Link
                        href={`/accounting/journal/${line.entryId}`}
                        className="text-primary hover:underline"
                      >
                        {line.entryNumber}
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 max-w-sm truncate" title={line.description}>
                      {line.description}
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge variant="outline" className="text-xs font-normal">
                        {line.sourceType || "يدوي"}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-end font-mono tabular-nums font-medium" dir="ltr">
                      {line.debit > 0 ? formatCurrency(line.debit) : "-"}
                    </td>
                    <td className="py-2.5 px-4 text-end font-mono tabular-nums font-medium" dir="ltr">
                      {line.credit > 0 ? formatCurrency(line.credit) : "-"}
                    </td>
                    <td className="py-2.5 px-4 text-end font-mono tabular-nums font-semibold" dir="ltr">
                      {formatCurrency(line.balanceAfter)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="border-t bg-muted/50 font-bold">
              <tr>
                <td colSpan={4} className="py-3 px-4 text-start">
                  {t("periodTotals")}
                </td>
                <td className="py-3 px-4 text-end font-mono tabular-nums" dir="ltr">
                  {formatCurrency(report.totalDebit)}
                </td>
                <td className="py-3 px-4 text-end font-mono tabular-nums" dir="ltr">
                  {formatCurrency(report.totalCredit)}
                </td>
                <td className="py-3 px-4 text-end font-mono tabular-nums text-primary" dir="ltr">
                  {formatCurrency(report.endingBalance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
