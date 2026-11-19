import { toMinorUnits, fromMinorUnits } from "@/lib/money";

export function roundToTwoDecimals(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export interface PurchasingLineItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number; // total discount amount for this line
  taxRate?: number; // percentage, e.g. 14 for 14%
}

export interface CalculatedPurchasingLineItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  subtotal: number; // qty * price
  taxableAmount: number; // subtotal - discount
  taxAmount: number; // taxableAmount * taxRate%
  total: number; // taxableAmount + taxAmount
}

export interface CalculatedPurchasingDocumentTotals {
  subtotal: number; // sum of line subtotals
  itemsDiscount: number; // sum of line discounts
  documentDiscount: number; // header-level discount
  totalDiscount: number; // itemsDiscount + documentDiscount
  taxableAmount: number; // subtotal - totalDiscount
  taxAmount: number; // total tax
  total: number; // taxableAmount + taxAmount
}

/**
 * Calculates line-level financials using minor units (integer cents/halalas).
 */
export function calculatePurchasingLineItem(
  item: PurchasingLineItemInput
): CalculatedPurchasingLineItem {
  const qty = Math.max(0, item.quantity);
  const priceMinor = toMinorUnits(item.unitPrice);
  const subtotalMinor = Math.round(qty * priceMinor);

  const discountMinor = Math.min(
    subtotalMinor,
    toMinorUnits(item.discount || 0)
  );
  const taxableMinor = Math.max(0, subtotalMinor - discountMinor);

  const taxRate = item.taxRate ?? 14;
  const taxRatePercent = taxRate / 100;
  const taxMinor = Math.round(taxableMinor * taxRatePercent);
  const totalMinor = taxableMinor + taxMinor;

  return {
    productId: item.productId,
    quantity: qty,
    unitPrice: item.unitPrice,
    discount: fromMinorUnits(discountMinor),
    taxRate,
    subtotal: fromMinorUnits(subtotalMinor),
    taxableAmount: fromMinorUnits(taxableMinor),
    taxAmount: fromMinorUnits(taxMinor),
    total: fromMinorUnits(totalMinor),
  };
}

/**
 * Calculates header totals from calculated lines and an optional document-level discount.
 */
export function calculatePurchasingDocumentTotals(
  items: PurchasingLineItemInput[],
  documentDiscount = 0
): CalculatedPurchasingDocumentTotals {
  let subtotalMinor = 0;
  let itemsDiscountMinor = 0;
  let taxAmountMinor = 0;

  for (const item of items) {
    const calc = calculatePurchasingLineItem(item);
    subtotalMinor += toMinorUnits(calc.subtotal);
    itemsDiscountMinor += toMinorUnits(calc.discount);
    taxAmountMinor += toMinorUnits(calc.taxAmount);
  }

  const docDiscountMinor = toMinorUnits(documentDiscount);
  const totalDiscountMinor = Math.min(
    subtotalMinor,
    itemsDiscountMinor + docDiscountMinor
  );
  const taxableMinor = Math.max(0, subtotalMinor - totalDiscountMinor);

  // If there's a document-level discount, proportional adjustment to tax:
  let finalTaxMinor = taxAmountMinor;
  if (docDiscountMinor > 0 && subtotalMinor > 0) {
    const discountRatio = totalDiscountMinor / subtotalMinor;
    finalTaxMinor = Math.round(taxAmountMinor * (1 - discountRatio));
  }

  const grandTotalMinor = taxableMinor + finalTaxMinor;

  return {
    subtotal: fromMinorUnits(subtotalMinor),
    itemsDiscount: fromMinorUnits(itemsDiscountMinor),
    documentDiscount: fromMinorUnits(docDiscountMinor),
    totalDiscount: fromMinorUnits(totalDiscountMinor),
    taxableAmount: fromMinorUnits(taxableMinor),
    taxAmount: fromMinorUnits(finalTaxMinor),
    total: fromMinorUnits(grandTotalMinor),
  };
}

/**
 * Calculates new Weighted Average Cost (WAC) when receiving new inventory.
 *
 * Formula:
 * New Cost = ((Current Stock * Current Cost) + (Received Qty * Received Unit Cost)) / (Current Stock + Received Qty)
 *
 * Rules:
 * - If current stock <= 0, new cost = received unit cost.
 * - If received qty <= 0, cost remains current cost.
 * - Result is rounded to 2 decimal places using banker-style rounding.
 */
export function calculateWeightedAverageCost(params: {
  currentStock: number;
  currentCost: number;
  receivedQty: number;
  receivedUnitCost: number;
}): number {
  const { currentStock, currentCost, receivedQty, receivedUnitCost } = params;

  if (receivedQty <= 0) {
    return roundToTwoDecimals(Math.max(0, currentCost));
  }

  if (currentStock <= 0) {
    return roundToTwoDecimals(Math.max(0, receivedUnitCost));
  }

  const currentTotalValuation = currentStock * currentCost;
  const newBatchValuation = receivedQty * receivedUnitCost;
  const totalQuantity = currentStock + receivedQty;

  if (totalQuantity <= 0) {
    return roundToTwoDecimals(Math.max(0, receivedUnitCost));
  }

  const newAverageCost =
    (currentTotalValuation + newBatchValuation) / totalQuantity;

  return roundToTwoDecimals(newAverageCost);
}

export type POStatusTransition =
  | "DRAFT"
  | "SENT"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

/**
 * Determines the resulting Purchase Order status after a goods receipt.
 *
 * @param lines Array of { orderedQty, totalReceivedQty } for each item in the PO
 * @param currentStatus Current status of the PO
 */
export function determinePOStatusAfterReceipt(
  lines: Array<{ orderedQty: number; totalReceivedQty: number }>,
  currentStatus: POStatusTransition = "SENT"
): POStatusTransition {
  if (lines.length === 0) return currentStatus;

  let allFulfilled = true;
  let anyReceived = false;

  for (const line of lines) {
    if (line.totalReceivedQty > 0) {
      anyReceived = true;
    }
    if (line.totalReceivedQty < line.orderedQty) {
      allFulfilled = false;
    }
  }

  if (allFulfilled) {
    return "RECEIVED";
  }

  if (anyReceived) {
    return "PARTIALLY_RECEIVED";
  }

  return currentStatus;
}
