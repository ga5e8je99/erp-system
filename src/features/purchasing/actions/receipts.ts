"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import {
  goodsReceiptSchema,
  type GoodsReceiptFormValues,
} from "../schemas/purchasing";
import { receiveGoodsTransaction } from "../services/purchasing-service";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createGoodsReceiptAction(
  input: GoodsReceiptFormValues
): Promise<ActionResult<{ id: string; receiptNumber: string }>> {
  try {
    const parsed = goodsReceiptSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission(
      "purchasing.receipt.create"
    );
    const data = parsed.data;

    const { receipt } = await receiveGoodsTransaction({
      poId: data.poId || null,
      supplierId: data.supplierId,
      warehouseId: data.warehouseId,
      receiveDate: data.receiveDate ? new Date(data.receiveDate) : new Date(),
      notes: data.notes?.trim() || null,
      items: data.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitCost: i.unitCost,
      })),
      createdById: currentUser.id,
    });

    await logAudit({
      userId: currentUser.id,
      action: "CREATE",
      entity: "GoodsReceipt",
      entityId: receipt.id,
      after: {
        receiptNumber: receipt.receiptNumber,
        poId: receipt.poId,
        warehouseId: receipt.warehouseId,
      },
    });

    revalidatePath("/[locale]/purchasing/receipts", "page");
    revalidatePath("/[locale]/purchasing/orders", "page");
    if (data.poId) {
      revalidatePath(`/[locale]/purchasing/orders/${data.poId}`, "page");
    }
    revalidatePath("/[locale]/inventory/stock", "page");
    revalidatePath("/[locale]/inventory/movements", "page");

    return {
      ok: true,
      data: { id: receipt.id, receiptNumber: receipt.receiptNumber },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return { ok: false, error: message };
  }
}
