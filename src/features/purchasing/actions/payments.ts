"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import {
  supplierPaymentSchema,
  type SupplierPaymentFormValues,
} from "../schemas/purchasing";
import { recordSupplierPaymentTransaction } from "../services/purchasing-service";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function recordSupplierPaymentAction(
  input: SupplierPaymentFormValues
): Promise<ActionResult<{ id: string; paymentNumber: string }>> {
  try {
    const parsed = supplierPaymentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission(
      "purchasing.payment.create"
    );
    const data = parsed.data;

    const payment = await recordSupplierPaymentTransaction({
      supplierId: data.supplierId,
      invoiceId: data.invoiceId || null,
      amount: data.amount,
      method: data.method,
      date: data.date ? new Date(data.date) : new Date(),
      reference: data.reference?.trim() || null,
      notes: data.notes?.trim() || null,
      userId: currentUser.id,
    });

    await logAudit({
      userId: currentUser.id,
      action: "CREATE",
      entity: "SupplierPayment",
      entityId: payment.id,
      after: {
        paymentNumber: payment.paymentNumber,
        amount: Number(payment.amount),
        supplierId: payment.supplierId,
        invoiceId: payment.invoiceId,
      },
    });

    revalidatePath("/[locale]/purchasing/payments", "page");
    revalidatePath("/[locale]/purchasing/invoices", "page");
    revalidatePath(`/[locale]/purchasing/suppliers/${data.supplierId}`, "page");
    if (data.invoiceId) {
      revalidatePath(`/[locale]/purchasing/invoices/${data.invoiceId}`, "page");
    }

    return {
      ok: true,
      data: { id: payment.id, paymentNumber: payment.paymentNumber },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return { ok: false, error: message };
  }
}
