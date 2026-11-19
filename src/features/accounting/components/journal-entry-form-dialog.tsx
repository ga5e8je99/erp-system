"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { JournalStatus } from "@prisma/client";
import { Plus, Trash2, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { format } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { journalEntrySchema, JournalEntryFormValues } from "../schemas";
import { createJournalEntryAction } from "../actions/journal-actions";
import { formatCurrency } from "@/lib/money";

interface JournalEntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: { id: string; code: string; name: string; label: string }[];
  onSuccess?: () => void;
}

export function JournalEntryFormDialog({
  open,
  onOpenChange,
  accounts,
  onSuccess,
}: JournalEntryFormDialogProps) {
  const t = useTranslations("accounting.journal");

  const todayStr = React.useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const form = useForm<JournalEntryFormValues>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      date: todayStr,
      description: "",
      status: JournalStatus.POSTED,
      lines: [
        { accountId: accounts[0]?.id || "", debit: 0, credit: 0, description: "" },
        { accountId: accounts[1]?.id || "", debit: 0, credit: 0, description: "" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        date: format(new Date(), "yyyy-MM-dd"),
        description: "",
        status: JournalStatus.POSTED,
        lines: [
          { accountId: accounts[0]?.id || "", debit: 0, credit: 0, description: "" },
          { accountId: accounts[1]?.id || "", debit: 0, credit: 0, description: "" },
        ],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const watchedLines = form.watch("lines");

  // Calculate live debit/credit totals
  const { totalDebit, totalCredit, difference, isBalanced } = React.useMemo(() => {
    let debitSum = 0;
    let creditSum = 0;
    (watchedLines || []).forEach((l) => {
      const debit = Number(l?.debit);
      const credit = Number(l?.credit);
      debitSum += Number.isFinite(debit) ? debit : 0;
      creditSum += Number.isFinite(credit) ? credit : 0;
    });

    const diff = Math.abs(debitSum - creditSum);
    return {
      totalDebit: debitSum,
      totalCredit: creditSum,
      difference: diff,
      isBalanced: diff < 0.01 && debitSum > 0,
    };
  }, [watchedLines]);

  const onSubmit = async (values: JournalEntryFormValues) => {
    try {
      const res = await createJournalEntryAction(values);
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("addNewJournalEntry")}</DialogTitle>
          <DialogDescription>{t("addNewJournalEntryDesc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Header Fields: Date, Status, Description */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-start block font-medium">
                {t("date")} <span className="text-destructive">*</span>
              </Label>
              <Input id="date" type="date" {...form.register("date")} />
              {form.formState.errors.date && (
                <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-start block font-medium">
                {t("status")}
              </Label>
              <Select
                value={form.watch("status")}
                onValueChange={(val) => form.setValue("status", val as JournalStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={JournalStatus.POSTED}>{t("statusOptions.POSTED")}</SelectItem>
                  <SelectItem value={JournalStatus.DRAFT}>{t("statusOptions.DRAFT")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <Label htmlFor="description" className="text-start block font-medium">
                {t("description")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="description"
                placeholder={t("descriptionPlaceholder")}
                {...form.register("description")}
              />
              {form.formState.errors.description && (
                <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>
          </div>

          {/* Lines Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 p-2 border-b grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground">
              <span className="col-span-5">{t("account")}</span>
              <span className="col-span-2 text-end">{t("debit")}</span>
              <span className="col-span-2 text-end">{t("credit")}</span>
              <span className="col-span-2">{t("lineNote")}</span>
              <span className="col-span-1 text-center">{t("action")}</span>
            </div>

            <div className="divide-y divide-border/40 p-1 space-y-1">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-center p-1">
                  {/* Account select */}
                  <div className="col-span-5">
                    <Select
                      value={form.watch(`lines.${index}.accountId`) || undefined}
                      onValueChange={(val) => form.setValue(`lines.${index}.accountId`, val || "")}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={t("selectAccount")} />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Debit */}
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-9 text-end font-mono tabular-nums"
                      placeholder="0.00"
                      {...form.register(`lines.${index}.debit`, {
                        valueAsNumber: true,
                        setValueAs: (v) => (v === "" || Number.isNaN(Number(v)) ? 0 : Number(v)),
                        onChange: (e) => {
                          if (Number(e.target.value) > 0) {
                            form.setValue(`lines.${index}.credit`, 0);
                          }
                        },
                      })}
                    />
                  </div>

                  {/* Credit */}
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-9 text-end font-mono tabular-nums"
                      placeholder="0.00"
                      {...form.register(`lines.${index}.credit`, {
                        valueAsNumber: true,
                        setValueAs: (v) => (v === "" || Number.isNaN(Number(v)) ? 0 : Number(v)),
                        onChange: (e) => {
                          if (Number(e.target.value) > 0) {
                            form.setValue(`lines.${index}.debit`, 0);
                          }
                        },
                      })}
                    />
                  </div>

                  {/* Line Note */}
                  <div className="col-span-2">
                    <Input
                      className="h-9 text-xs"
                      placeholder={t("optionalNote")}
                      {...form.register(`lines.${index}.description`)}
                    />
                  </div>

                  {/* Delete Line */}
                  <div className="col-span-1 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      disabled={fields.length <= 2}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2 border-t bg-muted/20 flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ accountId: "", debit: 0, credit: 0, description: "" })}
              >
                <Plus className="h-3.5 w-3.5 me-1.5" />
                {t("addLine")}
              </Button>

              <div className="flex items-center gap-6 text-sm font-medium">
                <div>
                  <span className="text-muted-foreground me-1.5">{t("totalDebit")}:</span>
                  <span className="font-mono tabular-nums font-semibold" dir="ltr">
                    {formatCurrency(totalDebit)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground me-1.5">{t("totalCredit")}:</span>
                  <span className="font-mono tabular-nums font-semibold" dir="ltr">
                    {formatCurrency(totalCredit)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Balance Checker Banner */}
          <div
            className={`p-3 rounded-lg border flex items-center justify-between text-sm ${totalDebit === 0 && totalCredit === 0
              ? "bg-muted/60 text-muted-foreground border-border"
              : isBalanced
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
              }`}
          >
            <div className="flex items-center gap-2">
              {totalDebit === 0 && totalCredit === 0 ? (
                <>
                  <Info className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="font-medium">{t("enterAmountsPrompt")}</span>
                </>
              ) : isBalanced ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span className="font-medium">{t("entryBalanced")}</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                  <span className="font-medium">
                    {t("entryNotBalanced", { diff: formatCurrency(difference) })}
                  </span>
                </>
              )}
            </div>
          </div>

          {form.formState.errors.lines && (
            <p className="text-xs text-destructive">{form.formState.errors.lines.message}</p>
          )}

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={!isBalanced || form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
