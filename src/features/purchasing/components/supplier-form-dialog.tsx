"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import {
  supplierSchema,
  type SupplierFormValues,
} from "../schemas/purchasing";
import {
  createSupplierAction,
  updateSupplierAction,
} from "../actions/suppliers";
import type { SupplierWithCounts } from "../types";

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: SupplierWithCounts | null;
  onSuccess?: () => void;
}

export function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
  onSuccess,
}: SupplierFormDialogProps) {
  const t = useTranslations("purchasing.suppliers");
  const isEditing = Boolean(supplier?.id);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema) as never,
    defaultValues: {
      code: supplier?.code || "",
      name: supplier?.name || "",
      phone: supplier?.phone || "",
      email: supplier?.email || "",
      address: supplier?.address || "",
      taxNumber: supplier?.taxNumber || "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        code: supplier?.code || "",
        name: supplier?.name || "",
        phone: supplier?.phone || "",
        email: supplier?.email || "",
        address: supplier?.address || "",
        taxNumber: supplier?.taxNumber || "",
      });
    }
  }, [open, supplier, form]);

  const onSubmit = async (values: SupplierFormValues) => {
    setIsSubmitting(true);
    try {
      if (isEditing && supplier?.id) {
        const res = await updateSupplierAction({
          ...values,
          id: supplier.id,
        });
        if (res.ok) {
          toast.success("تم تحديث بيانات المورد بنجاح");
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(res.error || "فشل تحديث بيانات المورد");
        }
      } else {
        const res = await createSupplierAction(values);
        if (res.ok) {
          toast.success("تم إنشاء المورد بنجاح");
          onOpenChange(false);
          form.reset();
          onSuccess?.();
        } else {
          toast.error(res.error || "فشل إضافة المورد");
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("editSupplier") : t("addSupplier")}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "تعديل تفاصيل المورد، بيانات الاتصال، والرقم الضريبي."
              : "إدخال بيانات مورد تجاري جديد للنظام وتعيين الكود تلقائياً."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("code")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="تلقائي (SUPP-001)"
                        dir="ltr"
                        disabled={isEditing}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("name")} <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="اسم شركة أو مؤسسة المورد" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("phone")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+966 5x xxx xxxx"
                        dir="ltr"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("email")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="supplier@company.com"
                        dir="ltr"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="taxNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("taxNumber")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="3000xxxxxxxxxxx (الرقم الضريبي للمورد)"
                      dir="ltr"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("address")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="العنوان التفصيلي، المدينة، الحي، الشارع..."
                      rows={2}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "جاري الحفظ..."
                  : isEditing
                  ? "حفظ التعديلات"
                  : "إضافة المورد"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
