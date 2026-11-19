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
import { departmentSchema, DepartmentFormData } from "../schemas";
import { createDepartmentAction, updateDepartmentAction } from "../actions/department-actions";

interface DepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: {
    id: string;
    name: string;
    code: string;
    description: string | null;
  } | null;
}

export function DepartmentDialog({
  open,
  onOpenChange,
  department,
}: DepartmentDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
    },
  });

  React.useEffect(() => {
    if (department) {
      reset({
        name: department.name,
        code: department.code,
        description: department.description || "",
      });
    } else {
      reset({
        name: "",
        code: "",
        description: "",
      });
    }
  }, [department, reset, open]);

  const onSubmit = async (data: DepartmentFormData) => {
    setIsSubmitting(true);
    try {
      if (department) {
        const res = await updateDepartmentAction(department.id, data);
        if (res.ok) {
          toast.success("تم تحديث بيانات القسم بنجاح");
          onOpenChange(false);
          router.refresh();
        } else {
          toast.error(res.error || "فشل تحديث بيانات القسم");
        }
      } else {
        const res = await createDepartmentAction(data);
        if (res.ok) {
          toast.success("تم إنشاء القسم بنجاح");
          onOpenChange(false);
          router.refresh();
        } else {
          toast.error(res.error || "فشل إنشاء القسم");
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
              {department ? "تعديل بيانات القسم" : "إضافة قسم جديد"}
            </DialogTitle>
            <DialogDescription>
              {department
                ? "قم بتعديل بيانات القسم والرمز التعريفي"
                : "أدخل بيانات القسم والرمز التعريفي لتنظيم الهيكل الإداري"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">رمز القسم (الكود)</Label>
              <Input
                id="code"
                placeholder="مثال: FIN, HR, SALES"
                {...register("code")}
                disabled={isSubmitting}
                className="font-mono uppercase"
              />
              {errors.code && (
                <p className="text-xs text-destructive">{errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">اسم القسم</Label>
              <Input
                id="name"
                placeholder="مثال: الإدارة المالية والمحاسبة"
                {...register("name")}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">الوصف والمهام (اختياري)</Label>
              <Textarea
                id="description"
                placeholder="وصف مختصر لمهام ومسؤوليات القسم..."
                {...register("description")}
                disabled={isSubmitting}
                rows={3}
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
              {isSubmitting ? "جاري الحفظ..." : department ? "حفظ التعديلات" : "إضافة القسم"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
