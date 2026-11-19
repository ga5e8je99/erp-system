"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgingReport } from "../types";
import { ReportHeader } from "./report-header";
import { formatCurrency } from "@/lib/money";

interface AgingReportViewProps {
  report: AgingReport;
  asOfDate?: string;
}

export function AgingReportView({ report, asOfDate }: AgingReportViewProps) {
  const t = useTranslations("accounting.reports");
  const router = useRouter();
  const pathname = usePathname();

  const handleTypeChange = (val: string) => {
    const params = new URLSearchParams();
    params.set("type", val);
    if (asOfDate) params.set("asOfDate", asOfDate);
    router.push(`${pathname}?${params.toString()}`);
  };

  const exportCsv = () => {
    const title =
      report.type === "CUSTOMERS" ? "تقرير أعمار ديون العملاء" : "تقرير أعمار ديون الموردين";
    const headers = [
      "الرمز",
      "الاسم",
      "الهاتف",
      "0-30 يوم",
      "31-60 يوم",
      "61-90 يوم",
      "+90 يوم",
      "الإجمالي المستحق",
    ];

    const rows = report.rows.map((r) => [
      `"${r.entityCode}"`,
      `"${r.entityName}"`,
      `"${r.phone || ""}"`,
      r.bucket0to30.toFixed(2),
      r.bucket31to60.toFixed(2),
      r.bucket61to90.toFixed(2),
      r.bucket90Plus.toFixed(2),
      r.totalDue.toFixed(2),
    ]);

    const totalsRow = [
      `"الإجمالي"`,
      `""`,
      `""`,
      report.totals.bucket0to30.toFixed(2),
      report.totals.bucket31to60.toFixed(2),
      report.totals.bucket61to90.toFixed(2),
      report.totals.bucket90Plus.toFixed(2),
      report.totals.totalDue.toFixed(2),
    ];

    const csvContent =
      "\uFEFF" +
      [
        `"${title}"`,
        `"كما في تاريخ: ${asOfDate || new Date().toLocaleDateString("ar-EG")}"`,
        headers.join(","),
        ...rows.map((r) => r.join(",")),
        totalsRow.join(","),
      ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `aging-${report.type.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <ReportHeader
        title={t("agingTitle")}
        description={t("agingDesc")}
        endDate={asOfDate}
        onExportCsv={exportCsv}
      />

      {/* Tabs Switcher: Customers vs Suppliers */}
      <div className="flex items-center justify-between">
        <Tabs value={report.type} onValueChange={handleTypeChange} className="w-auto">
          <TabsList>
            <TabsTrigger value="CUSTOMERS">{t("customersAging")}</TabsTrigger>
            <TabsTrigger value="SUPPLIERS">{t("suppliersAging")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-muted/60 text-muted-foreground border-b text-xs font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">{t("code")}</th>
                <th className="py-3 px-4 text-start">{t("name")}</th>
                <th className="py-3 px-4 text-end">{t("bucket0to30")}</th>
                <th className="py-3 px-4 text-end">{t("bucket31to60")}</th>
                <th className="py-3 px-4 text-end">{t("bucket61to90")}</th>
                <th className="py-3 px-4 text-end">{t("bucket90Plus")}</th>
                <th className="py-3 px-4 text-end">{t("totalDue")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {report.rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    {t("noAgingRecordsFound")}
                  </td>
                </tr>
              ) : (
                report.rows.map((row) => (
                  <tr key={row.entityId} className="hover:bg-muted/30">
                    <td className="py-3 px-4 font-mono text-xs font-medium" dir="ltr">
                      {row.entityCode}
                    </td>
                    <td className="py-3 px-4 font-medium">{row.entityName}</td>
                    <td className="py-3 px-4 text-end font-mono tabular-nums" dir="ltr">
                      {row.bucket0to30 > 0 ? formatCurrency(row.bucket0to30) : "-"}
                    </td>
                    <td className="py-3 px-4 text-end font-mono tabular-nums" dir="ltr">
                      {row.bucket31to60 > 0 ? formatCurrency(row.bucket31to60) : "-"}
                    </td>
                    <td className="py-3 px-4 text-end font-mono tabular-nums" dir="ltr">
                      {row.bucket61to90 > 0 ? formatCurrency(row.bucket61to90) : "-"}
                    </td>
                    <td className="py-3 px-4 text-end font-mono tabular-nums text-rose-600 dark:text-rose-400 font-semibold" dir="ltr">
                      {row.bucket90Plus > 0 ? formatCurrency(row.bucket90Plus) : "-"}
                    </td>
                    <td className="py-3 px-4 text-end font-mono tabular-nums font-bold text-primary" dir="ltr">
                      {formatCurrency(row.totalDue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="border-t bg-muted/70 font-bold">
              <tr>
                <td colSpan={2} className="py-3 px-4 text-start">
                  {t("totals")}
                </td>
                <td className="py-3 px-4 text-end font-mono tabular-nums" dir="ltr">
                  {formatCurrency(report.totals.bucket0to30)}
                </td>
                <td className="py-3 px-4 text-end font-mono tabular-nums" dir="ltr">
                  {formatCurrency(report.totals.bucket31to60)}
                </td>
                <td className="py-3 px-4 text-end font-mono tabular-nums" dir="ltr">
                  {formatCurrency(report.totals.bucket61to90)}
                </td>
                <td className="py-3 px-4 text-end font-mono tabular-nums text-rose-600 dark:text-rose-400" dir="ltr">
                  {formatCurrency(report.totals.bucket90Plus)}
                </td>
                <td className="py-3 px-4 text-end font-mono tabular-nums text-primary text-base" dir="ltr">
                  {formatCurrency(report.totals.totalDue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
