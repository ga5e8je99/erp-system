import { toMinorUnits, fromMinorUnits } from "@/lib/money";

export interface LineItemCalculationInput {
  quantity: number;
  unitPrice: number;
  discount?: number; // Flat discount on the line
  taxRate?: number; // e.g. 14 for 14%
}

export interface LineItemCalculationResult {
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface DocumentTotalsInput {
  items: LineItemCalculationInput[];
  invoiceDiscount?: number; // Invoice-level flat discount
}

export interface DocumentTotalsResult {
  items: LineItemCalculationResult[];
  subtotal: number; // Sum of line items before tax & discount
  itemsDiscount: number; // Sum of line item discounts
  invoiceDiscount: number;
  totalDiscount: number;
  taxableAmount: number;
  tax: number; // Total VAT
  total: number; // Grand total payable
}

/**
 * Calculates financial amounts for a single invoice/order line item.
 * Uses integer minor units to eliminate floating-point drift.
 */
export function calculateLineItem(input: LineItemCalculationInput): LineItemCalculationResult {
  const qty = Math.max(0, input.quantity);
  const priceMinor = toMinorUnits(input.unitPrice);
  const discountMinor = toMinorUnits(input.discount || 0);
  const taxRate = input.taxRate ?? 14;

  const subtotalMinor = Math.round(qty * priceMinor);
  const taxableMinor = Math.max(0, subtotalMinor - discountMinor);
  const taxAmountMinor = Math.round((taxableMinor * taxRate) / 100);
  const totalMinor = taxableMinor + taxAmountMinor;

  return {
    quantity: qty,
    unitPrice: fromMinorUnits(priceMinor),
    discount: fromMinorUnits(discountMinor),
    subtotal: fromMinorUnits(subtotalMinor),
    taxableAmount: fromMinorUnits(taxableMinor),
    taxRate,
    taxAmount: fromMinorUnits(taxAmountMinor),
    total: fromMinorUnits(totalMinor),
  };
}

/**
 * Recalculates document totals across all line items and applies invoice-level discount.
 */
export function calculateDocumentTotals(input: DocumentTotalsInput): DocumentTotalsResult {
  const calculatedItems = input.items.map(calculateLineItem);

  let subtotalMinor = 0;
  let itemsDiscountMinor = 0;
  let taxMinor = 0;

  for (const item of calculatedItems) {
    subtotalMinor += toMinorUnits(item.subtotal);
    itemsDiscountMinor += toMinorUnits(item.discount);
    taxMinor += toMinorUnits(item.taxAmount);
  }

  const invoiceDiscountMinor = toMinorUnits(input.invoiceDiscount || 0);
  const totalDiscountMinor = itemsDiscountMinor + invoiceDiscountMinor;

  const netSubtotalMinor = Math.max(0, subtotalMinor - totalDiscountMinor);
  const grandTotalMinor = netSubtotalMinor + taxMinor;

  return {
    items: calculatedItems,
    subtotal: fromMinorUnits(subtotalMinor),
    itemsDiscount: fromMinorUnits(itemsDiscountMinor),
    invoiceDiscount: fromMinorUnits(invoiceDiscountMinor),
    totalDiscount: fromMinorUnits(totalDiscountMinor),
    taxableAmount: fromMinorUnits(netSubtotalMinor),
    tax: fromMinorUnits(taxMinor),
    total: fromMinorUnits(grandTotalMinor),
  };
}
