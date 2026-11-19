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
import { positionSchema, PositionFormData } from "../schemas";
import { createPositionAction, updatePositionAction } from "../actions/department-actions";

interface PositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: { id: string; name: string }[];
  position?: {
    id: string;
    title: string;
    code: string;
    departmentId: string | null;
  } | null;
}

export function PositionDialog({
  open,
  onOpenChange,
  departments,
  position,
}: PositionDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PositionFormData>({
    resolver: zodResolver(positionSchema),
    defaultValues: {
      title: "",
      code: "",
      departmentId: "",
    },
  });

  const selectedDept = watch("departmentId");

  React.useEffect(() => {
    if (position) {
      reset({
        title: position.title,
        code: position.code,
        departmentId: position.departmentId || "",
      });
    } else {
      reset({
        title: "",
        code: "",
        departmentId: departments[0]?.id || "",
      });
    }
  }, [position, departments, reset, open]);

  const onSubmit = async (data: PositionFormData) => {
    setIsSubmitting(true);
    try {
      if (position) {
        const res = await updatePositionAction(position.id, data);
        if (res.ok) {
          toast.success("تم تحديث المسمى الوظيفي بنجاح");
          onOpenChange(false);
          router.refresh();
        } else {
          toast.error(res.error || "فشل تحديث المسمى الوظيفي");
        }
      } else {
        const res = await createPositionAction(data);
        if (res.ok) {
          toast.success("تم إنشاء المسمى الوظيفي بنجاح");
          onOpenChange(false);
          router.refresh();
        } else {
          toast.error(res.error || "فشل إنشاء المسمى الوظيفي");
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
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              {position ? "تعديل المسمى الوظيفي" : "إضافة مسمى وظيفي جديد"}
            </DialogTitle>
            <DialogDescription>
              {position
                ? "قم بتعديل بيانات المسمى الوظيفي والقسم التابع له"
                : "أدخل مسمى الوظيفة والرمز والقسم التابع له لتحديد الصلاحيات والمسؤوليات"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pos-code">رمز الوظيفة</Label>
              <Input
                id="pos-code"
                placeholder="مثال: ACC, DEV, REP"
                {...register("code")}
                disabled={isSubmitting}
                className="font-mono uppercase"
              />
              {errors.code && (
                <p className="text-xs text-destructive">{errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pos-title">عنوان الوظيفة</Label>
              <Input
                id="pos-title"
                placeholder="مثال: محاسب مالي أول"
                {...register("title")}
                disabled={isSubmitting}
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>القسم التابع له</Label>
              <Select
                value={selectedDept}
                onValueChange={(val) => setValue("departmentId", val || "")}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر القسم" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.departmentId && (
                <p className="text-xs text-destructive">{errors.departmentId.message}</p>
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
              {isSubmitting ? "جاري الحفظ..." : position ? "حفظ التعديلات" : "إضافة المسمى الوظيفي"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
