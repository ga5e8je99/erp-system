"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PaymentMethod } from "@prisma/client";
import { CreditCard } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComboboxAsync } from "@/components/shared/combobox-async";
import { recordSupplierPaymentAction } from "../actions/payments";
import type { PurchaseInvoicePayload } from "../types";

interface SupplierPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: PurchaseInvoicePayload | null;
  defaultSupplierId?: string;
  defaultSupplierName?: string;
  onSuccess?: () => void;
}

export function SupplierPaymentDialog({
  open,
  onOpenChange,
  invoice,
  defaultSupplierId,
  defaultSupplierName,
  onSuccess,
}: SupplierPaymentDialogProps) {
  const t = useTranslations("purchasing.payments");

  const [supplierId, setSupplierId] = React.useState<string>("");
  const [supplierName, setSupplierName] = React.useState<string>("");
  const [amount, setAmount] = React.useState<number>(0);
  const [method, setMethod] = React.useState<PaymentMethod>(PaymentMethod.CASH);
  const [date, setDate] = React.useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [reference, setReference] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (open) {
      if (invoice) {
        setSupplierId(invoice.supplierId);
        setSupplierName(invoice.supplier.name);
        const remaining = Math.max(0, invoice.total - invoice.paidAmount);
        setAmount(remaining);
      } else if (defaultSupplierId) {
        setSupplierId(defaultSupplierId);
        setSupplierName(defaultSupplierName || "");
        setAmount(0);
      } else {
        setSupplierId("");
        setSupplierName("");
        setAmount(0);
      }
      setMethod(PaymentMethod.CASH);
      setDate(new Date().toISOString().split("T")[0]);
      setReference("");
      setNotes(
        invoice ? `سداد فاتورة مشتريات رقم ${invoice.invoiceNumber}` : ""
      );
    }
  }, [open, invoice, defaultSupplierId, defaultSupplierName]);

  const loadSupplierOptions = React.useCallback(async (query: string) => {
    try {
      const res = await fetch(
        `/api/purchasing/suppliers/search?q=${encodeURIComponent(query)}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items || []).map((s: { value: string; label: string; name: string }) => ({
        value: s.value,
        label: s.label,
        raw: s,
      }));
    } catch {
      return [];
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      toast.error("يرجى تحديد المورد أولاً");
      return;
    }

    if (amount <= 0) {
      toast.error("مبلغ السداد يجب أن يكون أكبر من صفر");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await recordSupplierPaymentAction({
        supplierId,
        invoiceId: invoice?.id || null,
        amount,
        method,
        date,
        reference: reference?.trim() || null,
        notes: notes?.trim() || null,
      });

      if (res.ok) {
        toast.success(
          `تم تسجيل سند الصرف بنجاح (${res.data.paymentNumber}) وترحيل القيد المحاسبي!`
        );
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(res.error || "فشل تسجيل سند الصرف");
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <span>{t("addPayment")}</span>
          </DialogTitle>
          <DialogDescription>
            {invoice
              ? `تسجيل دفعة سداد لصالح المورد على الفاتورة (${invoice.invoiceNumber}).`
              : "تسجيل سند صرف سداد لمستحقات المورد من الخزينة أو البنك."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>
              {t("supplier")} <span className="text-destructive">*</span>
            </Label>
            {invoice || defaultSupplierId ? (
              <Input
                value={supplierName}
                disabled
                className="bg-muted font-medium"
              />
            ) : (
              <ComboboxAsync
                value={supplierId}
                onChange={(val, opt) => {
                  setSupplierId(val || "");
                  setSupplierName(opt?.label || "");
                }}
                loadOptions={loadSupplierOptions}
                placeholder="اختر المورد..."
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                {t("amount")} (ر.س) <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="font-mono font-bold text-emerald-600"
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("method")}</Label>
              <Select
                value={method}
                onValueChange={(val) => setMethod(val as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentMethod.CASH}>نقداً (خزينة)</SelectItem>
                  <SelectItem value={PaymentMethod.BANK}>تحويل بنكي</SelectItem>
                  <SelectItem value={PaymentMethod.CARD}>بطاقة مدى / ائتمان</SelectItem>
                  <SelectItem value={PaymentMethod.CHEQUE}>شيك بنكي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("date")}</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("reference")}</Label>
              <Input
                placeholder="رقم الحوالة أو الشيك..."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("notes")}</Label>
            <Textarea
              placeholder="أي ملاحظات حول السداد..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
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
              {isSubmitting ? "جاري الترحيل..." : "تأكيد صرف المبلغ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
