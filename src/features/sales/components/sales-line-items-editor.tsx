"use client";

import * as React from "react";
import { Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ComboboxAsync, ComboboxOption } from "@/components/shared/combobox-async";
import { calculateDocumentTotals } from "../services/sales-calculations";

export interface SalesLineItemState {
  id: string;
  productId: string;
  productName?: string;
  sku?: string;
  unitSymbol?: string;
  stockQuantity?: number;
  trackStock?: boolean;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
}

export interface SalesLineItemsEditorProps {
  items: SalesLineItemState[];
  onChange: (items: SalesLineItemState[]) => void;
  invoiceDiscount?: number;
  onInvoiceDiscountChange?: (discount: number) => void;
  readOnly?: boolean;
}

interface ProductComboboxItem {
  value: string;
  label: string;
  name: string;
  sku: string;
  unitSymbol: string;
  salePrice: number;
  taxRate: number;
  stockQuantity: number;
  trackStock: boolean;
}

export function SalesLineItemsEditor({
  items,
  onChange,
  invoiceDiscount = 0,
  onInvoiceDiscountChange,
  readOnly = false,
}: SalesLineItemsEditorProps) {
  const t = useTranslations("sales.lineItems");

  // Load product options from API
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
          description: `${p.salePrice.toLocaleString()} ر.س | مخزون: ${p.stockQuantity} ${p.unitSymbol}`,
          raw: p,
        }));
      } catch {
        return [];
      }
    },
    []
  );

  // Recalculate totals
  const totals = React.useMemo(() => {
    return calculateDocumentTotals({
      invoiceDiscount,
      items: items.map((i) => ({
        quantity: Number(i.quantity) || 0,
        unitPrice: Number(i.unitPrice) || 0,
        discount: Number(i.discount) || 0,
        taxRate: Number(i.taxRate) ?? 14,
      })),
    });
  }, [items, invoiceDiscount]);

  const handleAddItem = () => {
    const newItem: SalesLineItemState = {
      id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: "",
      productName: "",
      unitSymbol: "",
      stockQuantity: 0,
      trackStock: true,
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxRate: 14,
    };
    onChange([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (
    id: string,
    field: keyof SalesLineItemState,
    value: string | number
  ) => {
    const updated = items.map((item) => {
      if (item.id !== id) return item;
      return { ...item, [field]: value };
    });
    onChange(updated);
  };

  const handleProductSelect = (
    id: string,
    val: string,
    option?: ComboboxOption & { raw?: ProductComboboxItem }
  ) => {
    const raw = option?.raw;
    const updated = items.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        productId: val,
        productName: raw?.name || option?.label || "",
        sku: raw?.sku || "",
        unitSymbol: raw?.unitSymbol || "",
        stockQuantity: raw?.stockQuantity ?? 0,
        trackStock: raw?.trackStock ?? true,
        unitPrice: raw?.salePrice ?? item.unitPrice,
        taxRate: raw?.taxRate ?? 14,
      };
    });
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="text-base font-semibold">{t("title")}</h3>
        {!readOnly && (
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
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          لم يتم إضافة أي بنود بعد. انقر على &quot;{t("addLine")}&quot; لإضافة صنف.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-xs font-medium text-muted-foreground">
              <tr>
                <th className="p-2.5 text-start min-w-[240px]">{t("product")}</th>
                <th className="p-2.5 text-center w-[100px]">{t("quantity")}</th>
                <th className="p-2.5 text-center w-[120px]">{t("price")}</th>
                <th className="p-2.5 text-center w-[100px]">{t("discount")}</th>
                <th className="p-2.5 text-center w-[90px]">{t("taxRate")}</th>
                <th className="p-2.5 text-center w-[100px]">{t("taxAmount")}</th>
                <th className="p-2.5 text-end w-[130px]">{t("total")}</th>
                {!readOnly && <th className="p-2.5 w-[45px]"></th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, idx) => {
                const lineCalc = totals.items[idx];
                const isOutOfStock =
                  item.trackStock &&
                  (item.stockQuantity ?? 0) <= 0 &&
                  Boolean(item.productId);
                const isLowStock =
                  item.trackStock &&
                  (item.stockQuantity ?? 0) < item.quantity &&
                  Boolean(item.productId);

                return (
                  <tr key={item.id} className="hover:bg-muted/20">
                    {/* Product Selection & Stock Badge */}
                    <td className="p-2.5">
                      {readOnly ? (
                        <div>
                          <div className="font-medium">
                            {item.productName || item.productId}
                          </div>
                          {item.sku && (
                            <div className="text-xs text-muted-foreground">
                              SKU: {item.sku}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <ComboboxAsync
                            aria-label={t("selectProduct")}
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
                          />
                          {item.productId && (
                            <div className="flex items-center gap-2 text-xs">
                              {item.trackStock ? (
                                isOutOfStock ? (
                                  <Badge variant="destructive" className="h-5 px-1.5 text-[11px] gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span>نفد من المستودع</span>
                                  </Badge>
                                ) : isLowStock ? (
                                  <Badge variant="outline" className="h-5 px-1.5 text-[11px] text-amber-600 border-amber-300 gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span>المتاح: {item.stockQuantity} {item.unitSymbol}</span>
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                    <span>المتاح: {item.stockQuantity} {item.unitSymbol}</span>
                                  </span>
                                )
                              ) : (
                                <span className="text-muted-foreground">خدمة / غير مخزني</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Quantity */}
                    <td className="p-2.5">
                      {readOnly ? (
                        <div className="text-center font-medium">
                          {item.quantity} {item.unitSymbol}
                        </div>
                      ) : (
                        <Input
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateItem(item.id, "quantity", parseFloat(e.target.value) || 0)
                          }
                          className="text-center h-9 font-mono"
                        />
                      )}
                    </td>

                    {/* Unit Price */}
                    <td className="p-2.5">
                      {readOnly ? (
                        <div className="text-center font-mono font-medium">
                          {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      ) : (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleUpdateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)
                          }
                          className="text-center h-9 font-mono"
                        />
                      )}
                    </td>

                    {/* Discount */}
                    <td className="p-2.5">
                      {readOnly ? (
                        <div className="text-center font-mono">
                          {item.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      ) : (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.discount}
                          onChange={(e) =>
                            handleUpdateItem(item.id, "discount", parseFloat(e.target.value) || 0)
                          }
                          className="text-center h-9 font-mono"
                        />
                      )}
                    </td>

                    {/* Tax Rate */}
                    <td className="p-2.5">
                      {readOnly ? (
                        <div className="text-center font-mono">%{item.taxRate}</div>
                      ) : (
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={item.taxRate}
                          onChange={(e) =>
                            handleUpdateItem(item.id, "taxRate", parseFloat(e.target.value) || 0)
                          }
                          className="text-center h-9 font-mono"
                        />
                      )}
                    </td>

                    {/* Tax Amount (Calculated) */}
                    <td className="p-2.5 text-center font-mono text-xs text-muted-foreground">
                      {(lineCalc?.taxAmount || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    {/* Line Total */}
                    <td className="p-2.5 text-end font-mono font-semibold">
                      {(lineCalc?.total || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    {/* Delete Action */}
                    {!readOnly && (
                      <td className="p-2.5 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                          aria-label={t("removeLine")}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals Summary Card */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
        <div className="space-y-2 w-full md:w-auto">
          {!readOnly && onInvoiceDiscountChange && (
            <div className="flex items-center gap-3">
              <label htmlFor="invoice-discount" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {t("invoiceDiscount")}:
              </label>
              <Input
                id="invoice-discount"
                type="number"
                min="0"
                step="0.01"
                value={invoiceDiscount}
                onChange={(e) => onInvoiceDiscountChange(parseFloat(e.target.value) || 0)}
                className="w-36 h-8 text-center font-mono text-sm"
              />
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            {t("itemsCount")}: <span className="font-semibold text-foreground">{items.length}</span>
          </div>
        </div>

        <div className="w-full md:w-72 space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground text-xs">
            <span>{t("subtotal")}:</span>
            <span className="font-mono">
              {totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
            </span>
          </div>

          {(totals.itemsDiscount > 0 || totals.invoiceDiscount > 0) && (
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>إجمالي الخصومات:</span>
              <span className="font-mono text-destructive">
                -{(totals.totalDiscount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
              </span>
            </div>
          )}

          <div className="flex justify-between text-muted-foreground text-xs">
            <span>{t("vatAmount")}:</span>
            <span className="font-mono">
              {totals.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
            </span>
          </div>

          <div className="border-t pt-1.5 flex justify-between font-bold text-base text-primary">
            <span>{t("grandTotal")}:</span>
            <span className="font-mono">
              {totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
