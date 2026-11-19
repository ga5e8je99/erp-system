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
import { payPayrollSchema, PayPayrollFormData } from "../schemas";
import { payPayrollRunAction } from "../actions/payroll-actions";
import { formatSalary } from "../utils/mask-salary";

interface PayPayrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: string;
  runNumber: string;
  totalNetSalary: number;
  paymentAccounts: { id: string; code: string; name: string }[];
}

export function PayPayrollDialog({
  open,
  onOpenChange,
  runId,
  runNumber,
  totalNetSalary,
  paymentAccounts,
}: PayPayrollDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PayPayrollFormData>({
    resolver: zodResolver(payPayrollSchema),
    defaultValues: {
      runId,
      paymentAccountId: paymentAccounts[0]?.id || "",
    },
  });

  const selectedAccount = watch("paymentAccountId");

  React.useEffect(() => {
    if (open) {
      reset({
        runId,
        paymentAccountId: paymentAccounts[0]?.id || "",
      });
    }
  }, [open, runId, paymentAccounts, reset]);

  const onSubmit = async (data: PayPayrollFormData) => {
    setIsSubmitting(true);
    try {
      const res = await payPayrollRunAction(data);
      if (res.ok) {
        toast.success("تم صرف مسير الرواتب وترحيل قيد السداد المحاسبي بنجاح");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(res.error || "فشل تسجيل صرف الرواتب");
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>صرف رواتب العاملين ({runNumber})</DialogTitle>
            <DialogDescription>
              سيتم إنشاء وترحيل قيد محاسبي لصرف الرواتب:
              (مدين: مستحقات الرواتب والأجور - دائن: حساب الصرف المختار)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/40 rounded-lg border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">إجمالي المبلغ المطلوب صرفه:</span>
              <span className="text-base font-bold font-mono text-emerald-600">
                {formatSalary(totalNetSalary)}
              </span>
            </div>

            <div className="space-y-2">
              <Label>حساب الصرف (الخزينة أو البنك) *</Label>
              <Select
                value={selectedAccount}
                onValueChange={(val) => setValue("paymentAccountId", val || "")}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر حساب الصرف" />
                </SelectTrigger>
                <SelectContent>
                  {paymentAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.paymentAccountId && (
                <p className="text-xs text-destructive">{errors.paymentAccountId.message}</p>
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
              {isSubmitting ? "جاري الترحيل والصرف..." : "تأكيد الصرف وترحيل القيد"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
