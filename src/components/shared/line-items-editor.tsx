"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/shared/currency-input";
import { formatMoney, type CurrencyCode } from "@/lib/money";

export interface LineItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number; // in minor units
  taxRate: number; // percentage, e.g. 15
  discount: number; // in minor units
}

export interface LineItemsTotals {
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
}

export interface LineItemsEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[], totals: LineItemsTotals) => void;
  currency?: string;
  readOnly?: boolean;
}

export function LineItemsEditor({
  items,
  onChange,
  currency = "ر.س",
  readOnly = false,
}: LineItemsEditorProps) {
  const t = useTranslations("lineItems");

  const resolvedCurrency = (currency === "ر.س" ? "SAR" : currency) as CurrencyCode;

  // Calculate line item totals
  const computeLineTotal = (item: LineItem) => {
    const rawTotal = Math.round(item.quantity * item.unitPrice);
    const afterDiscount = Math.max(0, rawTotal - item.discount);
    const taxAmount = Math.round(afterDiscount * (item.taxRate / 100));
    return afterDiscount + taxAmount;
  };

  // Calculate aggregate totals
  const totals = React.useMemo<LineItemsTotals>(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    items.forEach((item) => {
      const lineRaw = Math.round(item.quantity * item.unitPrice);
      subtotal += lineRaw;
      totalDiscount += item.discount;
      const afterDiscount = Math.max(0, lineRaw - item.discount);
      totalTax += Math.round(afterDiscount * (item.taxRate / 100));
    });

    const grandTotal = subtotal - totalDiscount + totalTax;

    return {
      subtotal,
      totalDiscount,
      totalTax,
      grandTotal: Math.max(0, grandTotal),
    };
  }, [items]);

  const handleUpdateItem = (
    id: string,
    field: keyof LineItem,
    value: string | number
  ) => {
    const nextItems = items.map((item) => {
      if (item.id !== id) return item;
      return { ...item, [field]: value };
    });
    onChange(nextItems, totals);
  };

  const handleAddItem = () => {
    const newItem: LineItem = {
      id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: 15, // default 15% VAT
      discount: 0,
    };
    const nextItems = [...items, newItem];
    onChange(nextItems, totals);
  };

  const handleRemoveItem = (id: string) => {
    const nextItems = items.filter((item) => item.id !== id);
    onChange(nextItems, totals);
  };

  return (
    <div className="space-y-4">
      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-2xs">
        <Table className="min-w-[650px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 text-center">#</TableHead>
              <TableHead className="min-w-[180px]">{t("product")}</TableHead>
              <TableHead className="w-24 text-center">{t("quantity")}</TableHead>
              <TableHead className="w-32">{t("unitPrice")}</TableHead>
              <TableHead className="w-24 text-center">{t("taxRate")}</TableHead>
              <TableHead className="w-28">{t("discount")}</TableHead>
              <TableHead className="w-32 text-end">{t("total")}</TableHead>
              {!readOnly && <TableHead className="w-12 text-center"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={readOnly ? 7 : 8}
                  className="h-28 text-center text-xs text-muted-foreground"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, index) => {
                const lineTotal = computeLineTotal(item);
                return (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="text-center text-xs font-mono text-muted-foreground">
                      {index + 1}
                    </TableCell>

                    <TableCell>
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          handleUpdateItem(item.id, "description", e.target.value)
                        }
                        placeholder={t("product")}
                        disabled={readOnly}
                        className="h-8 text-xs"
                      />
                    </TableCell>

                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateItem(
                            item.id,
                            "quantity",
                            Math.max(1, parseInt(e.target.value) || 1)
                          )
                        }
                        disabled={readOnly}
                        className="h-8 text-center text-xs font-mono tabular-nums"
                      />
                    </TableCell>

                    <TableCell>
                      <CurrencyInput
                        value={item.unitPrice}
                        onChange={(val) =>
                          handleUpdateItem(item.id, "unitPrice", val)
                        }
                        currency=""
                        disabled={readOnly}
                        className="h-8 text-xs font-mono tabular-nums"
                      />
                    </TableCell>

                    <TableCell>
                      <div className="relative flex items-center">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={item.taxRate}
                          onChange={(e) =>
                            handleUpdateItem(
                              item.id,
                              "taxRate",
                              Math.max(0, parseFloat(e.target.value) || 0)
                            )
                          }
                          disabled={readOnly}
                          className="h-8 pe-6 text-center text-xs font-mono tabular-nums"
                        />
                        <span className="pointer-events-none absolute end-2 text-xs text-muted-foreground">
                          %
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <CurrencyInput
                        value={item.discount}
                        onChange={(val) =>
                          handleUpdateItem(item.id, "discount", val)
                        }
                        currency=""
                        disabled={readOnly}
                        className="h-8 text-xs font-mono tabular-nums"
                      />
                    </TableCell>

                    <TableCell className="text-end font-mono text-xs font-semibold tabular-nums text-foreground">
                      {formatMoney(lineTotal, { currency: resolvedCurrency, locale: "ar-SA" })}
                    </TableCell>

                    {!readOnly && (
                      <TableCell className="text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          aria-label={t("remove")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Action to Add Item */}
      {!readOnly && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddItem}
          className="h-8 text-xs"
        >
          <Plus className="me-1.5 h-3.5 w-3.5" />
          <span>{t("addItem")}</span>
        </Button>
      )}

      {/* Summary Box */}
      <div className="flex justify-end">
        <div className="w-full max-w-xs space-y-2 rounded-xl border border-border bg-card p-4 shadow-2xs text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>{t("subtotal")}:</span>
            <span className="font-mono tabular-nums text-foreground">
              {formatMoney(totals.subtotal, { currency: resolvedCurrency, locale: "ar-SA" })}
            </span>
          </div>

          <div className="flex items-center justify-between text-muted-foreground">
            <span>{t("totalDiscount")}:</span>
            <span className="font-mono tabular-nums text-rose-600 dark:text-rose-400">
              -{formatMoney(totals.totalDiscount, { currency: resolvedCurrency, locale: "ar-SA" })}
            </span>
          </div>

          <div className="flex items-center justify-between text-muted-foreground">
            <span>{t("totalTax")}:</span>
            <span className="font-mono tabular-nums text-foreground">
              +{formatMoney(totals.totalTax, { currency: resolvedCurrency, locale: "ar-SA" })}
            </span>
          </div>

          <div className="border-t border-border pt-2 flex items-center justify-between font-semibold text-sm">
            <span className="text-foreground">{t("grandTotal")}:</span>
            <span className="font-mono tabular-nums text-primary text-base">
              {formatMoney(totals.grandTotal, { currency: resolvedCurrency, locale: "ar-SA" })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
