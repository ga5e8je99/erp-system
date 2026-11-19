"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { RotateCcw, Plus, Trash2 } from "lucide-react";

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
import { createPurchaseReturnAction } from "../actions/returns";

interface PurchaseReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ReturnLineItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export function PurchaseReturnDialog({
  open,
  onOpenChange,
  onSuccess,
}: PurchaseReturnDialogProps) {
  const t = useTranslations("purchasing.returns");

  const [supplierId, setSupplierId] = React.useState<string>("");
  const [warehouseId, setWarehouseId] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");
  const [warehouses, setWarehouses] = React.useState<
    Array<{ id: string; name: string; code: string; isDefault: boolean }>
  >([]);
  const [items, setItems] = React.useState<ReturnLineItem[]>([
    {
      id: `line-${Date.now()}`,
      productId: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: 14,
    },
  ]);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

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
      setSupplierId("");
      setNotes("");
      setItems([
        {
          id: `line-${Date.now()}`,
          productId: "",
          quantity: 1,
          unitPrice: 0,
          taxRate: 14,
        },
      ]);
    }
  }, [open, warehouseId]);

  const loadSupplierOptions = React.useCallback(async (query: string) => {
    try {
      const res = await fetch(
        `/api/purchasing/suppliers/search?q=${encodeURIComponent(query)}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items || []).map((s: { value: string; label: string }) => ({
        value: s.value,
        label: s.label,
      }));
    } catch (err) {
      console.error(err);
      return [];
    }
  }, []);

  const loadProductOptions = React.useCallback(async (query: string) => {
    try {
      const res = await fetch(
        `/api/inventory/products/search?q=${encodeURIComponent(query)}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items || []).map((p: { value: string; label: string; costPrice: number }) => ({
        value: p.value,
        label: p.label,
        raw: p,
      }));
    } catch (err) {
      console.error(err);
      return [];
    }
  }, []);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 14,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleLineChange = (
    id: string,
    field: keyof ReturnLineItem,
    val: unknown
  ) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: val } : i))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      toast.error("يرجى اختيار المورد");
      return;
    }

    if (!warehouseId) {
      toast.error("يرجى اختيار المستودع الخارج منه البضاعة");
      return;
    }

    const validItems = items.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      toast.error("يرجى إضافة صنف مرتجع واحد على الأقل");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createPurchaseReturnAction({
        supplierId,
        warehouseId,
        notes: notes || null,
        items: validItems.map((i) => {
          const sub = i.quantity * i.unitPrice;
          const tax = (sub * (i.taxRate || 14)) / 100;
          return {
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxAmount: Math.round(tax * 100) / 100,
            total: Math.round((sub + tax) * 100) / 100,
          };
        }),
      });

      if (res.ok) {
        toast.success(
          `تم تسجيل مرتجع المشتريات (${res.data.returnNumber}) وإخراج البضاعة وترحيل القيد العكسي!`
        );
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(res.error || "فشل تسجيل المرتجع");
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
            <RotateCcw className="h-5 w-5 text-primary" />
            <span>{t("addReturn")}</span>
          </DialogTitle>
          <DialogDescription>
            {t("subtitle")}
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
                placeholder="اختر المورد..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                {t("warehouse")} <span className="text-destructive">*</span>
              </Label>
              <Select value={warehouseId} onValueChange={(val) => setWarehouseId(val || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="المستودع الخارج منه المرتجع..." />
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
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t("items")}</Label>
            <div className="rounded-md border bg-card overflow-x-auto">
              <table className="w-full text-sm text-start">
                <thead className="bg-muted/50 border-b text-muted-foreground text-xs">
                  <tr>
                    <th className="py-2 px-3 text-start min-w-[200px]">الصنف</th>
                    <th className="py-2 px-3 text-center w-28">الكمية</th>
                    <th className="py-2 px-3 text-center w-32">السعر</th>
                    <th className="py-2 px-3 text-end w-32">الإجمالي</th>
                    <th className="py-2 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((line) => {
                    const lineSub = line.quantity * line.unitPrice;
                    const lineTax = (lineSub * line.taxRate) / 100;
                    const lineTotal = lineSub + lineTax;

                    return (
                      <tr key={line.id}>
                        <td className="p-2">
                          <ComboboxAsync
                            value={line.productId}
                            onChange={(val, opt) => {
                              const raw = opt?.raw as { costPrice?: number } | undefined;
                              handleLineChange(line.id, "productId", val || "");
                              if (raw?.costPrice) {
                                handleLineChange(line.id, "unitPrice", raw.costPrice);
                              }
                            }}
                            loadOptions={loadProductOptions}
                            placeholder="اختر الصنف..."
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min="0.01"
                            step="any"
                            value={line.quantity}
                            onChange={(e) =>
                              handleLineChange(
                                line.id,
                                "quantity",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-9 text-center font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(e) =>
                              handleLineChange(
                                line.id,
                                "unitPrice",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-9 text-center font-mono"
                          />
                        </td>
                        <td className="p-2 text-end font-mono font-medium">
                          {lineTotal.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          ر.س
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(line.id)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة صنف مرتجع</span>
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label>{t("notes")}</Label>
            <Textarea
              placeholder="سبب الإرجاع أو ملاحظات..."
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
              {isSubmitting ? "جاري الإرجاع..." : "تأكيد مرتجع المشتريات"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
