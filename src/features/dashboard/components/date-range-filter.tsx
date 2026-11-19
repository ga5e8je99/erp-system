"use client";

import * as React from "react";
import { useRouter, usePathname } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DashboardPeriodPreset } from "../types";

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();

  const currentPreset = (searchParams.get("period") as DashboardPeriodPreset) || "month";
  const [fromInput, setFromInput] = React.useState(searchParams.get("from") || "");
  const [toInput, setToInput] = React.useState(searchParams.get("to") || "");
  const [isCustomOpen, setIsCustomOpen] = React.useState(false);

  React.useEffect(() => {
    setFromInput(searchParams.get("from") || "");
    setToInput(searchParams.get("to") || "");
  }, [searchParams]);

  const presets: Array<{ key: DashboardPeriodPreset; labelAr: string; labelEn: string }> = [
    { key: "today", labelAr: "اليوم", labelEn: "Today" },
    { key: "month", labelAr: "هذا الشهر", labelEn: "This Month" },
    { key: "last_month", labelAr: "الشهر السابق", labelEn: "Last Month" },
    { key: "quarter", labelAr: "هذا الربع", labelEn: "This Quarter" },
    { key: "year", labelAr: "هذه السنة", labelEn: "This Year" },
  ];

  const handleSelectPreset = (preset: DashboardPeriodPreset) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", preset);
    params.delete("from");
    params.delete("to");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleApplyCustom = () => {
    if (!fromInput || !toInput) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", "custom");
    params.set("from", fromInput);
    params.set("to", toInput);
    setIsCustomOpen(false);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
        {presets.map((p) => {
          const isActive = currentPreset === p.key;
          return (
            <Button
              key={p.key}
              variant={isActive ? "default" : "ghost"}
              size="xs"
              className={`h-7 px-2.5 text-xs font-medium ${isActive ? "shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              onClick={() => handleSelectPreset(p.key)}
            >
              {locale === "ar" ? p.labelAr : p.labelEn}
            </Button>
          );
        })}
      </div>

      <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
        <PopoverTrigger
          render={
            <Button
              variant={currentPreset === "custom" ? "default" : "outline"}
              size="xs"
              className="h-9 gap-1.5 px-3 text-xs"
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>
                {currentPreset === "custom" && fromInput && toInput
                  ? `${fromInput} ~ ${toInput}`
                  : locale === "ar"
                    ? "مخصص"
                    : "Custom"}
              </span>
            </Button>
          }
        />
        <PopoverContent align="end" className="w-72 p-4 space-y-3">
          <div className="text-xs font-semibold text-foreground">
            {locale === "ar" ? "تحديد فترة مخصصة" : "Select Custom Range"}
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">
                {locale === "ar" ? "من تاريخ" : "From Date"}
              </label>
              <Input
                type="date"
                value={fromInput}
                onChange={(e) => setFromInput(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">
                {locale === "ar" ? "إلى تاريخ" : "To Date"}
              </label>
              <Input
                type="date"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <Button
            size="sm"
            className="w-full text-xs h-8"
            onClick={handleApplyCustom}
            disabled={!fromInput || !toInput}
          >
            {locale === "ar" ? "تطبيق التصفية" : "Apply Filter"}
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
