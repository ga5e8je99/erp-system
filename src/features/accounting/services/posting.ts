import { Prisma, AccountType, JournalStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getNextDocumentNumber } from "@/lib/sequence";

export type DbClient = Prisma.TransactionClient | typeof db;

export interface PostingLineInput {
  accountId: string;
  debit: Prisma.Decimal | number;
  credit: Prisma.Decimal | number;
  description?: string | null;
}

export interface PostJournalParams {
  date: Date;
  description: string;
  sourceType?: string | null;
  sourceId?: string | null;
  postedById?: string | null;
  status?: JournalStatus; // defaults to POSTED
  lines: PostingLineInput[];
}

export interface AccountMappings {
  arAccountId: string;
  apAccountId: string;
  salesAccountId: string;
  cogsAccountId: string;
  inventoryAccountId: string;
  taxAccountId: string;
  cashAccountId: string;
  bankAccountId: string;
  salaryExpenseAccountId: string;
  salaryPayableAccountId: string;
}

/**
 * Validates that the transaction date does NOT fall inside a closed fiscal period.
 * Throws a descriptive Error if a closed fiscal period is encountered.
 */
export async function assertFiscalPeriodOpen(tx: DbClient, date: Date): Promise<void> {
  const closedPeriod = await tx.fiscalPeriod.findFirst({
    where: {
      isClosed: true,
      startDate: { lte: date },
      endDate: { gte: date },
    },
    select: { name: true, startDate: true, endDate: true },
  });

  if (closedPeriod) {
    throw new Error(
      `لا يمكن تسجيل أو ترحيل قيود في فترة مالية مقفلة (${closedPeriod.name})`
    );
  }
}

/**
 * Resolves account IDs from CompanySettings mapping, falling back to standard COA codes.
 */
export async function getPostingAccountMappings(tx: DbClient): Promise<AccountMappings> {
  const settings = await tx.companySettings.findFirst({
    select: {
      arAccountId: true,
      apAccountId: true,
      salesAccountId: true,
      cogsAccountId: true,
      inventoryAccountId: true,
      taxAccountId: true,
      cashAccountId: true,
      bankAccountId: true,
      salaryExpenseAccountId: true,
      salaryPayableAccountId: true,
    },
  });

  // Helper to resolve an account ID either from settings or by code
  const resolveAccount = async (settingId: string | null | undefined, fallbackCode: string) => {
    if (settingId) {
      const acc = await tx.account.findUnique({
        where: { id: settingId },
        select: { id: true, isPostable: true, deletedAt: true },
      });
      if (acc && acc.isPostable && !acc.deletedAt) {
        return acc.id;
      }
    }

    const byCode = await tx.account.findFirst({
      where: { code: fallbackCode, deletedAt: null },
      select: { id: true },
    });

    if (!byCode) {
      throw new Error(`حساب الدليل المحاسبي المطلوب (${fallbackCode}) غير موجود بالنظام`);
    }

    return byCode.id;
  };

  const [
    arAccountId,
    apAccountId,
    salesAccountId,
    cogsAccountId,
    inventoryAccountId,
    taxAccountId,
    cashAccountId,
    bankAccountId,
    salaryExpenseAccountId,
    salaryPayableAccountId,
  ] = await Promise.all([
    resolveAccount(settings?.arAccountId, "1130"),
    resolveAccount(settings?.apAccountId, "2110"),
    resolveAccount(settings?.salesAccountId, "4100"),
    resolveAccount(settings?.cogsAccountId, "5100"),
    resolveAccount(settings?.inventoryAccountId, "1140"),
    resolveAccount(settings?.taxAccountId, "2120"),
    resolveAccount(settings?.cashAccountId, "1110"),
    resolveAccount(settings?.bankAccountId, "1120"),
    resolveAccount(settings?.salaryExpenseAccountId, "6100"),
    resolveAccount(settings?.salaryPayableAccountId, "2130"),
  ]);

  return {
    arAccountId,
    apAccountId,
    salesAccountId,
    cogsAccountId,
    inventoryAccountId,
    taxAccountId,
    cashAccountId,
    bankAccountId,
    salaryExpenseAccountId,
    salaryPayableAccountId,
  };
}

/**
 * Centralized posting service for double-entry journal entries.
 * Enforces:
 * 1. Fiscal period verification (blocks posting into closed periods)
 * 2. Mathematical debit = credit balance validation
 * 3. Atomic JRN sequence generation
 * 4. Account balance synchronization according to normal account balance rules
 */
export async function postJournalEntry(tx: DbClient, params: PostJournalParams) {
  const {
    date,
    description,
    sourceType = null,
    sourceId = null,
    postedById = null,
    status = JournalStatus.POSTED,
    lines,
  } = params;

  if (lines.length < 2) {
    throw new Error("يجب أن يحتوي القيد المحاسبي على طرفين على الأقل");
  }

  // 1. Check Fiscal Period
  if (status === JournalStatus.POSTED) {
    await assertFiscalPeriodOpen(tx, date);
  }

  // 2. Validate debit/credit balance
  let totalDebit = new Prisma.Decimal(0);
  let totalCredit = new Prisma.Decimal(0);

  const normalizedLines = lines.map((line) => {
    const debit = new Prisma.Decimal(line.debit || 0);
    const credit = new Prisma.Decimal(line.credit || 0);

    if (debit.isNegative() || credit.isNegative()) {
      throw new Error("لا يمكن إدخال مبالغ سالبة في أسطر القيد المحاسبي");
    }

    if (debit.greaterThan(0) && credit.greaterThan(0)) {
      throw new Error("لا يمكن وضع مدين ودائن معاً في نفس سطر القيد");
    }

    totalDebit = totalDebit.plus(debit);
    totalCredit = totalCredit.plus(credit);

    return {
      accountId: line.accountId,
      debit,
      credit,
      description: line.description || null,
    };
  });

  const diff = totalDebit.minus(totalCredit).abs();
  if (diff.greaterThan(new Prisma.Decimal(0.01))) {
    throw new Error(
      `القيد غير متزن! إجمالي المدين (${totalDebit.toFixed(2)}) لا يساوي إجمالي الدائن (${totalCredit.toFixed(2)})`
    );
  }

  if (totalDebit.equals(0)) {
    throw new Error("قيمة القيد المحاسبي يجب أن تكون أكبر من صفر");
  }

  // 3. Document Sequence Number
  const settings = await tx.companySettings.findFirst({ select: { journalPrefix: true } });
  const journalNumber = await getNextDocumentNumber({
    type: "JRN",
    prefix: settings?.journalPrefix || "JRN",
    tx: tx as Prisma.TransactionClient,
  });

  // 4. Create Journal Entry
  const entry = await tx.journalEntry.create({
    data: {
      entryNumber: journalNumber,
      date,
      description,
      status,
      sourceType,
      sourceId,
      postedAt: status === JournalStatus.POSTED ? new Date() : null,
      postedById,
      lines: {
        create: normalizedLines.map((line) => ({
          accountId: line.accountId,
          debit: line.debit,
          credit: line.credit,
          description: line.description,
        })),
      },
    },
    include: {
      lines: {
        include: {
          account: true,
        },
      },
    },
  });

  // 5. Update Account Balances if POSTED
  if (status === JournalStatus.POSTED) {
    for (const line of entry.lines) {
      const account = line.account;
      // Normal debit balance accounts: ASSET, EXPENSE
      // Normal credit balance accounts: LIABILITY, EQUITY, REVENUE
      let balanceDelta = new Prisma.Decimal(0);
      if (account.type === AccountType.ASSET || account.type === AccountType.EXPENSE) {
        balanceDelta = line.debit.minus(line.credit);
      } else {
        balanceDelta = line.credit.minus(line.debit);
      }

      await tx.account.update({
        where: { id: account.id },
        data: {
          balance: account.balance.plus(balanceDelta),
        },
      });
    }
  }

  return entry;
}

/**
 * Reverses a posted journal entry by marking it REVERSED and creating a new mirrored entry.
 */
export async function reverseJournalEntry(
  tx: DbClient,
  entryId: string,
  userId: string,
  reason?: string
) {
  const original = await tx.journalEntry.findUnique({
    where: { id: entryId },
    include: {
      lines: {
        include: { account: true },
      },
    },
  });

  if (!original) {
    throw new Error("القيد المحاسبي المراد عكسه غير موجود");
  }

  if (original.status !== JournalStatus.POSTED) {
    throw new Error("يمكن فقط عكس القيود المرحلة (POSTED)");
  }

  const today = new Date();
  await assertFiscalPeriodOpen(tx, today);

  // Mark original as REVERSED
  await tx.journalEntry.update({
    where: { id: original.id },
    data: { status: JournalStatus.REVERSED },
  });

  // Reverse account balances from original entry
  for (const line of original.lines) {
    const account = line.account;
    let balanceDelta = new Prisma.Decimal(0);
    if (account.type === AccountType.ASSET || account.type === AccountType.EXPENSE) {
      balanceDelta = line.credit.minus(line.debit); // reverse effect
    } else {
      balanceDelta = line.debit.minus(line.credit);
    }

    await tx.account.update({
      where: { id: account.id },
      data: {
        balance: account.balance.plus(balanceDelta),
      },
    });
  }

  // Create mirrored reversing entry
  const reversingDescription = `عكس قيد: ${original.entryNumber} - ${reason || original.description}`;
  const reversingLines: PostingLineInput[] = original.lines.map((l) => ({
    accountId: l.accountId,
    debit: l.credit,
    credit: l.debit,
    description: `عكس سطر: ${l.description || original.entryNumber}`,
  }));

  const reversingEntry = await postJournalEntry(tx, {
    date: today,
    description: reversingDescription,
    sourceType: original.sourceType,
    sourceId: original.sourceId,
    postedById: userId,
    lines: reversingLines,
  });

  return { originalEntry: original, reversingEntry };
}
