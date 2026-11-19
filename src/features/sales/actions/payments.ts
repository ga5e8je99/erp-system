"use server";

import { logger } from "@/lib/logger";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { toSafeError } from "@/lib/safe-error";
import {
  customerPaymentSchema,
  type CustomerPaymentInput,
} from "../schemas/sales";
import { recordCustomerPaymentTransaction } from "../services/sales-service";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function recordCustomerPaymentAction(
  input: CustomerPaymentInput
): Promise<ActionResult<{ id: string; paymentNumber: string }>> {
  try {
    const parsed = customerPaymentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { user: currentUser } = await requirePermission("sales.payment.create");
    const data = parsed.data;

    const result = await recordCustomerPaymentTransaction({
      customerId: data.customerId,
      invoiceId: data.invoiceId || undefined,
      amount: data.amount,
      method: data.method,
      date: new Date(data.date),
      reference: data.reference,
      notes: data.notes,
      userId: currentUser.id,
    });

    await logAudit({
      action: "CUSTOMER_PAYMENT_RECORD",
      entity: "CustomerPayment",
      entityId: result.payment.id,
      userId: currentUser.id,
      after: {
        paymentNumber: result.payment.paymentNumber,
        customerId: result.payment.customerId,
        invoiceId: result.payment.invoiceId,
        amount: Number(result.payment.amount),
        method: result.payment.method,
      },
    });

    revalidatePath("/sales/payments");
    if (data.invoiceId) {
      revalidatePath(`/sales/invoices/${data.invoiceId}`);
    }
    revalidatePath("/sales/invoices");
    revalidatePath(`/sales/customers/${data.customerId}`);
    revalidatePath("/sales/customers");

    return {
      ok: true,
      data: {
        id: result.payment.id,
        paymentNumber: result.payment.paymentNumber,
      },
    };
  } catch (error) {
    logger.error({ err: error }, "recordCustomerPaymentAction error:");
    return {
      ok: false,
      error: toSafeError(error, "INTERNAL_ERROR"),
    };
  }
}
