"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { FullCompanySettingsInput } from "../schemas";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useLocale } from "next-intl";

interface PayrollRulesTabProps {
  form: UseFormReturn<FullCompanySettingsInput>;
}

export function PayrollRulesTab({ form }: PayrollRulesTabProps) {
  const locale = useLocale();
  const isArabic = locale === "ar";

  const { register, formState: { errors } } = form;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="border-b pb-3">
        <h3 className="text-sm font-semibold">
          {isArabic ? "قواعد واحتساب الرواتب والبدلات" : "Payroll & Compensation Rules"}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isArabic
            ? "تحديد معاملات احتساب الخصومات للغياب والتأخير ومضاعف الساعات الإضافية"
            : "Configure calculation multipliers for absence, tardiness deductions, and overtime pay"}
        </p>
      </div>

      <div className="space-y-4">
        {/* Absence Deduction Multiplier */}
        <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="absenceDeductionRate" className="text-xs font-semibold">
              {isArabic ? "معامل خصم يوم الغياب غير المبرر" : "Absence Deduction Multiplier"}
            </Label>
            <span className="text-[11px] text-muted-foreground font-mono">
              {isArabic ? "مضاعف يومي (الافتراضي 1.0 = يوم بيوم)" : "Daily multiplier (default 1.0)"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {isArabic
              ? "معدل الخصم لكل يوم غياب بدون إذن (مثال: 1.0 تعني خصم أجر يوم، 1.5 تعني يوم ونصف)"
              : "Multiplier deducted per unauthorized absent day (e.g. 1.0 = 1 day pay, 1.5 = 1.5 days pay)"}
          </p>
          <div className="flex items-center gap-2 max-w-xs">
            <Input
              id="absenceDeductionRate"
              type="number"
              step="0.1"
              min="0"
              max="10"
              className="text-xs h-9 font-mono"
              {...register("absenceDeductionRate", { valueAsNumber: true })}
            />
            <span className="text-xs text-muted-foreground font-medium">
              {isArabic ? "أجر يوم" : "days"}
            </span>
          </div>
          {errors.absenceDeductionRate && (
            <p className="text-xs text-destructive">{errors.absenceDeductionRate.message}</p>
          )}
        </div>

        {/* Late Deduction Multiplier */}
        <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="lateDeductionRate" className="text-xs font-semibold">
              {isArabic ? "معامل خصم التأخير (بالساعة)" : "Tardiness / Late Deduction Multiplier"}
            </Label>
            <span className="text-[11px] text-muted-foreground font-mono">
              {isArabic ? "مضاعف ساعات التأخير" : "Hourly multiplier"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {isArabic
              ? "معامل الخصم لكل ساعة تأخير بعد استنفاد فترة السماح المقررة (الافتراضي 1.0 = ساعة بساعة)"
              : "Multiplier deducted per hour of tardiness beyond grace period (default 1.0 = 1 hour pay)"}
          </p>
          <div className="flex items-center gap-2 max-w-xs">
            <Input
              id="lateDeductionRate"
              type="number"
              step="0.1"
              min="0"
              max="10"
              className="text-xs h-9 font-mono"
              {...register("lateDeductionRate", { valueAsNumber: true })}
            />
            <span className="text-xs text-muted-foreground font-medium">
              {isArabic ? "ساعة" : "hours"}
            </span>
          </div>
          {errors.lateDeductionRate && (
            <p className="text-xs text-destructive">{errors.lateDeductionRate.message}</p>
          )}
        </div>

        {/* Overtime Multiplier */}
        <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="overtimeMultiplier" className="text-xs font-semibold">
              {isArabic ? "معامل أجر ساعات العمل الإضافي (Overtime)" : "Overtime Pay Multiplier"}
            </Label>
            <span className="text-[11px] text-muted-foreground font-mono">
              {isArabic ? "مضاعف الساعة الإضافية" : "Overtime rate"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {isArabic
              ? "المعامل المطبق على أجر الساعة العادية لاحتساب الساعات الإضافية (طبقاً لقانون العمل: 1.5 نهاراً، 2.0 في العطلات)"
              : "Rate multiplied by regular hourly pay for overtime hours worked (standard: 1.5x regular, 2.0x holidays)"}
          </p>
          <div className="flex items-center gap-2 max-w-xs">
            <Input
              id="overtimeMultiplier"
              type="number"
              step="0.1"
              min="1"
              max="5"
              className="text-xs h-9 font-mono"
              {...register("overtimeMultiplier", { valueAsNumber: true })}
            />
            <span className="text-xs text-muted-foreground font-medium">
              × {isArabic ? "الأجر الأساسي للساعة" : "Hourly Base"}
            </span>
          </div>
          {errors.overtimeMultiplier && (
            <p className="text-xs text-destructive">{errors.overtimeMultiplier.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
