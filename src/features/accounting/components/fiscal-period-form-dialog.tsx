"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fiscalPeriodSchema, FiscalPeriodFormValues } from "../schemas";
import { createFiscalPeriodAction } from "../actions/period-actions";

interface FiscalPeriodFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function FiscalPeriodFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: FiscalPeriodFormDialogProps) {
  const t = useTranslations("accounting.periods");

  const form = useForm<FiscalPeriodFormValues>({
    resolver: zodResolver(fiscalPeriodSchema),
    defaultValues: {
      name: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
      });
    }
  }, [open, form]);

  const onSubmit = async (values: FiscalPeriodFormValues) => {
    try {
      const res = await createFiscalPeriodAction(values);
      if (res.ok) {
        toast.success(t("createdSuccessfully"));
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(res.error || t("failedToSave"));
      }
    } catch {
      toast.error(t("unexpectedError"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("addNewPeriod")}</DialogTitle>
          <DialogDescription>{t("addNewPeriodDesc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-start block font-medium">
              {t("periodName")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder={t("periodNamePlaceholder")}
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startDate" className="text-start block font-medium">
                {t("startDate")} <span className="text-destructive">*</span>
              </Label>
              <Input id="startDate" type="date" {...form.register("startDate")} />
              {form.formState.errors.startDate && (
                <p className="text-xs text-destructive">{form.formState.errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endDate" className="text-start block font-medium">
                {t("endDate")} <span className="text-destructive">*</span>
              </Label>
              <Input id="endDate" type="date" {...form.register("endDate")} />
              {form.formState.errors.endDate && (
                <p className="text-xs text-destructive">{form.formState.errors.endDate.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
