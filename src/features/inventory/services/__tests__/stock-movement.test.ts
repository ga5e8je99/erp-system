import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { StockMovementType } from "@prisma/client";
import {
  recordStockMovement,
  executeStockAdjustment,
  executeStockTransfer,
  generateProductSku,
} from "../stock-movement";

describe("Stock Movement Service", () => {
  let testUnitId: string;
  let testWarehouse1Id: string;
  let testWarehouse2Id: string;
  let testProductId: string;

  beforeAll(async () => {
    // Ensure a unit
    let unit = await db.unit.findFirst({ where: { name: "قطعة" } });
    if (!unit) {
      unit = await db.unit.create({
        data: { name: "قطعة تجريبية", symbol: "قطعة" },
      });
    }
    testUnitId = unit.id;

    // Ensure 2 warehouses
    const wh1 = await db.warehouse.upsert({
      where: { code: "WH-TEST-1" },
      update: {},
      create: {
        name: "مستودع تجريبي 1",
        code: "WH-TEST-1",
        address: "موقع 1",
      },
    });
    testWarehouse1Id = wh1.id;

    const wh2 = await db.warehouse.upsert({
      where: { code: "WH-TEST-2" },
      update: {},
      create: {
        name: "مستودع تجريبي 2",
        code: "WH-TEST-2",
        address: "موقع 2",
      },
    });
    testWarehouse2Id = wh2.id;

    // Create a dedicated test product
    const product = await db.product.create({
      data: {
        name: "منتج تجارب المخزون",
        sku: `SKU-TEST-${Date.now()}`,
        unitId: testUnitId,
        costPrice: 50,
        salePrice: 100,
        trackStock: true,
        reorderLevel: 5,
      },
    });
    testProductId = product.id;

    // Default company setting allowNegativeStock to false
    await db.companySettings.updateMany({
      data: { allowNegativeStock: false },
    });
  });

  afterAll(async () => {
    // Clean up
    await db.stockMovement.deleteMany({
      where: { productId: testProductId },
    });
    await db.stockLevel.deleteMany({
      where: { productId: testProductId },
    });
    await db.product.deleteMany({
      where: { id: testProductId },
    });
    await db.warehouse.deleteMany({
      where: { code: { in: ["WH-TEST-1", "WH-TEST-2"] } },
    });
  });

  it("successfully records an IN movement and updates StockLevel", async () => {
    const { movement, stockLevel } = await recordStockMovement(db, {
      productId: testProductId,
      warehouseId: testWarehouse1Id,
      type: StockMovementType.IN,
      quantity: 50,
      note: "Initial test batch",
    });

    expect(movement.id).toBeDefined();
    expect(movement.type).toBe(StockMovementType.IN);
    expect(Number(movement.quantity)).toBe(50);
    expect(Number(stockLevel.quantity)).toBe(50);

    const freshLevel = await db.stockLevel.findUnique({
      where: {
        productId_warehouseId: {
          productId: testProductId,
          warehouseId: testWarehouse1Id,
        },
      },
    });
    expect(Number(freshLevel?.quantity)).toBe(50);
  });

  it("successfully records an OUT movement and decreases StockLevel", async () => {
    const { movement, stockLevel } = await recordStockMovement(db, {
      productId: testProductId,
      warehouseId: testWarehouse1Id,
      type: StockMovementType.OUT,
      quantity: 20,
      note: "Sold 20 items",
    });

    expect(movement.type).toBe(StockMovementType.OUT);
    expect(Number(movement.quantity)).toBe(20);
    expect(Number(stockLevel.quantity)).toBe(30);
  });

  it("prevents negative stock when allowNegativeStock is false", async () => {
    await expect(
      recordStockMovement(db, {
        productId: testProductId,
        warehouseId: testWarehouse1Id,
        type: StockMovementType.OUT,
        quantity: 100, // Current stock is 30, so this would become -70
      })
    ).rejects.toThrow(/INSUFFICIENT_STOCK/);

    // Verify stock was NOT altered
    const level = await db.stockLevel.findUnique({
      where: {
        productId_warehouseId: {
          productId: testProductId,
          warehouseId: testWarehouse1Id,
        },
      },
    });
    expect(Number(level?.quantity)).toBe(30);
  });

  it("allows negative stock when allowNegativeStock is enabled in company settings", async () => {
    // Enable allowNegativeStock
    await db.companySettings.updateMany({
      data: { allowNegativeStock: true },
    });

    const { stockLevel } = await recordStockMovement(db, {
      productId: testProductId,
      warehouseId: testWarehouse1Id,
      type: StockMovementType.OUT,
      quantity: 50, // Current is 30 -> -20
    });

    expect(Number(stockLevel.quantity)).toBe(-20);

    // Revert setting to false
    await db.companySettings.updateMany({
      data: { allowNegativeStock: false },
    });
  });

  it("executes stock adjustments with increase and decrease lines", async () => {
    // Currently WH1 has -20. Let's adjust +70 to bring to 50
    const result = await executeStockAdjustment({
      warehouseId: testWarehouse1Id,
      reason: "الجرد الدوري السنوي",
      lines: [
        {
          productId: testProductId,
          type: "INCREASE",
          quantity: 70,
          note: "فائض جرد",
        },
      ],
    });

    expect(result.adjustmentBatchId).toMatch(/^ADJ-/);
    expect(result.movementsCount).toBe(1);

    const level = await db.stockLevel.findUnique({
      where: {
        productId_warehouseId: {
          productId: testProductId,
          warehouseId: testWarehouse1Id,
        },
      },
    });
    expect(Number(level?.quantity)).toBe(50);
  });

  it("atomically transfers stock between warehouses", async () => {
    // Transfer 15 from WH1 to WH2
    const transferResult = await executeStockTransfer({
      fromWarehouseId: testWarehouse1Id,
      toWarehouseId: testWarehouse2Id,
      note: "تحويل فرعي للاختبار",
      lines: [
        {
          productId: testProductId,
          quantity: 15,
        },
      ],
    });

    expect(transferResult.transferBatchId).toMatch(/^TRF-/);

    // WH1 should now have 50 - 15 = 35
    const wh1Level = await db.stockLevel.findUnique({
      where: {
        productId_warehouseId: {
          productId: testProductId,
          warehouseId: testWarehouse1Id,
        },
      },
    });
    expect(Number(wh1Level?.quantity)).toBe(35);

    // WH2 should now have 0 + 15 = 15
    const wh2Level = await db.stockLevel.findUnique({
      where: {
        productId_warehouseId: {
          productId: testProductId,
          warehouseId: testWarehouse2Id,
        },
      },
    });
    expect(Number(wh2Level?.quantity)).toBe(15);

    // Check movements recorded
    const movements = await db.stockMovement.findMany({
      where: {
        referenceId: transferResult.transferBatchId,
      },
    });
    expect(movements.length).toBe(2);
    expect(movements.some((m) => m.referenceType === "TRANSFER_OUT")).toBe(true);
    expect(movements.some((m) => m.referenceType === "TRANSFER_IN")).toBe(true);
  });

  it("generates formatted product SKU PRD-YYYY-XXXXX automatically", async () => {
    const sku1 = await generateProductSku(db);
    const sku2 = await generateProductSku(db);

    const year = new Date().getFullYear();
    expect(sku1).toMatch(new RegExp(`^PRD-${year}-\\d{5}`));
    expect(sku2).toMatch(new RegExp(`^PRD-${year}-\\d{5}`));
    expect(sku1).not.toBe(sku2);
  });
});
