import { Prisma, StockMovementType } from "@prisma/client";
import { db } from "@/lib/db";

export type DbClient = Prisma.TransactionClient | typeof db;

export interface SingleMovementParams {
  productId: string;
  warehouseId: string;
  type: StockMovementType;
  quantity: number | Prisma.Decimal;
  referenceType?: string;
  referenceId?: string;
  note?: string;
  createdById?: string;
}

export interface StockAdjustmentLine {
  productId: string;
  type: "INCREASE" | "DECREASE";
  quantity: number;
  note?: string;
}

export interface StockAdjustmentParams {
  warehouseId: string;
  reason: string;
  lines: StockAdjustmentLine[];
  createdById?: string;
}

export interface StockTransferLine {
  productId: string;
  quantity: number;
  note?: string;
}

export interface StockTransferParams {
  fromWarehouseId: string;
  toWarehouseId: string;
  lines: StockTransferLine[];
  note?: string;
  createdById?: string;
}

/**
 * Checks whether negative stock is permitted by company settings.
 */
export async function getAllowNegativeStock(client: DbClient): Promise<boolean> {
  const settings = await client.companySettings.findFirst({
    select: { allowNegativeStock: true },
  });
  return Boolean(settings?.allowNegativeStock);
}

/**
 * Core transactional stock movement engine.
 * Updates or creates StockLevel atomically with a StockMovement record.
 * Throws an error if negative stock is disallowed and stock drops below 0.
 */
export async function recordStockMovement(
  client: DbClient,
  params: SingleMovementParams
) {
  const {
    productId,
    warehouseId,
    type,
    quantity,
    referenceType,
    referenceId,
    note,
    createdById,
  } = params;

  const numQty = typeof quantity === "number" ? quantity : Number(quantity);
  if (numQty <= 0) {
    throw new Error("INVALID_QUANTITY: Movement quantity must be strictly greater than 0");
  }

  // Check product exists and tracks stock
  const product = await client.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, trackStock: true, deletedAt: true },
  });

  if (!product || product.deletedAt) {
    throw new Error(`PRODUCT_NOT_FOUND: Product ${productId} does not exist or has been deleted`);
  }

  // If the product doesn't track stock, we still log the movement but don't enforce limits
  const tracksStock = product.trackStock;

  // Retrieve current stock level
  const currentStockLevel = await client.stockLevel.findUnique({
    where: {
      productId_warehouseId: {
        productId,
        warehouseId,
      },
    },
  });

  const currentQty = currentStockLevel ? Number(currentStockLevel.quantity) : 0;
  let newQty = currentQty;

  // Determine delta based on movement type and referenceType
  let isReduction = false;
  if (type === StockMovementType.OUT) {
    isReduction = true;
    newQty = currentQty - numQty;
  } else if (type === StockMovementType.IN) {
    newQty = currentQty + numQty;
  } else if (type === StockMovementType.TRANSFER) {
    if (referenceType === "TRANSFER_OUT") {
      isReduction = true;
      newQty = currentQty - numQty;
    } else {
      newQty = currentQty + numQty;
    }
  } else if (type === StockMovementType.ADJUSTMENT) {
    if (referenceType === "ADJUSTMENT_DECREASE") {
      isReduction = true;
      newQty = currentQty - numQty;
    } else {
      newQty = currentQty + numQty;
    }
  }

  // Enforce negative stock validation
  if (isReduction && tracksStock && newQty < 0) {
    const allowNegative = await getAllowNegativeStock(client);
    if (!allowNegative) {
      throw new Error(
        `INSUFFICIENT_STOCK: Cannot reduce stock for '${product.name}'. Current: ${currentQty}, Requested: ${numQty}, Resulting: ${newQty}`
      );
    }
  }

  // Update or insert StockLevel
  const updatedStockLevel = await client.stockLevel.upsert({
    where: {
      productId_warehouseId: {
        productId,
        warehouseId,
      },
    },
    update: {
      quantity: new Prisma.Decimal(newQty),
    },
    create: {
      productId,
      warehouseId,
      quantity: new Prisma.Decimal(newQty),
    },
  });

  // Create StockMovement record
  const movement = await client.stockMovement.create({
    data: {
      productId,
      warehouseId,
      type,
      quantity: new Prisma.Decimal(numQty),
      referenceType: referenceType ?? null,
      referenceId: referenceId ?? null,
      note: note ?? null,
      createdById: createdById ?? null,
    },
  });

  return { movement, stockLevel: updatedStockLevel };
}

/**
 * Executes a multi-line Stock Adjustment within a single transaction.
 */
export async function executeStockAdjustment(
  params: StockAdjustmentParams,
  client?: DbClient
) {
  const runner = async (tx: Prisma.TransactionClient) => {
    const { warehouseId, reason, lines, createdById } = params;

    const warehouse = await tx.warehouse.findUnique({
      where: { id: warehouseId },
      select: { id: true, name: true },
    });

    if (!warehouse) {
      throw new Error("WAREHOUSE_NOT_FOUND: Selected warehouse does not exist");
    }

    const adjustmentBatchId = `ADJ-${Date.now().toString(36).toUpperCase()}`;
    const results = [];

    for (const line of lines) {
      const isDecrease = line.type === "DECREASE";
      const referenceType = isDecrease ? "ADJUSTMENT_DECREASE" : "ADJUSTMENT_INCREASE";
      const lineNote = line.note ? `${reason} - ${line.note}` : reason;

      const res = await recordStockMovement(tx, {
        productId: line.productId,
        warehouseId,
        type: StockMovementType.ADJUSTMENT,
        quantity: line.quantity,
        referenceType,
        referenceId: adjustmentBatchId,
        note: lineNote,
        createdById,
      });

      results.push(res);
    }

    return { adjustmentBatchId, movementsCount: results.length };
  };

  if (client && "stockMovement" in client && !("$transaction" in client)) {
    return runner(client as Prisma.TransactionClient);
  }

  return db.$transaction(async (tx) => runner(tx));
}

/**
 * Executes an atomic Stock Transfer between two warehouses.
 * Generates both an OUT movement on source and an IN movement on destination.
 */
export async function executeStockTransfer(
  params: StockTransferParams,
  client?: DbClient
) {
  const runner = async (tx: Prisma.TransactionClient) => {
    const { fromWarehouseId, toWarehouseId, lines, note, createdById } = params;

    if (fromWarehouseId === toWarehouseId) {
      throw new Error("SAME_WAREHOUSE: Source and destination warehouses must be different");
    }

    const [fromWh, toWh] = await Promise.all([
      tx.warehouse.findUnique({ where: { id: fromWarehouseId }, select: { id: true, name: true } }),
      tx.warehouse.findUnique({ where: { id: toWarehouseId }, select: { id: true, name: true } }),
    ]);

    if (!fromWh || !toWh) {
      throw new Error("WAREHOUSE_NOT_FOUND: One or both warehouses not found");
    }

    const transferBatchId = `TRF-${Date.now().toString(36).toUpperCase()}`;

    for (const line of lines) {
      const outNote = note
        ? `نقل إلى ${toWh.name} - ${note}`
        : `نقل إلى مستودع ${toWh.name}`;

      const inNote = note
        ? `وارد من ${fromWh.name} - ${note}`
        : `وارد من مستودع ${fromWh.name}`;

      // 1. Source warehouse OUT
      await recordStockMovement(tx, {
        productId: line.productId,
        warehouseId: fromWarehouseId,
        type: StockMovementType.TRANSFER,
        quantity: line.quantity,
        referenceType: "TRANSFER_OUT",
        referenceId: transferBatchId,
        note: outNote,
        createdById,
      });

      // 2. Destination warehouse IN
      await recordStockMovement(tx, {
        productId: line.productId,
        warehouseId: toWarehouseId,
        type: StockMovementType.TRANSFER,
        quantity: line.quantity,
        referenceType: "TRANSFER_IN",
        referenceId: transferBatchId,
        note: inNote,
        createdById,
      });
    }

    return { transferBatchId, itemsCount: lines.length };
  };

  if (client && "stockMovement" in client && !("$transaction" in client)) {
    return runner(client as Prisma.TransactionClient);
  }

  return db.$transaction(async (tx) => runner(tx));
}

/**
 * Generates an automatic unique SKU using DocumentSequence.
 * Format: PRD-YYYY-XXXXX
 */
export async function generateProductSku(client: DbClient): Promise<string> {
  const currentYear = new Date().getFullYear();

  // Try using DocumentSequence
  const seq = await client.documentSequence.upsert({
    where: {
      type_year: {
        type: "PRD",
        year: currentYear,
      },
    },
    update: {
      nextNumber: { increment: 1 },
    },
    create: {
      type: "PRD",
      prefix: "PRD",
      year: currentYear,
      nextNumber: 2,
      padding: 5,
    },
  });

  const num = seq.nextNumber - 1;
  const padded = String(num).padStart(seq.padding, "0");
  const candidateSku = `PRD-${currentYear}-${padded}`;

  // Double check SKU uniqueness
  const existing = await client.product.findUnique({
    where: { sku: candidateSku },
    select: { id: true },
  });

  if (!existing) {
    return candidateSku;
  }

  // Fallback to random suffix if conflict
  return `PRD-${currentYear}-${padded}-${Math.floor(1000 + Math.random() * 9000)}`;
}
