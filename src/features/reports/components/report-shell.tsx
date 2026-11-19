"use client";

import * as React from "react";
import { useRouter, usePathname, Link } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import {
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface ReportShellProps {
  title: string;
  description: string;
  moduleName: string;
  onExportCsv?: () => void;
  showDateFilter?: boolean;
  showSearch?: boolean;
  searchPlaceholder?: string;
  extraFilters?: React.ReactNode;
  children: React.ReactNode;
}

export function ReportShell({
  title,
  description,
  moduleName,
  onExportCsv,
  showDateFilter = true,
  showSearch = true,
  searchPlaceholder,
  extraFilters,
  children,
}: ReportShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const isArabic = locale === "ar";
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  const [from, setFrom] = React.useState(searchParams.get("from") || "");
  const [to, setTo] = React.useState(searchParams.get("to") || "");
  const [search, setSearch] = React.useState(searchParams.get("search") || "");

  const handleApplyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (from) params.set("from", from);
    else params.delete("from");

    if (to) params.set("to", to);
    else params.delete("to");

    if (search) params.set("search", search);
    else params.delete("search");

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleResetFilters = () => {
    setFrom("");
    setTo("");
    setSearch("");
    router.push(pathname);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header - Hidden on Print */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/reports" className="hover:underline flex items-center gap-1">
              <BackIcon className="h-3 w-3" />
              <span>{isArabic ? "مركز التقارير" : "Reports Center"}</span>
            </Link>
            <span>/</span>
            <span>{moduleName}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>

        <div className="flex items-center gap-2">
          {onExportCsv && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportCsv}
              className="gap-2 text-xs h-9"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>{isArabic ? "تصدير Excel (CSV)" : "Export CSV"}</span>
            </Button>
          )}

          <Button
            variant="default"
            size="sm"
            onClick={handlePrint}
            className="gap-2 text-xs h-9"
          >
            <Printer className="h-4 w-4" />
            <span>{isArabic ? "طباعة التقرير" : "Print Report"}</span>
          </Button>
        </div>
      </div>

      {/* Filter Toolbar - Hidden on Print */}
      <Card className="print:hidden bg-muted/20">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            {showSearch && (
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute start-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    searchPlaceholder ||
                    (isArabic ? "بحث في التقرير..." : "Search report...")
                  }
                  className="h-8 ps-8 text-xs bg-background"
                  onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                />
              </div>
            )}

            {showDateFilter && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {isArabic ? "من:" : "From:"}
                  </span>
                  <Input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="h-8 text-xs w-36 bg-background"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {isArabic ? "إلى:" : "To:"}
                  </span>
                  <Input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="h-8 text-xs w-36 bg-background"
                  />
                </div>
              </>
            )}

            {extraFilters}

            <div className="flex items-center gap-1.5 ms-auto">
              <Button
                size="sm"
                onClick={handleApplyFilters}
                className="h-8 px-3 text-xs gap-1"
              >
                <Filter className="h-3 w-3" />
                <span>{isArabic ? "تطبيق" : "Apply"}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-8 px-2 text-xs text-muted-foreground"
                title={isArabic ? "إعادة ضبط" : "Reset"}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print-Only Header */}
      <div className="hidden print:block border-b pb-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
          <div className="text-end text-xs text-gray-500">
            <div>نظام مسار لإدارة الموارد (Masar ERP)</div>
            <div>تاريخ الاستخراج: {new Date().toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}</div>
            {from && to && (
              <div>الفترة: {from} إلى {to}</div>
            )}
          </div>
        </div>
      </div>

      {/* Report Content Table */}
      <div className="print:w-full">{children}</div>
    </div>
  );
}
