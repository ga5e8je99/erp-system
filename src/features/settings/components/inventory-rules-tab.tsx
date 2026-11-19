"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { FullCompanySettingsInput } from "../schemas";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "next-intl";

interface InventoryRulesTabProps {
  form: UseFormReturn<FullCompanySettingsInput>;
}

export function InventoryRulesTab({ form }: InventoryRulesTabProps) {
  const locale = useLocale();
  const isArabic = locale === "ar";

  const allowNegativeStock = form.watch("allowNegativeStock");
  const costingMethod = form.watch("costingMethod");

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="border-b pb-3">
        <h3 className="text-sm font-semibold">
          {isArabic ? "قواعد وسياسات المستودعات والمخزون" : "Inventory & Warehouse Policies"}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isArabic
            ? "التحكم في قيود الصرف المخزني وطريقة احتساب تكلفة البضاعة المباعة"
            : "Manage stock depletion controls and inventory costing methodologies"}
        </p>
      </div>

      <div className="space-y-4">
        {/* Allow Negative Stock */}
        <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
          <div className="space-y-0.5 max-w-md">
            <Label className="text-xs font-semibold">
              {isArabic ? "السماح بالرصيد السالب للمخزون" : "Allow Negative Stock"}
            </Label>
            <p className="text-[11px] text-muted-foreground">
              {isArabic
                ? "في حال التعطيل، يمنع النظام إصدار الفواتير أو تسليم البضاعة إذا كانت الكمية المطلوبة غير متوفرة في المستودع المحدد"
                : "When disabled, prevents sales delivery and invoice issuance if on-hand quantity is insufficient"}
            </p>
          </div>
          <Switch
            checked={allowNegativeStock}
            onCheckedChange={(checked) =>
              form.setValue("allowNegativeStock", checked, { shouldDirty: true })
            }
          />
        </div>

        {/* Costing Method */}
        <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
          <Label className="text-xs font-semibold">
            {isArabic ? "طريقة تقييم تكلفة المخزون (Costing Method)" : "Inventory Costing Method"}
          </Label>
          <p className="text-[11px] text-muted-foreground">
            {isArabic
              ? "الخوارزمية المحاسبية المعتمدة لإعادة حساب تكلفة الوحدة عند استلام بضاعة جديدة"
              : "Algorithm used to recompute product cost basis upon goods receipts"}
          </p>
          <Select
            value={costingMethod}
            onValueChange={(val) => {
              if (val) form.setValue("costingMethod", val as "WAC" | "FIFO" | "LIFO", { shouldDirty: true });
            }}
          >
            <SelectTrigger className="text-xs h-9 w-72 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WAC" className="text-xs">
                {isArabic ? "المتوسط المرجح للتكلفة (WAC) — موصى به" : "Weighted Average Cost (WAC) — Recommended"}
              </SelectItem>
              <SelectItem value="FIFO" className="text-xs">
                {isArabic ? "الوارد أولاً يصرف أولاً (FIFO)" : "First-In, First-Out (FIFO)"}
              </SelectItem>
              <SelectItem value="LIFO" className="text-xs">
                {isArabic ? "الوارد أخيراً يصرف أولاً (LIFO)" : "Last-In, First-Out (LIFO)"}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
