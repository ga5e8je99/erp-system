"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Trash2, ArrowRightLeft } from "lucide-react";
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
import { ComboboxAsync } from "@/components/shared/combobox-async";
import { createStockTransferAction } from "../actions/stock";

interface StockTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: { id: string; name: string; code: string }[];
  onSuccess?: () => void;
}

interface TransferProductOption {
  value: string;
  label: string;
  description: string;
  unitSymbol: string;
}

interface TransferLineItem {
  id: string;
  productId: string;
  productName: string;
  unitSymbol: string;
  quantity: number;
  note: string;
}

export function StockTransferDialog({
  open,
  onOpenChange,
  warehouses,
  onSuccess,
}: StockTransferDialogProps) {
  const t = useTranslations("inventory.transfers");
  const tCommon = useTranslations("common");

  const [fromWarehouseId, setFromWarehouseId] = React.useState<string>("");
  const [toWarehouseId, setToWarehouseId] = React.useState<string>("");
  const [note, setNote] = React.useState<string>("");
  const [lines, setLines] = React.useState<TransferLineItem[]>([
    {
      id: "line-1",
      productId: "",
      productName: "",
      unitSymbol: "",
      quantity: 1,
      note: "",
    },
  ]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      if (warehouses.length >= 2) {
        setFromWarehouseId(warehouses[0].id);
        setToWarehouseId(warehouses[1].id);
      } else if (warehouses.length === 1) {
        setFromWarehouseId(warehouses[0].id);
        setToWarehouseId("");
      }
      setNote("");
      setLines([
        {
          id: `line-${Date.now()}`,
          productId: "",
          productName: "",
          unitSymbol: "",
          quantity: 1,
          note: "",
        },
      ]);
    }
  }, [open, warehouses]);

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${Math.random()}`,
        productId: "",
        productName: "",
        unitSymbol: "",
        quantity: 1,
        note: "",
      },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLine = (id: string, updates: Partial<TransferLineItem>) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  };

  const fetchProducts = async (search: string): Promise<TransferProductOption[]> => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    const res = await fetch(`/api/inventory/products/search?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((item: { value: string; label: string; unitSymbol: string; stockQuantity: number }) => ({
      value: item.value,
      label: item.label,
      description: `الوحدة: ${item.unitSymbol} | المتاح: ${item.stockQuantity}`,
      unitSymbol: item.unitSymbol,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromWarehouseId || !toWarehouseId) {
      toast.error("يرجى اختيار مستودع المصدر ومستودع الوجهة");
      return;
    }

    if (fromWarehouseId === toWarehouseId) {
      toast.error(t("sameWarehouseError"));
      return;
    }

    const invalidLine = lines.find((l) => !l.productId || l.quantity <= 0);
    if (invalidLine) {
      toast.error("يرجى اختيار الصنف وتحديد كمية موجبة للتحويل");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createStockTransferAction({
        fromWarehouseId,
        toWarehouseId,
        note: note.trim() || undefined,
        lines: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          note: l.note.trim() || undefined,
        })),
      });

      if (res.ok) {
        toast.success(t("createdSuccess"));
        onOpenChange(false);
        onSuccess?.();
      } else {
        if (res.error.includes("INSUFFICIENT_STOCK")) {
          toast.error(t("insufficientStock"));
        } else {
          toast.error(res.error);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon("error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            {t("createTransfer")}
          </DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-start">
                {t("fromWarehouse")} <span className="text-destructive">*</span>
              </Label>
              <Select
                value={fromWarehouseId}
                onValueChange={(val) => {
                  if (val) setFromWarehouseId(val);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("selectFrom")} />
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

            <div className="space-y-2">
              <Label className="text-start">
                {t("toWarehouse")} <span className="text-destructive">*</span>
              </Label>
              <Select
                value={toWarehouseId}
                onValueChange={(val) => {
                  if (val) setToWarehouseId(val);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("selectTo")} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem
                      key={w.id}
                      value={w.id}
                      disabled={w.id === fromWarehouseId}
                    >
                      {w.name} ({w.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="trfNote" className="text-start">
                {t("note")}
              </Label>
              <Input
                id="trfNote"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("notePlaceholder")}
              />
            </div>
          </div>

          {/* Dynamic Lines */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">{t("lines")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLine}
                className="gap-1 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("addLine")}
              </Button>
            </div>

            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div
                  key={line.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3"
                >
                  <span className="font-mono text-xs text-muted-foreground w-6 text-center">
                    {idx + 1}
                  </span>

                  {/* Product Combobox */}
                  <div className="flex-1 min-w-[220px]">
                    <ComboboxAsync
                      value={line.productId}
                      onChange={(val, item) => {
                        const opt = item as (TransferProductOption | undefined);
                        updateLine(line.id, {
                          productId: val,
                          productName: opt?.label || "",
                          unitSymbol: opt?.unitSymbol || "",
                        });
                      }}
                      loadOptions={fetchProducts}
                      placeholder="ابحث عن الصنف بالاسم أو SKU..."
                    />
                  </div>

                  {/* Transfer Quantity */}
                  <div className="w-[110px]">
                    <Input
                      type="number"
                      step="any"
                      min="0.01"
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(line.id, {
                          quantity: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-9 font-mono text-xs"
                      placeholder={t("quantity")}
                      required
                    />
                  </div>

                  {/* Note */}
                  <div className="w-[160px]">
                    <Input
                      value={line.note}
                      onChange={(e) =>
                        updateLine(line.id, { note: e.target.value })
                      }
                      className="h-9 text-xs"
                      placeholder="ملاحظات البند..."
                    />
                  </div>

                  {/* Remove line */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                    onClick={() => removeLine(line.id)}
                    disabled={lines.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tCommon("loading") : tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
