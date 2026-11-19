"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PackageCheck } from "lucide-react";

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
import { createGoodsReceiptAction } from "../actions/receipts";
import type { PurchaseOrderPayload } from "../types";

interface GoodsReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: PurchaseOrderPayload | null;
  onSuccess?: () => void;
}

interface ReceiptLineItem {
  productId: string;
  productName: string;
  sku: string;
  unitSymbol: string;
  orderedQty?: number;
  quantity: number;
  unitCost: number;
}

export function GoodsReceiptDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
}: GoodsReceiptDialogProps) {
  const t = useTranslations("purchasing.receipts");

  const [supplierId, setSupplierId] = React.useState<string>("");
  const [supplierName, setSupplierName] = React.useState<string>("");
  const [warehouseId, setWarehouseId] = React.useState<string>("");
  const [receiveDate, setReceiveDate] = React.useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = React.useState<string>("");
  const [items, setItems] = React.useState<ReceiptLineItem[]>([]);
  const [warehouses, setWarehouses] = React.useState<
    Array<{ id: string; name: string; code: string; isDefault: boolean }>
  >([]);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  // Load warehouses
  React.useEffect(() => {
    async function loadWarehouses() {
      try {
        const res = await fetch("/api/inventory/warehouses");
        if (res.ok) {
          const data = await res.json();
          setWarehouses(data.items || []);
          const def = (data.items || []).find((w: { isDefault: boolean }) => w.isDefault);
          if (def && !warehouseId) {
            setWarehouseId(def.id);
          }
        }
      } catch (err) {
        console.error("Failed to load warehouses:", err);
      }
    }
    if (open) {
      loadWarehouses();
    }
  }, [open, warehouseId]);

  // Initialize from order if provided
  React.useEffect(() => {
    if (open) {
      if (order) {
        setSupplierId(order.supplierId);
        setSupplierName(order.supplier.name);
        setItems(
          order.items.map((i) => ({
            productId: i.productId,
            productName: i.product.name,
            sku: i.product.sku,
            unitSymbol: i.product.unit?.symbol || "",
            orderedQty: i.quantity,
            quantity: i.quantity, // default to remaining/ordered
            unitCost: i.unitPrice,
          }))
        );
      } else {
        setSupplierId("");
        setSupplierName("");
        setItems([]);
      }
      setReceiveDate(new Date().toISOString().split("T")[0]);
      setNotes("");
    }
  }, [open, order]);

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
    } catch (err) {
      console.error(err);
      return [];
    }
  }, []);

  const handleLineQtyChange = (index: number, val: number) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, quantity: val } : item))
    );
  };

  const handleLineCostChange = (index: number, val: number) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, unitCost: val } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      toast.error("يرجى اختيار المورد أولاً");
      return;
    }

    if (!warehouseId) {
      toast.error("يرجى اختيار المستودع المستلم");
      return;
    }

    const validItems = items.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      toast.error("يرجى إدخال كمية استلام صالحة لأحد الأصناف على الأقل");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createGoodsReceiptAction({
        poId: order?.id || null,
        supplierId,
        warehouseId,
        receiveDate,
        notes: notes || null,
        items: validItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitCost: i.unitCost,
        })),
      });

      if (res.ok) {
        toast.success(
          `تم تسجيل إيصال الاستلام بنجاح (${res.data.receiptNumber}) وتحديث المخزون ومتوسط التكلفة!`
        );
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(res.error || "فشل تسجيل إيصال الاستلام");
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-primary" />
            <span>{t("createReceipt")}</span>
          </DialogTitle>
          <DialogDescription>
            {order
              ? `استلام بضائع واردة بموجب أمر الشراء رقم (${order.poNumber}). سيتم إضافة الكميات للمستودع وإعادة احتساب متوسط التكلفة المرجح (WAC).`
              : "تسجيل إيصال استلام بضائع مباشر من المورد وإدخالها للمستودع."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>
                {t("supplier")} <span className="text-destructive">*</span>
              </Label>
              {order ? (
                <Input value={supplierName} disabled className="bg-muted font-medium" />
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

            <div className="space-y-1.5">
              <Label>
                {t("warehouse")} <span className="text-destructive">*</span>
              </Label>
              <Select value={warehouseId} onValueChange={(val) => setWarehouseId(val || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المستودع المستلم..." />
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
              <Label>{t("receiveDate")}</Label>
              <Input
                type="date"
                value={receiveDate}
                onChange={(e) => setReceiveDate(e.target.value)}
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t("items")}</Label>
            <div className="rounded-md border bg-card overflow-x-auto">
              <table className="w-full text-sm text-start">
                <thead className="bg-muted/50 border-b text-muted-foreground text-xs">
                  <tr>
                    <th className="py-2 px-3 text-start">{t("product")}</th>
                    {order && (
                      <th className="py-2 px-3 text-center w-24">
                        الكمية المطلوبة
                      </th>
                    )}
                    <th className="py-2 px-3 text-center w-32">
                      الكمية المستلمة فعلياً
                    </th>
                    <th className="py-2 px-3 text-center w-32">
                      سعر التكلفة للوحدة
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, idx) => (
                    <tr key={item.productId || idx}>
                      <td className="py-2 px-3">
                        <div className="font-medium text-foreground">
                          {item.productName}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {item.sku}
                        </div>
                      </td>
                      {order && (
                        <td className="py-2 px-3 text-center font-mono text-muted-foreground">
                          {item.orderedQty} {item.unitSymbol}
                        </td>
                      )}
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={item.quantity}
                          onChange={(e) =>
                            handleLineQtyChange(
                              idx,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-8 text-center font-mono font-bold"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitCost}
                          onChange={(e) =>
                            handleLineCostChange(
                              idx,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-8 text-center font-mono"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("notes")}</Label>
            <Textarea
              placeholder="أي ملاحظات حول حالة الشحنة أو بوليصة الشحن..."
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
            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
              {isSubmitting ? "جاري الاستلام والتحديث..." : "تأكيد استلام البضائع"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
