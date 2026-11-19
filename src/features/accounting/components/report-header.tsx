"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ReportHeaderProps {
  title: string;
  description: string;
  startDate?: string;
  endDate?: string;
  onExportCsv?: () => void;
  hideDateFilter?: boolean;
}

export function ReportHeader({
  title,
  description,
  startDate,
  endDate,
  onExportCsv,
  hideDateFilter = false,
}: ReportHeaderProps) {
  const t = useTranslations("accounting.reports");
  const router = useRouter();
  const pathname = usePathname();

  const [from, setFrom] = React.useState(startDate || "");
  const [to, setTo] = React.useState(endDate || "");

  const handleApplyFilter = () => {
    const params = new URLSearchParams();
    if (from) params.set("startDate", from);
    if (to) params.set("endDate", to);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b print:border-none">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {!hideDateFilter && (
          <div className="flex items-center gap-1.5 bg-card border rounded-lg p-1">
            <span className="text-xs text-muted-foreground ps-2">{t("from")}:</span>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 w-36 text-xs"
            />
            <span className="text-xs text-muted-foreground">{t("to")}:</span>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 w-36 text-xs"
            />
            <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={handleApplyFilter}>
              {t("filter")}
            </Button>
          </div>
        )}

        {onExportCsv && (
          <Button variant="outline" size="sm" onClick={onExportCsv}>
            <Download className="h-4 w-4 me-1.5" />
            {t("exportCsv")}
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 me-1.5" />
          {t("print")}
        </Button>
      </div>
    </div>
  );
}
