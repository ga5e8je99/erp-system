"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { FullCompanySettingsInput } from "../schemas";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "next-intl";

interface CurrencyNumbersTabProps {
  form: UseFormReturn<FullCompanySettingsInput>;
}

export function CurrencyNumbersTab({ form }: CurrencyNumbersTabProps) {
  const locale = useLocale();
  const isArabic = locale === "ar";

  const currency = form.watch("currency");
  const currencySymbol = form.watch("currencySymbol");
  const decimalPlaces = form.watch("decimalPlaces");
  const useArabicIndicDigits = form.watch("useArabicIndicDigits");

  const currencies = [
    { code: "EGP", symbol: "ج.م", nameAr: "جنيه مصري", nameEn: "Egyptian Pound" },
    { code: "SAR", symbol: "ر.س", nameAr: "ريال سعودي", nameEn: "Saudi Riyal" },
    { code: "AED", symbol: "د.إ", nameAr: "درهم إماراتي", nameEn: "UAE Dirham" },
    { code: "USD", symbol: "$", nameAr: "دولار أمريكي", nameEn: "US Dollar" },
    { code: "EUR", symbol: "€", nameAr: "يورو أوروبي", nameEn: "Euro" },
  ];

  const handleCurrencyChange = (val: string) => {
    form.setValue("currency", val, { shouldDirty: true });
    const matched = currencies.find((c) => c.code === val);
    if (matched) {
      form.setValue("currencySymbol", matched.symbol, { shouldDirty: true });
    }
  };

  const sampleAmount = 14250.75;
  const formattedSample = sampleAmount.toLocaleString(
    useArabicIndicDigits && isArabic ? "ar-EG-u-nu-arab" : "en-US",
    {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Currency selection */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {isArabic ? "العملة الأساسية للنظام" : "Base Currency"}
            </Label>
            <Select value={currency} onValueChange={(val) => { if (val) handleCurrencyChange(val); }}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="اختر العملة" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.code} value={c.code} className="text-xs">
                    {c.code} — {isArabic ? c.nameAr : c.nameEn} ({c.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {isArabic ? "رمز العملة المختصر" : "Currency Symbol"}
            </Label>
            <Input
              {...form.register("currencySymbol")}
              placeholder="ج.م"
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {isArabic ? "عدد الخانات العشرية للمبالغ" : "Decimal Places"}
            </Label>
            <Select
              value={String(decimalPlaces)}
              onValueChange={(val) => {
                if (val) form.setValue("decimalPlaces", Number(val), { shouldDirty: true });
              }}
            >
              <SelectTrigger className="text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0" className="text-xs">0 (15000)</SelectItem>
                <SelectItem value="2" className="text-xs">2 (15000.00)</SelectItem>
                <SelectItem value="3" className="text-xs">3 (15000.000)</SelectItem>
                <SelectItem value="4" className="text-xs">4 (15000.0000)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Number formatting & preview */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold">
                  {isArabic ? "استخدام الأرقام الهندية / الشرقية (١، ٢، ٣)" : "Use Arabic-Indic Numerals"}
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isArabic
                    ? "تفعيل عرض الأرقام والمبالغ بالرسم الشرقي عند اختيار الواجهة العربية"
                    : "Display numbers using Arabic-Indic digits in Arabic mode"}
                </p>
              </div>
              <Switch
                checked={useArabicIndicDigits}
                onCheckedChange={(checked) =>
                  form.setValue("useArabicIndicDigits", checked, { shouldDirty: true })
                }
              />
            </div>

            <div className="border-t border-border/60 pt-3">
              <span className="text-[11px] text-muted-foreground block mb-1 font-medium">
                {isArabic ? "معاينة تنسيق المبالغ المالية:" : "Currency Display Preview:"}
              </span>
              <div className="text-xl font-bold font-mono tracking-tight text-primary">
                {formattedSample} {currencySymbol}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
