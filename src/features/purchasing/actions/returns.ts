"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import {
  purchaseReturnSchema,
  type PurchaseReturnFormValues,
} from "../schemas/purchasing";
import { createPurchaseReturnTransaction } from "../services/purchasing-service";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createPurchaseReturnAction(
  input: PurchaseReturnFormValues
): Promise<ActionResult<{ id: string; returnNumber: string }>> {
  try {
    const parsed = purchaseReturnSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission(
      "purchasing.return.manage"
    );
    const data = parsed.data;

    const purchaseReturn = await createPurchaseReturnTransaction({
      supplierId: data.supplierId,
      invoiceId: data.invoiceId || null,
      warehouseId: data.warehouseId,
      notes: data.notes?.trim() || null,
      items: data.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        taxAmount: i.taxAmount,
        total: i.total,
      })),
      userId: currentUser.id,
    });

    await logAudit({
      userId: currentUser.id,
      action: "CREATE",
      entity: "PurchaseReturn",
      entityId: purchaseReturn.id,
      after: {
        returnNumber: purchaseReturn.returnNumber,
        total: Number(purchaseReturn.total),
        supplierId: purchaseReturn.supplierId,
      },
    });

    revalidatePath("/[locale]/purchasing/returns", "page");
    revalidatePath("/[locale]/purchasing/invoices", "page");
    revalidatePath(`/[locale]/purchasing/suppliers/${data.supplierId}`, "page");
    revalidatePath("/[locale]/inventory/stock", "page");
    revalidatePath("/[locale]/inventory/movements", "page");

    return {
      ok: true,
      data: {
        id: purchaseReturn.id,
        returnNumber: purchaseReturn.returnNumber,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return { ok: false, error: message };
  }
}
