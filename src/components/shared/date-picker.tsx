"use client";

import * as React from "react";
import { format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DatePickerProps {
  value?: Date;
  onChange?: (date?: Date) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  clearable?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  clearable = true,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const locale = useLocale();
  const t = useTranslations("forms");
  const dateFnsLocale = locale === "ar" ? arSA : enUS;

  const displayPlaceholder = placeholder || t("datePlaceholder");

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
                !value && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="me-2 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {value
                  ? format(value, "PPP", { locale: dateFnsLocale })
                  : displayPlaceholder}
              </span>
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(selectedDate) => {
              onChange?.(selectedDate);
              setOpen(false);
            }}
            locale={dateFnsLocale}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      {clearable && value && !disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange?.(undefined);
          }}
          className="absolute end-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Clear date"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
