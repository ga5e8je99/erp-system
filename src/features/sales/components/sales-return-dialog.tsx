"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
import { createSalesReturnAction } from "../actions/returns";

interface SalesReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: { id: string; name: string; code: string }[];
  onSuccess?: () => void;
}

interface ReturnLineItem {
  id: string;
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export function SalesReturnDialog({
  open,
  onOpenChange,
  warehouses,
  onSuccess,
}: SalesReturnDialogProps) {
  const t = useTranslations("sales.returns");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [customerId, setCustomerId] = React.useState("");
  const [warehouseId, setWarehouseId] = React.useState(warehouses[0]?.id || "");
  const [notes, setNotes] = React.useState("");
  const [items, setItems] = React.useState<ReturnLineItem[]>([]);

  React.useEffect(() => {
    if (open) {
      setCustomerId("");
      setWarehouseId(warehouses[0]?.id || "");
      setNotes("");
      setItems([]);
    }
  }, [open, warehouses]);

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

  const loadProductOptions = React.useCallback(
    async (query: string): Promise<ComboboxOption[]> => {
      try {
        const res = await fetch(`/api/inventory/products/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.items || []).map(
          (p: { value: string; name: string; sku: string; salePrice: number; taxRate: number }) => ({
            value: p.value,
            label: `${p.name} (${p.sku})`,
            raw: p,
          })
        );
      } catch {
        return [];
      }
    },
    []
  );

  const handleAddLine = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `return-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 14,
      },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleProductSelect = (
    id: string,
    val: string,
    opt?: ComboboxOption & { raw?: { salePrice: number; taxRate: number; name: string } }
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          productId: val,
          productName: opt?.raw?.name || opt?.label || "",
          unitPrice: opt?.raw?.salePrice ?? item.unitPrice,
          taxRate: opt?.raw?.taxRate ?? 14,
        };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      toast.error("يرجى اختيار العميل");
      return;
    }

    if (!warehouseId) {
      toast.error("يرجى اختيار مستودع استلام المرتجع");
      return;
    }

    if (items.length === 0) {
      toast.error("يجب إضافة صنف واحد على الأقل للمرتجع");
      return;
    }

    for (const line of items) {
      if (!line.productId) {
        toast.error("يرجى تحديد المنتج لكافة البنود");
        return;
      }
      if (line.quantity <= 0) {
        toast.error("الكمية المرتجعة يجب أن تكون أكبر من صفر");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await createSalesReturnAction({
        customerId,
        warehouseId,
        notes: notes || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          taxRate: Number(i.taxRate),
        })),
      });

      if (res.ok) {
        toast.success(`تم إنشاء مرتجع المبيعات ${res.data.returnNumber} وترحيل الإشعار الدائن`);
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(res.error || "فشل إنشاء مرتجع المبيعات");
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
          <DialogTitle>{t("addReturn")}</DialogTitle>
          <DialogDescription>
            تسجيل إشعار دائن ومرتجع مبيعات. سيتم إعادة إدخال البضاعة إلى المستودع المحدد وخصم المبلغ من حساب العميل.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="return-customer">{t("customer")} *</Label>
              <ComboboxAsync
                value={customerId}
                onChange={(val) => setCustomerId(val)}
                loadOptions={loadCustomerOptions}
                placeholder="اختر العميل..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="return-warehouse">{t("warehouse")} *</Label>
              <Select
                value={warehouseId}
                onValueChange={(val) => {
                  if (val) setWarehouseId(val);
                }}
              >
                <SelectTrigger id="return-warehouse">
                  <SelectValue placeholder="اختر مستودع الاستلام..." />
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
          </div>

          {/* Items */}
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">أصناف المرتجع</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLine}
                className="flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>إضافة صنف</span>
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="rounded border border-dashed py-6 text-center text-xs text-muted-foreground">
                انقر على إضافة صنف لتحديد المنتجات المرتجعة.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((line) => (
                  <div
                    key={line.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center rounded-lg border p-2 bg-muted/20"
                  >
                    <div className="sm:col-span-5">
                      <ComboboxAsync
                        value={line.productId}
                        onChange={(val, opt) => handleProductSelect(line.id, val, opt)}
                        loadOptions={loadProductOptions}
                        placeholder="اختر المنتج..."
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        type="number"
                        min="1"
                        placeholder="الكمية"
                        value={line.quantity}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((i) =>
                              i.id === line.id
                                ? { ...i, quantity: parseFloat(e.target.value) || 0 }
                                : i
                            )
                          )
                        }
                        className="h-9 text-center font-mono text-sm"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="السعر"
                        value={line.unitPrice}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((i) =>
                              i.id === line.id
                                ? { ...i, unitPrice: parseFloat(e.target.value) || 0 }
                                : i
                            )
                          )
                        }
                        className="h-9 text-center font-mono text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveLine(line.id)}
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="return-notes">{t("notes")}</Label>
            <Textarea
              id="return-notes"
              placeholder="سبب الإرجاع أو ملاحظات الفحص..."
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
              {isSubmitting ? "جاري الحفظ..." : "تأكيد واستلام المرتجع"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
