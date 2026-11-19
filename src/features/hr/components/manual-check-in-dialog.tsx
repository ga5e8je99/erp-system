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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AttendanceStatus } from "@prisma/client";
import { manualCheckInOutSchema, ManualCheckInOutFormData } from "../schemas";
import { recordManualCheckInOutAction } from "../actions/attendance-actions";

interface ManualCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: { id: string; name: string; code: string }[];
  defaultDate?: string;
}

export function ManualCheckInDialog({
  open,
  onOpenChange,
  employees,
  defaultDate,
}: ManualCheckInDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ManualCheckInOutFormData>({
    resolver: zodResolver(manualCheckInOutSchema),
    defaultValues: {
      employeeId: "",
      date: defaultDate ? new Date(defaultDate) : new Date(),
      status: AttendanceStatus.PRESENT,
      checkIn: "09:00",
      checkOut: "17:00",
      notes: "",
    },
  });

  const selectedEmp = watch("employeeId");
  const selectedStatus = watch("status");
  const dateVal = watch("date");

  React.useEffect(() => {
    if (open) {
      reset({
        employeeId: employees[0]?.id || "",
        date: defaultDate ? new Date(defaultDate) : new Date(),
        status: AttendanceStatus.PRESENT,
        checkIn: "09:00",
        checkOut: "17:00",
        notes: "",
      });
    }
  }, [open, employees, defaultDate, reset]);

  const onSubmit = async (data: ManualCheckInOutFormData) => {
    setIsSubmitting(true);
    try {
      const res = await recordManualCheckInOutAction(data);
      if (res.ok) {
        toast.success("تم تسجيل حضور الموظف بنجاح");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(res.error || "فشل تسجيل الحضور");
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
            <DialogTitle>تسجيل حضور / انصراف يدوي</DialogTitle>
            <DialogDescription>
              تسجيل أو تعديل موعد الحضور والانصراف لموظف محدد
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="manual-att-date">التاريخ</Label>
                <Input
                  id="manual-att-date"
                  type="date"
                  value={
                    dateVal instanceof Date && !isNaN(dateVal.getTime())
                      ? dateVal.toISOString().slice(0, 10)
                      : ""
                  }
                  onChange={(e) => {
                    const d = e.target.value ? new Date(e.target.value) : new Date();
                    setValue("date", d);
                  }}
                  disabled={isSubmitting}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label>الحالة</Label>
                <Select
                  value={selectedStatus}
                  onValueChange={(val) =>
                    setValue("status", (val as AttendanceStatus) || AttendanceStatus.PRESENT)
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AttendanceStatus.PRESENT}>حاضر</SelectItem>
                    <SelectItem value={AttendanceStatus.ABSENT}>غائب</SelectItem>
                    <SelectItem value={AttendanceStatus.LATE}>متأخر</SelectItem>
                    <SelectItem value={AttendanceStatus.HALF_DAY}>نصف يوم</SelectItem>
                    <SelectItem value={AttendanceStatus.ON_LEAVE}>إجازة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="manual-checkin">وقت الحضور</Label>
                <Input
                  id="manual-checkin"
                  type="time"
                  {...register("checkIn")}
                  disabled={isSubmitting || selectedStatus === AttendanceStatus.ABSENT}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-checkout">وقت الانصراف</Label>
                <Input
                  id="manual-checkout"
                  type="time"
                  {...register("checkOut")}
                  disabled={isSubmitting || selectedStatus === AttendanceStatus.ABSENT}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-notes">ملاحظات (اختياري)</Label>
              <Input
                id="manual-notes"
                placeholder="سبب التأخير، إذن مبكر..."
                {...register("notes")}
                disabled={isSubmitting}
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "جاري الحفظ..." : "حفظ الحضور"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
