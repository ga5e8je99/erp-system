"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { journalEntrySchema } from "../schemas";
import {
  createManualJournalEntry,
  postDraftJournalEntry,
  reverseJournalEntryAction as reverseEntryService,
} from "../services/accounting-service";

export async function createJournalEntryAction(input: unknown) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("accounting.journal.create");

    const parsed = journalEntrySchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "بيانات القيد غير متزنة أو غير صالحة",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const entry = await createManualJournalEntry(parsed.data, session.user.id);

    await logAudit({
      action: "JOURNAL_ENTRY_CREATE",
      entity: "JournalEntry",
      entityId: entry.id,
      after: {
        entryNumber: entry.entryNumber,
        status: entry.status,
        description: entry.description,
      },
    });

    revalidatePath("/accounting/journal");
    revalidatePath("/accounting/accounts");
    return { ok: true, data: entry };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل تسجيل القيد المحاسبي";
    return { ok: false, error: message };
  }
}

export async function postDraftJournalEntryAction(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("accounting.journal.post");

    const entry = await postDraftJournalEntry(id, session.user.id);

    await logAudit({
      action: "JOURNAL_ENTRY_POST",
      entity: "JournalEntry",
      entityId: entry.id,
      after: {
        entryNumber: entry.entryNumber,
        status: entry.status,
      },
    });

    revalidatePath(`/accounting/journal/${id}`);
    revalidatePath("/accounting/journal");
    revalidatePath("/accounting/accounts");
    return { ok: true, data: entry };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل ترحيل القيد المحاسبي";
    return { ok: false, error: message };
  }
}

export async function reverseJournalEntryAction(id: string, reason?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("accounting.journal.post");

    const result = await reverseEntryService(id, session.user.id, reason);

    await logAudit({
      action: "JOURNAL_ENTRY_REVERSE",
      entity: "JournalEntry",
      entityId: id,
      after: {
        reversedEntryNumber: result.originalEntry.entryNumber,
        newReversingEntryNumber: result.reversingEntry.entryNumber,
        reason,
      },
    });

    revalidatePath(`/accounting/journal/${id}`);
    revalidatePath("/accounting/journal");
    revalidatePath("/accounting/accounts");
    return { ok: true, data: result };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل عكس القيد المحاسبي";
    return { ok: false, error: message };
  }
}
