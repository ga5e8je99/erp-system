"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import {
  salesReturnSchema,
  type SalesReturnInput,
} from "../schemas/sales";
import { createSalesReturnTransaction } from "../services/sales-service";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createSalesReturnAction(
  input: SalesReturnInput
): Promise<ActionResult<{ id: string; returnNumber: string }>> {
  try {
    const parsed = salesReturnSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission("sales.return.manage");
    const data = parsed.data;

    const result = await createSalesReturnTransaction({
      customerId: data.customerId,
      invoiceId: data.invoiceId || undefined,
      warehouseId: data.warehouseId,
      notes: data.notes,
      items: data.items,
      userId: currentUser.id,
    });

    await logAudit({
      action: "SALES_RETURN_CREATE",
      entity: "SalesReturn",
      entityId: result.salesReturn.id,
      userId: currentUser.id,
      after: {
        returnNumber: result.salesReturn.returnNumber,
        customerId: result.salesReturn.customerId,
        total: Number(result.salesReturn.total),
      },
    });

    revalidatePath("/sales/returns");
    if (data.invoiceId) {
      revalidatePath(`/sales/invoices/${data.invoiceId}`);
    }
    revalidatePath("/sales/invoices");
    revalidatePath(`/sales/customers/${data.customerId}`);
    revalidatePath("/sales/customers");
    revalidatePath("/inventory/stock");

    return {
      ok: true,
      data: {
        id: result.salesReturn.id,
        returnNumber: result.salesReturn.returnNumber,
      },
    };
  } catch (error) {
    console.error("createSalesReturnAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "INTERNAL_ERROR",
    };
  }
}
