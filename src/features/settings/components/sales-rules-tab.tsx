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

interface SalesRulesTabProps {
  form: UseFormReturn<FullCompanySettingsInput>;
}

export function SalesRulesTab({ form }: SalesRulesTabProps) {
  const locale = useLocale();
  const isArabic = locale === "ar";

  const blockOnCreditLimit = form.watch("blockOnCreditLimit");
  const creditLimitBehavior = form.watch("creditLimitBehavior");

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="border-b pb-3">
        <h3 className="text-sm font-semibold">
          {isArabic ? "قواعد وسياسات المبيعات والائتمان" : "Sales & Customer Credit Policies"}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isArabic
            ? "التحكم في سلوك النظام عند تجاوز رصيد العميل الحد الائتماني المسموح به"
            : "Define system reaction when a customer's balance exceeds their assigned credit limit"}
        </p>
      </div>

      <div className="space-y-4">
        {/* Enable Credit Limit Check */}
        <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
          <div className="space-y-0.5 max-w-md">
            <Label className="text-xs font-semibold">
              {isArabic ? "تفعيل الرقابة على الحدود الائتمانية" : "Enforce Credit Limits"}
            </Label>
            <p className="text-[11px] text-muted-foreground">
              {isArabic
                ? "فحص رصيد مديونية العميل مقارنة بالحد الائتماني المحدد له في بطاقة العميل قبل تأكيد الأوامر أو إصدار الفواتير"
                : "Check customer balance against their designated credit limit before confirming orders or issuing invoices"}
            </p>
          </div>
          <Switch
            checked={blockOnCreditLimit}
            onCheckedChange={(checked) =>
              form.setValue("blockOnCreditLimit", checked, { shouldDirty: true })
            }
          />
        </div>

        {/* Credit Limit Behavior */}
        <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
          <Label className="text-xs font-semibold">
            {isArabic ? "الإجراء عند تجاوز الحد الائتماني" : "Action on Credit Limit Breach"}
          </Label>
          <p className="text-[11px] text-muted-foreground">
            {isArabic
              ? "حدد ما إذا كان النظام سيحظر العملية بالكامل أم يكتفي بإظهار تحذير للمستخدم"
              : "Specify whether to strictly block transactions or display an advisory warning"}
          </p>
          <Select
            value={creditLimitBehavior}
            onValueChange={(val) => {
              if (val) form.setValue("creditLimitBehavior", val as "STRICT_BLOCK" | "WARN_ONLY" | "IGNORE", { shouldDirty: true });
            }}
            disabled={!blockOnCreditLimit}
          >
            <SelectTrigger className="text-xs h-9 w-72 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STRICT_BLOCK" className="text-xs">
                {isArabic ? "حظر صارم (منع تأكيد الأمر أو الفاتورة)" : "Strict Block (Prevent Confirmation)"}
              </SelectItem>
              <SelectItem value="WARN_ONLY" className="text-xs">
                {isArabic ? "تحذير فقط (تنبيه المستخدم مع السماح بالمتابعة)" : "Warning Only (Allow with Warning)"}
              </SelectItem>
              <SelectItem value="IGNORE" className="text-xs">
                {isArabic ? "تجاهل (السماح دون تنبيه)" : "Ignore"}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
