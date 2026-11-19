"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fromMinorUnits, toMinorUnits } from "@/lib/money";

export interface CurrencyInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange"> {
  /** Value stored as integer minor units (e.g. 1050 = 10.50) */
  value?: number;
  /** Emits integer minor units on change */
  onChange?: (minorUnits: number) => void;
  currency?: string;
  decimals?: number;
}

export function CurrencyInput({
  value,
  onChange,
  currency = "ر.س",
  decimals = 2,
  className,
  disabled,
  placeholder = "0.00",
  ...props
}: CurrencyInputProps) {
  // Convert minor units to display string
  const [displayValue, setDisplayValue] = React.useState<string>(() => {
    if (value === undefined || value === null) return "";
    return fromMinorUnits(value, decimals).toFixed(decimals);
  });

  // Sync internal state when external value changes
  React.useEffect(() => {
    if (value === undefined || value === null) {
      setDisplayValue("");
      return;
    }
    setDisplayValue((prev) => {
      const currentNumeric = parseFloat(prev || "0");
      const targetNumeric = fromMinorUnits(value, decimals);
      if (Math.abs(currentNumeric - targetNumeric) > 0.0001) {
        return targetNumeric.toFixed(decimals);
      }
      return prev;
    });
  }, [value, decimals]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Allow empty or partial decimal numbers like "10." or "0."
    if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
      setDisplayValue(raw);

      if (raw === "" || raw === ".") {
        onChange?.(0);
      } else {
        const parsed = parseFloat(raw);
        if (!Number.isNaN(parsed)) {
          onChange?.(toMinorUnits(parsed, decimals));
        }
      }
    }
  };

  const handleBlur = () => {
    if (!displayValue || displayValue === ".") {
      setDisplayValue("");
      onChange?.(0);
      return;
    }
    const parsed = parseFloat(displayValue);
    if (!Number.isNaN(parsed)) {
      setDisplayValue(parsed.toFixed(decimals));
      onChange?.(toMinorUnits(parsed, decimals));
    }
  };

  return (
    <div className="relative flex items-center">
      <Input
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "pe-12 text-start font-mono text-sm tabular-nums",
          className
        )}
        {...props}
      />
      <div className="pointer-events-none absolute end-3 flex items-center text-xs font-medium text-muted-foreground select-none">
        {currency}
      </div>
    </div>
  );
}
