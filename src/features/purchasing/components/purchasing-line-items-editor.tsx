"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ComboboxAsync, ComboboxOption } from "@/components/shared/combobox-async";
import { calculatePurchasingDocumentTotals } from "../services/purchasing-calculations";

export interface PurchasingLineItemState {
  id: string;
  productId: string;
  productName?: string;
  sku?: string;
  unitSymbol?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
}

export interface PurchasingLineItemsEditorProps {
  items: PurchasingLineItemState[];
  onChange: (items: PurchasingLineItemState[]) => void;
  documentDiscount?: number;
  onDocumentDiscountChange?: (discount: number) => void;
  readOnly?: boolean;
}

interface ProductComboboxItem {
  value: string;
  label: string;
  name: string;
  sku: string;
  unitSymbol: string;
  costPrice: number;
  taxRate: number;
  stockQuantity: number;
}

export function PurchasingLineItemsEditor({
  items,
  onChange,
  documentDiscount = 0,
  onDocumentDiscountChange,
  readOnly = false,
}: PurchasingLineItemsEditorProps) {
  const t = useTranslations("purchasing.lineItems");

  const loadProductOptions = React.useCallback(
    async (query: string): Promise<ComboboxOption[]> => {
      try {
        const res = await fetch(
          `/api/inventory/products/search?q=${encodeURIComponent(query)}`
        );
        if (!res.ok) return [];
        const data = await res.json();
        return (data.items || []).map((p: ProductComboboxItem) => ({
          value: p.value,
          label: `${p.name} (${p.sku})`,
          description: `سعر التكلفة: ${p.costPrice.toLocaleString()} ر.س | الحالي بالمستودع: ${p.stockQuantity} ${p.unitSymbol}`,
          raw: p,
        }));
      } catch (err) {
        console.error("Error loading products:", err);
        return [];
      }
    },
    []
  );

  const totals = React.useMemo(() => {
    return calculatePurchasingDocumentTotals(
      items.map((i) => ({
        productId: i.productId,
        quantity: Number(i.quantity) || 0,
        unitPrice: Number(i.unitPrice) || 0,
        discount: Number(i.discount) || 0,
        taxRate: Number(i.taxRate) ?? 14,
      })),
      documentDiscount
    );
  }, [items, documentDiscount]);

  const handleAddItem = () => {
    const newItem: PurchasingLineItemState = {
      id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: "",
      productName: "",
      unitSymbol: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxRate: 14,
    };
    onChange([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    onChange(items.filter((i) => i.id !== id));
  };

  const handleItemChange = (
    id: string,
    field: keyof PurchasingLineItemState,
    value: unknown
  ) => {
    onChange(
      items.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          [field]: value,
        };
      })
    );
  };

  const handleProductSelect = (
    id: string,
    val: string,
    option?: ComboboxOption
  ) => {
    if (!val || !option) {
      handleItemChange(id, "productId", "");
      return;
    }
    const raw = option.raw as ProductComboboxItem | undefined;
    onChange(
      items.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          productId: val,
          productName: raw?.name || option.label,
          sku: raw?.sku || "",
          unitSymbol: raw?.unitSymbol || "",
          unitPrice: raw?.costPrice ?? item.unitPrice,
          taxRate: raw?.taxRate ?? 14,
        };
      })
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-card overflow-x-auto">
        <table className="w-full text-sm text-start">
          <thead className="bg-muted/50 border-b text-muted-foreground">
            <tr>
              <th className="py-2.5 px-3 text-start font-medium min-w-[220px]">
                {t("product")}
              </th>
              <th className="py-2.5 px-3 text-center font-medium w-28">
                {t("quantity")}
              </th>
              <th className="py-2.5 px-3 text-center font-medium w-32">
                {t("unitCost")}
              </th>
              <th className="py-2.5 px-3 text-center font-medium w-28">
                {t("discount")}
              </th>
              <th className="py-2.5 px-3 text-center font-medium w-24">
                {t("taxRate")}
              </th>
              <th className="py-2.5 px-3 text-end font-medium w-32">
                {t("lineTotal")}
              </th>
              {!readOnly && <th className="py-2.5 px-2 w-10"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={readOnly ? 6 : 7}
                  className="py-8 text-center text-muted-foreground"
                >
                  {t("noItems")}
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const qty = Number(item.quantity) || 0;
                const price = Number(item.unitPrice) || 0;
                const discount = Number(item.discount) || 0;
                const taxRate = Number(item.taxRate) || 0;

                const sub = Math.max(0, qty * price - discount);
                const tax = (sub * taxRate) / 100;
                const lineTotal = sub + tax;

                return (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-2">
                      {readOnly ? (
                        <div>
                          <div className="font-medium text-foreground">
                            {item.productName || item.productId}
                          </div>
                          {item.sku && (
                            <div className="text-xs text-muted-foreground">
                              {item.sku}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <ComboboxAsync
                            value={item.productId}
                            onChange={(val, opt) => handleProductSelect(item.id, val, opt)}
                            loadOptions={loadProductOptions}
                            placeholder={t("selectProduct")}
                            initialOption={
                              item.productId
                                ? {
                                    value: item.productId,
                                    label: item.productName || item.productId,
                                  }
                                : undefined
                            }
                            className="w-full text-sm"
                          />
                        </div>
                      )}
                    </td>
                    <td className="p-2">
                      {readOnly ? (
                        <div className="text-center font-mono">
                          {item.quantity} {item.unitSymbol}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0.01"
                            step="any"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                item.id,
                                "quantity",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-9 text-center font-mono"
                          />
                        </div>
                      )}
                    </td>
                    <td className="p-2">
                      {readOnly ? (
                        <div className="text-center font-mono">
                          {Number(item.unitPrice).toFixed(2)}
                        </div>
                      ) : (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "unitPrice",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-9 text-center font-mono"
                        />
                      )}
                    </td>
                    <td className="p-2">
                      {readOnly ? (
                        <div className="text-center font-mono">
                          {Number(item.discount || 0).toFixed(2)}
                        </div>
                      ) : (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.discount}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "discount",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-9 text-center font-mono"
                        />
                      )}
                    </td>
                    <td className="p-2">
                      {readOnly ? (
                        <div className="text-center font-mono">
                          {item.taxRate}%
                        </div>
                      ) : (
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={item.taxRate}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "taxRate",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-9 text-center font-mono"
                        />
                      )}
                    </td>
                    <td className="p-2 text-end font-mono font-medium">
                      {lineTotal.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      ر.س
                    </td>
                    {!readOnly && (
                      <td className="p-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <div className="flex justify-between items-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className="flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>{t("addLine")}</span>
          </Button>
        </div>
      )}

      {/* Totals Summary Card */}
      <div className="flex justify-end pt-2">
        <div className="w-full max-w-sm rounded-lg border bg-muted/20 p-4 space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{t("subtotal")}</span>
            <span className="font-mono">
              {totals.subtotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}{" "}
              ر.س
            </span>
          </div>

          <div className="flex justify-between items-center text-muted-foreground">
            <span>{t("discount")}</span>
            {readOnly ? (
              <span className="font-mono text-destructive">
                -
                {totals.totalDiscount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}{" "}
                ر.س
              </span>
            ) : (
              <div className="flex items-center gap-1 w-32">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={documentDiscount}
                  onChange={(e) =>
                    onDocumentDiscountChange?.(parseFloat(e.target.value) || 0)
                  }
                  className="h-7 text-end font-mono text-xs"
                />
              </div>
            )}
          </div>

          <div className="flex justify-between text-muted-foreground">
            <span>{t("taxAmount")}</span>
            <span className="font-mono">
              {totals.taxAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}{" "}
              ر.س
            </span>
          </div>

          <div className="pt-2 border-t flex justify-between font-bold text-base text-foreground">
            <span>{t("grandTotal")}</span>
            <span className="font-mono text-primary">
              {totals.total.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}{" "}
              ر.س
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
