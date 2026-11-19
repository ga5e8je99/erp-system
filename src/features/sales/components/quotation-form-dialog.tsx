"use client";

import * as React from "react";
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
import { Label } from "@/components/ui/label";
import { ComboboxAsync, ComboboxOption } from "@/components/shared/combobox-async";
import {
  SalesLineItemsEditor,
  type SalesLineItemState,
} from "./sales-line-items-editor";
import {
  createQuotationAction,
  updateQuotationAction,
} from "../actions/quotations";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

interface QuotationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation?: {
    id: string;
    quotationNumber: string;
    customerId: string;
    customer: { id: string; name: string };
    issueDate: Date | string;
    expiryDate?: Date | string | null;
    notes?: string | null;
    items: {
      id?: string;
      productId: string;
      product?: { name: string; sku: string; unit?: { symbol: string } };
      quantity: number;
      unitPrice: number;
      discount?: number;
      taxRate: number;
    }[];
  } | null;
  onSuccess?: () => void;
}

export function QuotationFormDialog({
  open,
  onOpenChange,
  quotation,
  onSuccess,
}: QuotationFormDialogProps) {
  const t = useTranslations("sales.quotations");
  const tConfirm = useTranslations("confirm");
  const isEditing = Boolean(quotation?.id);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = React.useState(false);

  const [customerId, setCustomerId] = React.useState(quotation?.customerId || "");
  const [customerOption, setCustomerOption] = React.useState<ComboboxOption | undefined>(
    quotation?.customer
      ? { value: quotation.customer.id, label: quotation.customer.name }
      : undefined
  );

  const [issueDate, setIssueDate] = React.useState(
    quotation?.issueDate
      ? new Date(quotation.issueDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );

  const [expiryDate, setExpiryDate] = React.useState(
    quotation?.expiryDate
      ? new Date(quotation.expiryDate).toISOString().split("T")[0]
      : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  const [notes, setNotes] = React.useState(quotation?.notes || "");

  const [items, setItems] = React.useState<SalesLineItemState[]>([]);

  React.useEffect(() => {
    if (open) {
      setCustomerId(quotation?.customerId || "");
      setCustomerOption(
        quotation?.customer
          ? { value: quotation.customer.id, label: quotation.customer.name }
          : undefined
      );
      setIssueDate(
        quotation?.issueDate
          ? new Date(quotation.issueDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setExpiryDate(
        quotation?.expiryDate
          ? new Date(quotation.expiryDate).toISOString().split("T")[0]
          : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      );
      setNotes(quotation?.notes || "");

      if (quotation?.items && quotation.items.length > 0) {
        setItems(
          quotation.items.map((it, idx) => ({
            id: it.id || `item-${idx}`,
            productId: it.productId,
            productName: it.product?.name || "",
            sku: it.product?.sku || "",
            unitSymbol: it.product?.unit?.symbol || "",
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            discount: Number(it.discount || 0),
            taxRate: Number(it.taxRate),
          }))
        );
      } else {
        setItems([]);
      }
    }
  }, [open, quotation]);

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
      toast.error("يرجى اختيار العميل أولاً");
      return;
    }

    if (items.length === 0) {
      toast.error("يجب إضافة صنف واحد على الأقل في عرض السعر");
      return;
    }

    for (const line of items) {
      if (!line.productId) {
        toast.error("يرجى تحديد المنتج لجميع البنود");
        return;
      }
      if (line.quantity <= 0) {
        toast.error("الكمية يجب أن تكون أكبر من صفر لجميع البنود");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId,
        issueDate,
        expiryDate: expiryDate || undefined,
        notes: notes || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          discount: Number(i.discount || 0),
          taxRate: Number(i.taxRate || 14),
        })),
      };

      if (isEditing && quotation?.id) {
        const res = await updateQuotationAction(quotation.id, payload);
        if (res.ok) {
          toast.success("تم تحديث عرض السعر بنجاح");
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(res.error || "فشل تحديث عرض السعر");
        }
      } else {
        const res = await createQuotationAction(payload);
        if (res.ok) {
          toast.success(`تم إنشاء عرض السعر ${res.data.quotationNumber} بنجاح`);
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(res.error || "فشل إنشاء عرض السعر");
        }
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormDirty = React.useMemo(() => {
    if (isEditing) {
      return (
        customerId !== (quotation?.customerId || "") ||
        notes !== (quotation?.notes || "")
      );
    }
    return Boolean(customerId || items.length > 0 || notes.trim());
  }, [isEditing, customerId, notes, items.length, quotation]);

  const handleRequestClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (isFormDirty) {
        setShowDiscardConfirm(true);
        return;
      }
      onOpenChange(false);
    } else {
      onOpenChange(true);
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleRequestClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("editQuotation") : t("addQuotation")}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `تعديل بنود وشروط عرض السعر ${quotation?.quotationNumber}`
              : "إنشاء عرض أسعار جديد للعميل مع تحديد الأصناف، الأسعار، وتواريخ الصلاحية."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Header Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="customer-select">{t("customer")} *</Label>
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

            <div className="space-y-1.5">
              <Label htmlFor="issue-date">{t("issueDate")} *</Label>
              <Input
                id="issue-date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expiry-date">{t("expiryDate")}</Label>
              <Input
                id="expiry-date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>

          {/* Line Items Editor */}
          <SalesLineItemsEditor items={items} onChange={setItems} />

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea
              id="notes"
              placeholder="شروط التسليم، مدة التوريد، طريقة الدفع..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleRequestClose(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "جاري الحفظ..."
                : isEditing
                ? "حفظ التعديلات"
                : "إنشاء عرض السعر"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={showDiscardConfirm}
      onOpenChange={setShowDiscardConfirm}
      title={tConfirm("unsavedChangesTitle")}
      description={tConfirm("unsavedChangesMessage")}
      confirmText={tConfirm("discard")}
      cancelText={tConfirm("continueEditing")}
      variant="destructive"
      onConfirm={handleConfirmDiscard}
    />
  </>
  );
}
