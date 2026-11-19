"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { FullCompanySettingsInput } from "../schemas";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useLocale } from "next-intl";

interface TaxRatesTabProps {
  form: UseFormReturn<FullCompanySettingsInput>;
}

export function TaxRatesTab({ form }: TaxRatesTabProps) {
  const locale = useLocale();
  const isArabic = locale === "ar";

  return (
    <div className="space-y-6 max-w-xl">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            {isArabic ? "نسبة ضريبة القيمة المضافة الافتراضية (%)" : "Default VAT Tax Rate (%)"}
          </Label>
          <div className="relative">
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              {...form.register("defaultTaxRate", { valueAsNumber: true })}
              className="text-xs h-9 pe-8 font-mono"
            />
            <span className="absolute end-3 top-2.5 text-xs text-muted-foreground font-bold">
              %
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {isArabic
              ? "النسبة القياسية المطبقة على فواتير المبيعات والشراء (مثلاً: 14% في مصر، 15% في السعودية)"
              : "Standard VAT rate applied to invoice lines (e.g. 14% Egypt, 15% Saudi Arabia)"}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            {isArabic ? "الرقم الضريبي المعتمد (Tax ID)" : "Tax Registration Number"}
          </Label>
          <Input
            {...form.register("taxNumber")}
            placeholder="300000000000003"
            className="text-xs h-9 font-mono"
          />
          <p className="text-[11px] text-muted-foreground">
            {isArabic
              ? "يظهر في ترويسة الفواتير المطبوعة والمستندات الضريبية الرسمية"
              : "Appears in invoice headers and legal tax vouchers"}
          </p>
        </div>
      </div>
    </div>
  );
}
