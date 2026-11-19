"use server";

import { logger } from "@/lib/logger";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { toSafeError } from "@/lib/safe-error";
import {
  stockAdjustmentSchema,
  stockTransferSchema,
  type StockAdjustmentInput,
  type StockTransferInput,
} from "../schemas/inventory";
import {
  executeStockAdjustment,
  executeStockTransfer,
} from "../services/stock-movement";
import { ActionResult } from "./products";

export async function createStockAdjustmentAction(
  input: StockAdjustmentInput
): Promise<ActionResult<{ adjustmentBatchId: string; movementsCount: number }>> {
  try {
    // 1. Zod validation
    const parsed = stockAdjustmentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    // 2 & 3. Auth & RBAC Check (Requires approval/adjust permission)
    const { user: currentUser } = await requirePermission("inventory.stock.adjust");

    // 4. Execute atomic adjustment
    const result = await executeStockAdjustment({
      ...parsed.data,
      createdById: currentUser.id,
    });

    // 5. Audit Log
    await logAudit({
      action: "STOCK_ADJUSTMENT",
      entity: "StockAdjustment",
      entityId: result.adjustmentBatchId,
      userId: currentUser.id,
      after: {
        warehouseId: parsed.data.warehouseId,
        reason: parsed.data.reason,
        linesCount: parsed.data.lines.length,
      },
    });

    revalidatePath("/inventory/stock");
    revalidatePath("/inventory/movements");
    revalidatePath("/inventory/adjustments");

    return { ok: true, data: result };
  } catch (error) {
    logger.error({ err: error }, "createStockAdjustmentAction error:");
    return {
      ok: false,
      error: toSafeError(error, "ADJUSTMENT_FAILED"),
    };
  }
}

export async function createStockTransferAction(
  input: StockTransferInput
): Promise<ActionResult<{ transferBatchId: string; itemsCount: number }>> {
  try {
    // 1. Zod validation
    const parsed = stockTransferSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    // 2 & 3. Auth & RBAC Check
    const { user: currentUser } = await requirePermission("inventory.stock.transfer");

    // 4. Execute atomic transfer
    const result = await executeStockTransfer({
      ...parsed.data,
      createdById: currentUser.id,
    });

    // 5. Audit Log
    await logAudit({
      action: "STOCK_TRANSFER",
      entity: "StockTransfer",
      entityId: result.transferBatchId,
      userId: currentUser.id,
      after: {
        fromWarehouseId: parsed.data.fromWarehouseId,
        toWarehouseId: parsed.data.toWarehouseId,
        itemsCount: result.itemsCount,
      },
    });

    revalidatePath("/inventory/stock");
    revalidatePath("/inventory/movements");
    revalidatePath("/inventory/transfers");

    return { ok: true, data: result };
  } catch (error) {
    logger.error({ err: error }, "createStockTransferAction error:");
    return {
      ok: false,
      error: toSafeError(error, "TRANSFER_FAILED"),
    };
  }
}
