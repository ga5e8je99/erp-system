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
  createOrderAction,
  updateOrderAction,
} from "../actions/orders";

interface OrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: {
    id: string;
    orderNumber: string;
    customerId: string;
    customer: { id: string; name: string };
    issueDate: Date | string;
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

export function OrderFormDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
}: OrderFormDialogProps) {
  const t = useTranslations("sales.orders");
  const isEditing = Boolean(order?.id);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [customerId, setCustomerId] = React.useState(order?.customerId || "");
  const [customerOption, setCustomerOption] = React.useState<ComboboxOption | undefined>(
    order?.customer
      ? { value: order.customer.id, label: order.customer.name }
      : undefined
  );

  const [issueDate, setIssueDate] = React.useState(
    order?.issueDate
      ? new Date(order.issueDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );

  const [notes, setNotes] = React.useState(order?.notes || "");
  const [items, setItems] = React.useState<SalesLineItemState[]>([]);

  React.useEffect(() => {
    if (open) {
      setCustomerId(order?.customerId || "");
      setCustomerOption(
        order?.customer
          ? { value: order.customer.id, label: order.customer.name }
          : undefined
      );
      setIssueDate(
        order?.issueDate
          ? new Date(order.issueDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setNotes(order?.notes || "");

      if (order?.items && order.items.length > 0) {
        setItems(
          order.items.map((it, idx) => ({
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
  }, [open, order]);

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
      } catch (err) {
        console.error(err);
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
      toast.error("يجب إضافة صنف واحد على الأقل في أمر البيع");
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
        notes: notes || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          discount: Number(i.discount || 0),
          taxRate: Number(i.taxRate || 14),
        })),
      };

      if (isEditing && order?.id) {
        const res = await updateOrderAction(order.id, payload);
        if (res.ok) {
          toast.success("تم تحديث أمر البيع بنجاح");
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(res.error || "فشل تحديث أمر البيع");
        }
      } else {
        const res = await createOrderAction(payload);
        if (res.ok) {
          toast.success(`تم إنشاء أمر البيع ${res.data.orderNumber} بنجاح`);
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(res.error || "فشل إنشاء أمر البيع");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("editOrder") : t("addOrder")}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `تعديل بنود أمر البيع ${order?.orderNumber}`
              : "تسجيل أمر بيع جديد للعميل لتجهيز الطلبية واعتماد الشحن."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Header Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="order-customer">{t("customer")} *</Label>
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
              <Label htmlFor="order-date">{t("issueDate")} *</Label>
              <Input
                id="order-date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Line Items Editor */}
          <SalesLineItemsEditor items={items} onChange={setItems} />

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="order-notes">{t("notes")}</Label>
            <Textarea
              id="order-notes"
              placeholder="ملاحظات التسليم، طريقة الشحن، تعليمات التعبئة..."
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
              {isSubmitting
                ? "جاري الحفظ..."
                : isEditing
                ? "حفظ التعديلات"
                : "إنشاء أمر البيع"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
