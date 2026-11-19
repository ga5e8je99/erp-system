import { describe, it, expect } from "vitest";
import {
  calculatePurchasingLineItem,
  calculatePurchasingDocumentTotals,
  calculateWeightedAverageCost,
  determinePOStatusAfterReceipt,
} from "../purchasing-calculations";

describe("Purchasing Calculations & WAC", () => {
  describe("Weighted Average Cost (WAC)", () => {
    it("returns received cost when initial stock is 0", () => {
      const wac = calculateWeightedAverageCost({
        currentStock: 0,
        currentCost: 100,
        receivedQty: 50,
        receivedUnitCost: 120,
      });
      expect(wac).toBe(120);
    });

    it("returns received cost when initial stock is negative", () => {
      const wac = calculateWeightedAverageCost({
        currentStock: -5,
        currentCost: 100,
        receivedQty: 20,
        receivedUnitCost: 135,
      });
      expect(wac).toBe(135);
    });

    it("keeps existing cost when received quantity is 0", () => {
      const wac = calculateWeightedAverageCost({
        currentStock: 100,
        currentCost: 75.5,
        receivedQty: 0,
        receivedUnitCost: 90,
      });
      expect(wac).toBe(75.5);
    });

    it("calculates correct weighted average with existing stock", () => {
      // 100 units @ 50 = 5000
      // 100 units @ 70 = 7000
      // total 200 units = 12000 -> 60 per unit
      const wac = calculateWeightedAverageCost({
        currentStock: 100,
        currentCost: 50,
        receivedQty: 100,
        receivedUnitCost: 70,
      });
      expect(wac).toBe(60);
    });

    it("handles fractional quantities and prices with banker-style rounding", () => {
      // 30 units @ 45.20 = 1356.00
      // 70 units @ 52.80 = 3696.00
      // total 100 units = 5052.00 / 100 = 50.52
      const wac = calculateWeightedAverageCost({
        currentStock: 30,
        currentCost: 45.2,
        receivedQty: 70,
        receivedUnitCost: 52.8,
      });
      expect(wac).toBe(50.52);
    });
  });

  describe("PO Status Transition After Receipt", () => {
    it("returns RECEIVED when all lines are fully received", () => {
      const status = determinePOStatusAfterReceipt(
        [
          { orderedQty: 10, totalReceivedQty: 10 },
          { orderedQty: 5, totalReceivedQty: 5 },
        ],
        "SENT"
      );
      expect(status).toBe("RECEIVED");
    });

    it("returns RECEIVED when lines are over-received", () => {
      const status = determinePOStatusAfterReceipt(
        [
          { orderedQty: 10, totalReceivedQty: 12 },
          { orderedQty: 5, totalReceivedQty: 5 },
        ],
        "SENT"
      );
      expect(status).toBe("RECEIVED");
    });

    it("returns PARTIALLY_RECEIVED when some lines are partially received", () => {
      const status = determinePOStatusAfterReceipt(
        [
          { orderedQty: 10, totalReceivedQty: 6 },
          { orderedQty: 5, totalReceivedQty: 0 },
        ],
        "SENT"
      );
      expect(status).toBe("PARTIALLY_RECEIVED");
    });

    it("returns PARTIALLY_RECEIVED when one line is complete and another incomplete", () => {
      const status = determinePOStatusAfterReceipt(
        [
          { orderedQty: 10, totalReceivedQty: 10 },
          { orderedQty: 5, totalReceivedQty: 2 },
        ],
        "SENT"
      );
      expect(status).toBe("PARTIALLY_RECEIVED");
    });

    it("preserves SENT status when zero items have been received", () => {
      const status = determinePOStatusAfterReceipt(
        [
          { orderedQty: 10, totalReceivedQty: 0 },
          { orderedQty: 5, totalReceivedQty: 0 },
        ],
        "SENT"
      );
      expect(status).toBe("SENT");
    });
  });

  describe("Purchasing Document Totals", () => {
    it("calculates line items with tax and discounts accurately", () => {
      const line = calculatePurchasingLineItem({
        productId: "p1",
        quantity: 10,
        unitPrice: 100,
        discount: 50,
        taxRate: 14,
      });
      // subtotal = 1000
      // discount = 50
      // taxable = 950
      // tax = 950 * 14% = 133
      // total = 950 + 133 = 1083
      expect(line.subtotal).toBe(1000);
      expect(line.discount).toBe(50);
      expect(line.taxableAmount).toBe(950);
      expect(line.taxAmount).toBe(133);
      expect(line.total).toBe(1083);
    });

    it("calculates document totals with overall document discount", () => {
      const totals = calculatePurchasingDocumentTotals(
        [
          { productId: "p1", quantity: 5, unitPrice: 200, taxRate: 14 }, // subtotal 1000, tax 140
          { productId: "p2", quantity: 2, unitPrice: 500, taxRate: 14 }, // subtotal 1000, tax 140
        ],
        200 // 200 doc discount: 10% discount across 2000 subtotal
      );

      expect(totals.subtotal).toBe(2000);
      expect(totals.totalDiscount).toBe(200);
      expect(totals.taxableAmount).toBe(1800);
      // tax is 1800 * 14% = 252
      expect(totals.taxAmount).toBe(252);
      expect(totals.total).toBe(2052);
    });
  });
});
