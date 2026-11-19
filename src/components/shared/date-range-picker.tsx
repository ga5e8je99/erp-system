"use client";

import * as React from "react";
import { format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range?: DateRange) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  clearable?: boolean;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  clearable = true,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const locale = useLocale();
  const t = useTranslations("forms");
  const dateFnsLocale = locale === "ar" ? arSA : enUS;

  const displayPlaceholder = placeholder || t("dateRangePlaceholder");

  const formattedText = React.useMemo(() => {
    if (!value?.from) return displayPlaceholder;
    if (value.to) {
      return `${format(value.from, "PP", { locale: dateFnsLocale })} - ${format(
        value.to,
        "PP",
        { locale: dateFnsLocale }
      )}`;
    }
    return format(value.from, "PP", { locale: dateFnsLocale });
  }, [value, displayPlaceholder, dateFnsLocale]);

  return (
    <div className={cn("relative flex items-center", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full justify-start text-start font-normal h-9 text-xs sm:text-sm",
                !value?.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="me-2 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{formattedText}</span>
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
            locale={dateFnsLocale}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      {clearable && value?.from && !disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange?.(undefined);
          }}
          className="absolute end-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Clear date range"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
