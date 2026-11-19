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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  customerSchema,
  type CustomerFormValues,
} from "../schemas/sales";
import {
  createCustomerAction,
  updateCustomerAction,
} from "../actions/customers";

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: {
    id: string;
    code: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    taxNumber?: string | null;
    creditLimit: number;
  } | null;
  onSuccess?: () => void;
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: CustomerFormDialogProps) {
  const t = useTranslations("sales.customers");
  const isEditing = Boolean(customer?.id);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema) as never,
    defaultValues: {
      code: customer?.code || "",
      name: customer?.name || "",
      phone: customer?.phone || "",
      email: customer?.email || "",
      address: customer?.address || "",
      taxNumber: customer?.taxNumber || "",
      creditLimit: customer ? Number(customer.creditLimit) : 0,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        code: customer?.code || "",
        name: customer?.name || "",
        phone: customer?.phone || "",
        email: customer?.email || "",
        address: customer?.address || "",
        taxNumber: customer?.taxNumber || "",
        creditLimit: customer ? Number(customer.creditLimit) : 0,
      });
    }
  }, [open, customer, form]);

  const onSubmit = async (values: CustomerFormValues) => {
    setIsSubmitting(true);
    try {
      if (isEditing && customer?.id) {
        const res = await updateCustomerAction({
          ...values,
          id: customer.id,
        });
        if (res.ok) {
          toast.success("تم تحديث بيانات العميل بنجاح");
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(res.error || "فشل تحديث بيانات العميل");
        }
      } else {
        const res = await createCustomerAction(values);
        if (res.ok) {
          toast.success(`تمت إضافة العميل ${res.data.name} بنجاح (${res.data.code})`);
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(res.error || "فشل إضافة العميل");
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("editCustomer") : t("addCustomer")}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "تعديل البيانات الأساسية، معلومات الاتصال، والحد الائتماني للعميل."
              : "إدخال بيانات عميل جديد في النظام مع تعيين الحد الائتماني ومعلومات الضرائب."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{t("name")} *</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: شركة النور للتجارة والتوزيع" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("code")}</FormLabel>
                    <FormControl>
                      <Input placeholder="فارغ للتوليد التلقائي CUST-XXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("phone")}</FormLabel>
                    <FormControl>
                      <Input dir="ltr" placeholder="+966 50 000 0000" {...field} />
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
                      <Input dir="ltr" type="email" placeholder="info@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taxNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("taxNumber")}</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: 300000000000003" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="creditLimit"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{t("creditLimit")} (ر.س)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="100"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{t("address")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="العنوان التفصيلي، المدينة، الحي، الشارع..."
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                {isSubmitting ? "جاري الحفظ..." : isEditing ? "حفظ التعديلات" : "إضافة العميل"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
