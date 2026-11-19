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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { leaveRequestSchema, LeaveRequestFormData } from "../schemas";
import { createLeaveRequestAction } from "../actions/leave-actions";
import { calculateLeaveDays } from "../services/leave-calculations";

interface LeaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: { id: string; name: string; code: string }[];
  leaveTypes: { id: string; name: string; daysAllowed: number; isPaid: boolean }[];
  defaultEmployeeId?: string;
}

export function LeaveRequestDialog({
  open,
  onOpenChange,
  employees,
  leaveTypes,
  defaultEmployeeId,
}: LeaveRequestDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      employeeId: defaultEmployeeId || "",
      leaveTypeId: leaveTypes[0]?.id || "",
      startDate: new Date(),
      endDate: new Date(),
      reason: "",
    },
  });

  const selectedEmp = watch("employeeId");
  const selectedType = watch("leaveTypeId");
  const startDateVal = watch("startDate");
  const endDateVal = watch("endDate");

  React.useEffect(() => {
    if (open) {
      reset({
        employeeId: defaultEmployeeId || employees[0]?.id || "",
        leaveTypeId: leaveTypes[0]?.id || "",
        startDate: new Date(),
        endDate: new Date(),
        reason: "",
      });
    }
  }, [open, defaultEmployeeId, employees, leaveTypes, reset]);

  // Calculate duration in days
  const durationDays = React.useMemo(() => {
    if (!startDateVal || !endDateVal || isNaN(startDateVal.getTime()) || isNaN(endDateVal.getTime())) {
      return 1;
    }
    if (endDateVal < startDateVal) return 0;
    return calculateLeaveDays(startDateVal, endDateVal);
  }, [startDateVal, endDateVal]);

  const selectedTypeObj = leaveTypes.find((t) => t.id === selectedType);

  const onSubmit = async (data: LeaveRequestFormData) => {
    setIsSubmitting(true);
    try {
      const res = await createLeaveRequestAction(data);
      if (res.ok) {
        toast.success("تم تقديم طلب الإجازة بنجاح وهو قيد المراجعة");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(res.error || "فشل تقديم طلب الإجازة");
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>تقديم طلب إجازة</DialogTitle>
            <DialogDescription>
              تسجيل طلب إجازة جديد للموظف واعتماده من قبل الإدارة
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الموظف *</Label>
              <Select
                value={selectedEmp}
                onValueChange={(val) => setValue("employeeId", val || "")}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الموظف" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} ({emp.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.employeeId && (
                <p className="text-xs text-destructive">{errors.employeeId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>نوع الإجازة *</Label>
              <Select
                value={selectedType}
                onValueChange={(val) => setValue("leaveTypeId", val || "")}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع الإجازة" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} ({type.daysAllowed} يوم/سنة)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.leaveTypeId && (
                <p className="text-xs text-destructive">{errors.leaveTypeId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="req-start">تاريخ البداية *</Label>
                <Input
                  id="req-start"
                  type="date"
                  value={
                    startDateVal instanceof Date && !isNaN(startDateVal.getTime())
                      ? startDateVal.toISOString().slice(0, 10)
                      : ""
                  }
                  onChange={(e) => {
                    const d = e.target.value ? new Date(e.target.value) : new Date();
                    setValue("startDate", d);
                  }}
                  disabled={isSubmitting}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="req-end">تاريخ النهاية *</Label>
                <Input
                  id="req-end"
                  type="date"
                  value={
                    endDateVal instanceof Date && !isNaN(endDateVal.getTime())
                      ? endDateVal.toISOString().slice(0, 10)
                      : ""
                  }
                  onChange={(e) => {
                    const d = e.target.value ? new Date(e.target.value) : new Date();
                    setValue("endDate", d);
                  }}
                  disabled={isSubmitting}
                  className="font-mono text-xs"
                />
              </div>
            </div>
            {errors.endDate && (
              <p className="text-xs text-destructive">{errors.endDate.message}</p>
            )}

            {/* Duration preview box */}
            <div className="p-3 bg-muted/40 rounded-lg border flex items-center justify-between text-xs">
              <span className="text-muted-foreground">المدة المحسوبة للإجازة:</span>
              <div className="flex items-center gap-2">
                <Badge variant={durationDays > 0 ? "secondary" : "destructive"} className="font-mono font-bold">
                  {durationDays} يوم
                </Badge>
                {selectedTypeObj && (
                  <span className="text-muted-foreground">
                    ({selectedTypeObj.isPaid ? "مدفوعة الأجر" : "غير مدفوعة الأجر"})
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="req-reason">سبب الإجازة (اختياري)</Label>
              <Textarea
                id="req-reason"
                placeholder="توضيح سبب طلب الإجازة أو أي ملاحظات..."
                {...register("reason")}
                disabled={isSubmitting}
                rows={2}
              />
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
            <Button type="submit" disabled={isSubmitting || durationDays <= 0}>
              {isSubmitting ? "جاري التقديم..." : "تقديم الطلب"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
