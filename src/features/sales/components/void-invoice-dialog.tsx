"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { voidInvoiceAction } from "../actions/invoices";

interface VoidInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoiceNumber: string;
    total: number;
    customer: { name: string };
  } | null;
  warehouses: { id: string; name: string; code: string }[];
  onSuccess?: () => void;
}

export function VoidInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  warehouses,
  onSuccess,
}: VoidInvoiceDialogProps) {
  const t = useTranslations("sales.invoices");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [warehouseId, setWarehouseId] = React.useState(warehouses[0]?.id || "");
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setWarehouseId(warehouses[0]?.id || "");
      setReason("");
    }
  }, [open, warehouses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invoice) return;

    if (!warehouseId) {
      toast.error("يرجى اختيار المستودع لإرجاع المخزون إليه");
      return;
    }

    if (!reason || reason.trim() === "") {
      toast.error("يرجى كتابة سبب الإلغاء");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await voidInvoiceAction({
        invoiceId: invoice.id,
        warehouseId,
        reason: reason.trim(),
      });

      if (res.ok) {
        toast.success(`تم إلغاء الفاتورة ${invoice.invoiceNumber} وترحيل قيود العكس بنجاح`);
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(res.error || "فشل إلغاء الفاتورة");
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
          <DialogTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span>{t("voidInvoice")}</span>
          </DialogTitle>
          <DialogDescription>
            إلغاء الفاتورة المعتمدة {invoice?.invoiceNumber} للعميل {invoice?.customer.name} (
            {Number(invoice?.total || 0).toLocaleString()} ر.س).
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive space-y-1">
          <p className="font-semibold">تأثير عملية الإلغاء:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>إعادة إدخال الأصناف إلى المستودع المحدد تلقائياً (حركة IN).</li>
            <li>خصم قيمة الفاتورة من مديونية العميل.</li>
            <li>إنشاء وترحيل قيد يومية عكسي متوازن (عكس الإيرادات والضريبة وتكلفة البضاعة).</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="return-warehouse">مستودع إرجاع البضاعة *</Label>
            <Select
              value={warehouseId}
              onValueChange={(val) => {
                if (val) setWarehouseId(val);
              }}
            >
              <SelectTrigger id="return-warehouse">
                <SelectValue placeholder="اختر المستودع..." />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="void-reason">سبب الإلغاء *</Label>
            <Textarea
              id="void-reason"
              placeholder="مثال: خطأ في التسعير / إلغاء الاتفاقية مع العميل..."
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              تراجع
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting}
            >
              {isSubmitting ? "جاري الإلغاء..." : "تأكيد الإلغاء وترحيل القيود العكسية"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
