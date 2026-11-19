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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { leaveTypeSchema, LeaveTypeFormData } from "../schemas";
import { createLeaveTypeAction, updateLeaveTypeAction } from "../actions/leave-actions";

interface LeaveTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaveType?: {
    id: string;
    name: string;
    daysAllowed: number;
    isPaid: boolean;
  } | null;
}

export function LeaveTypeDialog({
  open,
  onOpenChange,
  leaveType,
}: LeaveTypeDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<LeaveTypeFormData>({
    resolver: zodResolver(leaveTypeSchema),
    defaultValues: {
      name: "",
      daysAllowed: 21,
      isPaid: true,
    },
  });

  const isPaidVal = watch("isPaid");

  React.useEffect(() => {
    if (leaveType) {
      reset({
        name: leaveType.name,
        daysAllowed: leaveType.daysAllowed,
        isPaid: leaveType.isPaid,
      });
    } else {
      reset({
        name: "",
        daysAllowed: 21,
        isPaid: true,
      });
    }
  }, [leaveType, reset, open]);

  const onSubmit = async (data: LeaveTypeFormData) => {
    setIsSubmitting(true);
    try {
      if (leaveType) {
        const res = await updateLeaveTypeAction(leaveType.id, data);
        if (res.ok) {
          toast.success("تم تحديث نوع الإجازة بنجاح");
          onOpenChange(false);
          router.refresh();
        } else {
          toast.error(res.error || "فشل تحديث نوع الإجازة");
        }
      } else {
        const res = await createLeaveTypeAction(data);
        if (res.ok) {
          toast.success("تم إضافة نوع الإجازة بنجاح");
          onOpenChange(false);
          router.refresh();
        } else {
          toast.error(res.error || "فشل إضافة نوع الإجازة");
        }
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
            <DialogTitle>
              {leaveType ? "تعديل نوع الإجازة" : "إضافة نوع إجازة جديد"}
            </DialogTitle>
            <DialogDescription>
              تحديد مسمى الإجازة والرصيد السنوي المسموح وطبيعتها (مدفوعة / غير مدفوعة)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lt-name">اسم نوع الإجازة *</Label>
              <Input
                id="lt-name"
                placeholder="مثال: إجازة اعتيادية سنوية"
                {...register("name")}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lt-days">الرصيد السنوي (بالأيام) *</Label>
              <Input
                id="lt-days"
                type="number"
                min="1"
                {...register("daysAllowed", { valueAsNumber: true })}
                disabled={isSubmitting}
                className="font-mono"
              />
              {errors.daysAllowed && (
                <p className="text-xs text-destructive">{errors.daysAllowed.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="lt-paid"
                checked={isPaidVal}
                onCheckedChange={(checked) => setValue("isPaid", Boolean(checked))}
                disabled={isSubmitting}
              />
              <Label htmlFor="lt-paid" className="cursor-pointer text-sm font-normal">
                إجازة مدفوعة الأجر (لا يخصم من الراتب)
              </Label>
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
              {isSubmitting ? "جاري الحفظ..." : leaveType ? "حفظ التعديلات" : "إضافة نوع الإجازة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
