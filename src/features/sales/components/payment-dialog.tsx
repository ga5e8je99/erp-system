"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PaymentMethod } from "@prisma/client";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComboboxAsync, ComboboxOption } from "@/components/shared/combobox-async";
import { recordCustomerPaymentAction } from "../actions/payments";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: {
    id: string;
    invoiceNumber: string;
    customerId: string;
    customer: { id: string; name: string };
    total: number;
    paidAmount: number;
    dueAmount: number;
  } | null;
  customerId?: string;
  onSuccess?: () => void;
}

export function PaymentDialog({
  open,
  onOpenChange,
  invoice,
  customerId: initialCustomerId,
  onSuccess,
}: PaymentDialogProps) {
  const t = useTranslations("sales.payments");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [customerId, setCustomerId] = React.useState(
    invoice?.customerId || initialCustomerId || ""
  );
  const [customerOption, setCustomerOption] = React.useState<ComboboxOption | undefined>(
    invoice?.customer
      ? { value: invoice.customer.id, label: invoice.customer.name }
      : undefined
  );

  const [amount, setAmount] = React.useState<number>(
    invoice ? Number(invoice.dueAmount) : 0
  );
  const [method, setMethod] = React.useState<PaymentMethod>(PaymentMethod.CASH);
  const [date, setDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setCustomerId(invoice?.customerId || initialCustomerId || "");
      setCustomerOption(
        invoice?.customer
          ? { value: invoice.customer.id, label: invoice.customer.name }
          : undefined
      );
      setAmount(invoice ? Number(invoice.dueAmount) : 0);
      setMethod(PaymentMethod.CASH);
      setDate(new Date().toISOString().split("T")[0]);
      setReference("");
      setNotes(
        invoice ? `سداد فاتورة مبيعات ${invoice.invoiceNumber}` : ""
      );
    }
  }, [open, invoice, initialCustomerId]);

  const loadCustomerOptions = React.useCallback(
    async (query: string): Promise<ComboboxOption[]> => {
      try {
        const res = await fetch(`/api/sales/customers/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.items || []).map((c: { id: string; name: string; code: string }) => ({
          value: c.id,
          label: `${c.name} (${c.code})`,
        }));
      } catch {
        return [];
      }
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      toast.error("يرجى اختيار العميل");
      return;
    }

    if (amount <= 0) {
      toast.error("المبلغ المحصل يجب أن يكون أكبر من صفر");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await recordCustomerPaymentAction({
        customerId,
        invoiceId: invoice?.id || undefined,
        amount,
        method,
        date,
        reference: reference || undefined,
        notes: notes || undefined,
      });

      if (res.ok) {
        toast.success(`تم تسجيل سند القبض ${res.data.paymentNumber} بنجاح`);
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(res.error || "فشل تسجيل سند القبض");
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
          <DialogTitle>{t("addPayment")}</DialogTitle>
          <DialogDescription>
            {invoice
              ? `تسجيل دفعة مسددة للفاتورة ${invoice.invoiceNumber} (المتبقي: ${invoice.dueAmount.toLocaleString()} ر.س)`
              : "تسجيل مقبوضات نقدية أو بنكية من العميل وتحديث رصيد الحساب."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {!invoice && (
            <div className="space-y-1.5">
              <Label htmlFor="pay-customer">{t("customer")} *</Label>
              <ComboboxAsync
                value={customerId}
                onChange={(val, opt) => {
                  setCustomerId(val);
                  setCustomerOption(opt);
                }}
                loadOptions={loadCustomerOptions}
                placeholder="اختر العميل..."
                initialOption={customerOption}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pay-amount">{t("amount")} (ر.س) *</Label>
              <Input
                id="pay-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                required
                className="font-mono text-base font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pay-method">{t("method")} *</Label>
              <Select
                value={method}
                onValueChange={(val) => {
                  if (val) setMethod(val as PaymentMethod);
                }}
              >
                <SelectTrigger id="pay-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentMethod.CASH}>
                    نقداً (الخزينة الرئيسية - 1110)
                  </SelectItem>
                  <SelectItem value={PaymentMethod.BANK}>
                    تحويل بنكي (البنك التجاري - 1120)
                  </SelectItem>
                  <SelectItem value={PaymentMethod.CARD}>
                    بطاقة دفع إلكتروني (شبكة)
                  </SelectItem>
                  <SelectItem value={PaymentMethod.CHEQUE}>
                    شيك بنكي تحت التحصيل
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pay-date">{t("date")} *</Label>
              <Input
                id="pay-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pay-reference">{t("reference")}</Label>
              <Input
                id="pay-reference"
                placeholder="رقم الحوالة أو الشيك..."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-notes">{t("notes")}</Label>
            <Textarea
              id="pay-notes"
              placeholder="ملاحظات السداد..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "جاري التسجيل..." : "تأكيد واستلام الدفعة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
