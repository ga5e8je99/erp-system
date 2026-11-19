"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generatePayrollSchema, GeneratePayrollFormData } from "../schemas";
import { generatePayrollRunAction } from "../actions/payroll-actions";

interface GeneratePayrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MONTHS = [
  { value: 1, label: "يناير (01)" },
  { value: 2, label: "فبراير (02)" },
  { value: 3, label: "مارس (03)" },
  { value: 4, label: "أبريل (04)" },
  { value: 5, label: "مايو (05)" },
  { value: 6, label: "يونيو (06)" },
  { value: 7, label: "يوليو (07)" },
  { value: 8, label: "أغسطس (08)" },
  { value: 9, label: "سبتمبر (09)" },
  { value: 10, label: "أكتوبر (10)" },
  { value: 11, label: "نوفمبر (11)" },
  { value: 12, label: "ديسمبر (12)" },
];

export function GeneratePayrollDialog({
  open,
  onOpenChange,
}: GeneratePayrollDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<GeneratePayrollFormData>({
    resolver: zodResolver(generatePayrollSchema),
    defaultValues: {
      month: currentMonth,
      year: currentYear,
    },
  });

  const selectedMonth = watch("month");
  const selectedYear = watch("year");

  React.useEffect(() => {
    if (open) {
      reset({
        month: currentMonth,
        year: currentYear,
      });
    }
  }, [open, currentMonth, currentYear, reset]);

  const onSubmit = async (data: GeneratePayrollFormData) => {
    setIsSubmitting(true);
    try {
      const res = await generatePayrollRunAction(data);
      if (res.ok && res.data) {
        toast.success("تم احتساب مسير الرواتب بنجاح وتوليد مفردات المرتب");
        onOpenChange(false);
        router.push(`/hr/payroll/${res.data.id}`);
      } else {
        toast.error(res.error || "فشل احتساب مسير الرواتب");
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>توليد واحتساب مسير الرواتب</DialogTitle>
            <DialogDescription>
              سيقوم النظام بجمع كافة الموظفين النشطين واحتساب استحقاقاتهم واستقطاعات الغياب والتأخير المسجلة في الشهر المحدد
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الشهر *</Label>
              <Select
                value={String(selectedMonth)}
                onValueChange={(val) => val && setValue("month", parseInt(val, 10))}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.month && (
                <p className="text-xs text-destructive">{errors.month.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>السنة *</Label>
              <Select
                value={String(selectedYear)}
                onValueChange={(val) => val && setValue("year", parseInt(val, 10))}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.year && (
                <p className="text-xs text-destructive">{errors.year.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "جاري الاحتساب..." : "توليد المسير"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
