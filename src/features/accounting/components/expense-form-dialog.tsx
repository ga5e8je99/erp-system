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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { expenseSchema, ExpenseFormValues } from "../schemas";
import { recordExpenseAction } from "../actions/expense-actions";

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseAccounts: { id: string; code: string; name: string; label: string }[];
  paymentAccounts: { id: string; code: string; name: string; label: string }[];
  onSuccess?: () => void;
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  expenseAccounts,
  paymentAccounts,
  onSuccess,
}: ExpenseFormDialogProps) {
  const t = useTranslations("accounting.expenses");

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: "",
      accountId: expenseAccounts[0]?.id || "",
      paidFromAccountId: paymentAccounts[0]?.id || "",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      note: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        category: "",
        accountId: expenseAccounts[0]?.id || "",
        paidFromAccountId: paymentAccounts[0]?.id || "",
        amount: 0,
        date: new Date().toISOString().split("T")[0],
        note: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = async (values: ExpenseFormValues) => {
    try {
      const res = await recordExpenseAction(values);
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
          <DialogTitle>{t("recordExpense")}</DialogTitle>
          <DialogDescription>{t("recordExpenseDesc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="category" className="text-start block font-medium">
              {t("category")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="category"
              placeholder={t("categoryPlaceholder")}
              {...form.register("category")}
            />
            {form.formState.errors.category && (
              <p className="text-xs text-destructive">{form.formState.errors.category.message}</p>
            )}
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-start block font-medium">
                {t("amount")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                className="font-mono tabular-nums text-end"
                placeholder="0.00"
                {...form.register("amount", { valueAsNumber: true })}
              />
              {form.formState.errors.amount && (
                <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-start block font-medium">
                {t("date")} <span className="text-destructive">*</span>
              </Label>
              <Input id="date" type="date" {...form.register("date")} />
              {form.formState.errors.date && (
                <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>
              )}
            </div>
          </div>

          {/* Expense Account */}
          <div className="space-y-1.5">
            <Label htmlFor="accountId" className="text-start block font-medium">
              {t("expenseAccount")} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.watch("accountId")}
              onValueChange={(val) => form.setValue("accountId", val || "")}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectAccount")} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {expenseAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.accountId && (
              <p className="text-xs text-destructive">{form.formState.errors.accountId.message}</p>
            )}
          </div>

          {/* Payment Account */}
          <div className="space-y-1.5">
            <Label htmlFor="paidFromAccountId" className="text-start block font-medium">
              {t("paidFromAccount")} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.watch("paidFromAccountId")}
              onValueChange={(val) => form.setValue("paidFromAccountId", val || "")}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectPaymentAccount")} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {paymentAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.paidFromAccountId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.paidFromAccountId.message}
              </p>
            )}
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="note" className="text-start block font-medium">
              {t("note")} ({t("optional")})
            </Label>
            <Textarea
              id="note"
              rows={2}
              placeholder={t("notePlaceholder")}
              {...form.register("note")}
            />
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
