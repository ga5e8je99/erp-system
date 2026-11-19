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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ComboboxAsync } from "@/components/shared/combobox-async";
import {
  PurchasingLineItemsEditor,
  PurchasingLineItemState,
} from "./purchasing-line-items-editor";
import {
  createPurchaseOrderAction,
  updatePurchaseOrderAction,
} from "../actions/orders";
import type { PurchaseOrderPayload } from "../types";

interface PurchaseOrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: PurchaseOrderPayload | null;
  onSuccess?: () => void;
}

export function PurchaseOrderFormDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
}: PurchaseOrderFormDialogProps) {
  const t = useTranslations("purchasing.orders");
  const isEditing = Boolean(order?.id);

  const [supplierId, setSupplierId] = React.useState<string>("");
  const [expectedDate, setExpectedDate] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");
  const [discount, setDiscount] = React.useState<number>(0);
  const [items, setItems] = React.useState<PurchasingLineItemState[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (open) {
      if (order) {
        setSupplierId(order.supplierId);
        setExpectedDate(
          order.expectedDate
            ? new Date(order.expectedDate).toISOString().split("T")[0]
            : ""
        );
        setNotes(order.notes || "");
        setDiscount(order.discount || 0);
        setItems(
          order.items.map((i) => ({
            id: i.id,
            productId: i.productId,
            productName: i.product.name,
            sku: i.product.sku,
            unitSymbol: i.product.unit?.symbol || "",
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount || 0,
            taxRate: i.taxRate,
          }))
        );
      } else {
        setSupplierId("");
        setExpectedDate("");
        setNotes("");
        setDiscount(0);
        setItems([
          {
            id: `line-${Date.now()}`,
            productId: "",
            productName: "",
            unitSymbol: "",
            quantity: 1,
            unitPrice: 0,
            discount: 0,
            taxRate: 14,
          },
        ]);
      }
    }
  }, [open, order]);

  const loadSupplierOptions = React.useCallback(async (query: string) => {
    try {
      const res = await fetch(
        `/api/purchasing/suppliers/search?q=${encodeURIComponent(query)}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items || []).map((s: { value: string; label: string; phone?: string }) => ({
        value: s.value,
        label: s.label,
        description: s.phone ? `هاتف: ${s.phone}` : undefined,
      }));
    } catch {
      return [];
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      toast.error("يرجى اختيار المورد أولاً");
      return;
    }

    const validItems = items.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      toast.error("يرجى إضافة صنف واحد على الأقل مع تحديد الكمية");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        supplierId,
        expectedDate: expectedDate || null,
        discount,
        notes: notes || null,
        items: validItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
          taxRate: i.taxRate,
        })),
      };

      if (isEditing && order?.id) {
        const res = await updatePurchaseOrderAction({
          ...payload,
          id: order.id,
        });
        if (res.ok) {
          toast.success("تم تحديث أمر الشراء بنجاح");
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(res.error || "فشل تحديث أمر الشراء");
        }
      } else {
        const res = await createPurchaseOrderAction(payload);
        if (res.ok) {
          toast.success("تم إنشاء أمر الشراء بنجاح");
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(res.error || "فشل إنشاء أمر الشراء");
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("editOrder") : t("addOrder")}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "تعديل تفاصيل أمر الشراء، بنود الأصناف والأسعار."
              : "إنشاء مسودة أمر شراء رسمي موجه للمورد مع تفاصيل البنود والكميات."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                {t("supplier")} <span className="text-destructive">*</span>
              </Label>
              <ComboboxAsync
                value={supplierId}
                onChange={(val) => setSupplierId(val || "")}
                loadOptions={loadSupplierOptions}
                placeholder={t("selectSupplier")}
                initialOption={
                  order?.supplier
                    ? { value: order.supplier.id, label: order.supplier.name }
                    : undefined
                }
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("expectedDate")}</Label>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("lineItems")}</Label>
            <PurchasingLineItemsEditor
              items={items}
              onChange={setItems}
              documentDiscount={discount}
              onDocumentDiscountChange={setDiscount}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("notes")}</Label>
            <Textarea
              placeholder={t("notesPlaceholder")}
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
              {isSubmitting
                ? "جاري الحفظ..."
                : isEditing
                ? "حفظ التعديلات"
                : "حفظ أمر الشراء"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
