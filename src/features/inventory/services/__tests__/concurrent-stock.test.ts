import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { StockMovementType } from "@prisma/client";
import { recordStockMovement } from "../stock-movement";

describe("Concurrent Stock Deduction Concurrency & Safety", () => {
  let testUnitId: string;
  let testWarehouseId: string;
  let testProductId: string;

  beforeAll(async () => {
    // 1. Setup Unit
    let unit = await db.unit.findFirst({ where: { name: "قطعة تجارب التزامن" } });
    if (!unit) {
      unit = await db.unit.create({
        data: { name: "قطعة تجارب التزامن", symbol: "قطعة" },
      });
    }
    testUnitId = unit.id;

    // 2. Setup Warehouse
    const wh = await db.warehouse.upsert({
      where: { code: "WH-CONCURRENT-TEST" },
      update: {},
      create: {
        name: "مستودع تجارب التزامن",
        code: "WH-CONCURRENT-TEST",
      },
    });
    testWarehouseId = wh.id;

    // 3. Ensure negative stock is NOT allowed
    await db.companySettings.updateMany({
      data: { allowNegativeStock: false },
    });

    // 4. Create Product with initial stock of 10
    const product = await db.product.create({
      data: {
        name: "منتج فحص التزامن لمنع المخزون السالب",
        sku: `SKU-CONC-${Date.now()}`,
        unitId: testUnitId,
        costPrice: 20,
        salePrice: 40,
        trackStock: true,
      },
    });
    testProductId = product.id;

    // Seed stock to exactly 10 units
    await recordStockMovement(db, {
      productId: testProductId,
      warehouseId: testWarehouseId,
      type: StockMovementType.IN,
      quantity: 10,
      note: "Initial Stock Seed: 10 units",
    });
  });

  afterAll(async () => {
    // Cleanup
    await db.stockMovement.deleteMany({
      where: { productId: testProductId },
    });
    await db.stockLevel.deleteMany({
      where: { productId: testProductId },
    });
    await db.product.deleteMany({
      where: { id: testProductId },
    });
  });

  it("prevents concurrent deductions from driving stock negative when negative stock is disallowed", async () => {
    // Verify initial stock is 10
    const initialLevel = await db.stockLevel.findUnique({
      where: {
        productId_warehouseId: {
          productId: testProductId,
          warehouseId: testWarehouseId,
        },
      },
    });
    expect(Number(initialLevel?.quantity)).toBe(10);

    // Launch 3 concurrent transactions simultaneously
    // Each transaction attempts to deduct 6 units (total requested = 18 units)
    // Since only 10 units exist and negative stock is disallowed, exactly 1 must succeed and 2 must fail.
    const concurrentAttempts = [1, 2, 3].map((idx) =>
      db.$transaction(async (tx) => {
        return recordStockMovement(tx, {
          productId: testProductId,
          warehouseId: testWarehouseId,
          type: StockMovementType.OUT,
          quantity: 6,
          note: `Concurrent deduction attempt #${idx}`,
        });
      })
    );

    const results = await Promise.allSettled(concurrentAttempts);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Exactly 1 must succeed because 10 - 6 = 4 remaining; another deduction of 6 would make it -2
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(2);

    // The rejected attempts must fail with INSUFFICIENT_STOCK
    for (const r of rejected) {
      if (r.status === "rejected") {
        expect(r.reason.message).toContain("INSUFFICIENT_STOCK");
      }
    }

    // Verify database state: final stock level must be exactly 4, never negative
    const finalLevel = await db.stockLevel.findUnique({
      where: {
        productId_warehouseId: {
          productId: testProductId,
          warehouseId: testWarehouseId,
        },
      },
    });
    expect(Number(finalLevel?.quantity)).toBe(4);
  });
});
