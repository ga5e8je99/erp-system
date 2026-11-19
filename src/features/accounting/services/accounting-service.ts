import { Prisma, AccountType, JournalStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getNextDocumentNumber } from "@/lib/sequence";
import {
  AccountTreeNode,
  JournalEntryListItem,
  JournalEntryDetail,
  FiscalPeriodItem,
  ExpenseListItem,
  AccountMappingConfig,
} from "../types";
import {
  AccountFormValues,
  JournalEntryFormValues,
  FiscalPeriodFormValues,
  ExpenseFormValues,
  AccountMappingFormValues,
} from "../schemas";
import {
  postJournalEntry,
  reverseJournalEntry,
  assertFiscalPeriodOpen,
} from "./posting";

// ============================================================================
// 1. Chart of Accounts (COA) Services
// ============================================================================

export async function getChartOfAccountsTree(): Promise<AccountTreeNode[]> {
  const accounts = await db.account.findMany({
    where: { deletedAt: null },
    orderBy: { code: "asc" },
  });

  const accountMap = new Map<string, AccountTreeNode>();

  // Initialize nodes
  accounts.forEach((acc) => {
    accountMap.set(acc.id, {
      id: acc.id,
      code: acc.code,
      name: acc.name,
      type: acc.type,
      parentId: acc.parentId,
      isPostable: acc.isPostable,
      balance: Number(acc.balance),
      totalBalance: Number(acc.balance),
      level: 0,
      children: [],
    });
  });

  const rootNodes: AccountTreeNode[] = [];

  // Build hierarchy
  accounts.forEach((acc) => {
    const node = accountMap.get(acc.id)!;
    if (acc.parentId && accountMap.has(acc.parentId)) {
      const parent = accountMap.get(acc.parentId)!;
      parent.children.push(node);
    } else {
      rootNodes.push(node);
    }
  });

  // Recursively compute levels and rollup balances for parent accounts
  function aggregateNode(node: AccountTreeNode, currentLevel: number): number {
    node.level = currentLevel;
    let sum = node.balance;
    for (const child of node.children) {
      sum += aggregateNode(child, currentLevel + 1);
    }
    node.totalBalance = sum;
    return sum;
  }

  rootNodes.forEach((root) => aggregateNode(root, 0));

  return rootNodes;
}

export async function getFlatAccountsList(options?: {
  postableOnly?: boolean;
  type?: AccountType;
}) {
  const where: Prisma.AccountWhereInput = {
    deletedAt: null,
  };

  if (options?.postableOnly) {
    where.isPostable = true;
  }

  if (options?.type) {
    where.type = options.type;
  }

  const accounts = await db.account.findMany({
    where,
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      isPostable: true,
      balance: true,
    },
  });

  return accounts.map((acc) => ({
    id: acc.id,
    code: acc.code,
    name: acc.name,
    type: acc.type,
    isPostable: acc.isPostable,
    balance: Number(acc.balance),
    label: `${acc.code} - ${acc.name}`,
  }));
}

export async function createAccount(data: AccountFormValues) {
  // Check code uniqueness
  const existing = await db.account.findFirst({
    where: { code: data.code, deletedAt: null },
  });

  if (existing) {
    throw new Error(`رمز الحساب (${data.code}) مستخدم بالفعل لحساب آخر`);
  }

  if (data.parentId) {
    const parent = await db.account.findUnique({
      where: { id: data.parentId },
    });
    if (!parent) {
      throw new Error("الحساب الرئيسي المحدد غير موجود");
    }
  }

  return await db.account.create({
    data: {
      code: data.code,
      name: data.name,
      type: data.type,
      parentId: data.parentId || null,
      isPostable: data.isPostable,
    },
  });
}

export async function updateAccount(id: string, data: AccountFormValues) {
  const account = await db.account.findUnique({
    where: { id },
    include: {
      children: { where: { deletedAt: null } },
      journalLines: { take: 1 },
    },
  });

  if (!account) {
    throw new Error("الحساب المراد تعديله غير موجود");
  }

  // If code changed, check uniqueness
  if (data.code !== account.code) {
    const codeConflict = await db.account.findFirst({
      where: { code: data.code, id: { not: id }, deletedAt: null },
    });
    if (codeConflict) {
      throw new Error(`رمز الحساب (${data.code}) مستخدم بالفعل لحساب آخر`);
    }
  }

  // Prevent changing type if journal entries exist or children exist
  if (data.type !== account.type) {
    if (account.journalLines.length > 0) {
      throw new Error("لا يمكن تغيير نوع الحساب بعد تسجيل قيود محاسبية عليه");
    }
    if (account.children.length > 0) {
      throw new Error("لا يمكن تغيير نوع حساب رئيسي يحتوي على حسابات فرعية");
    }
  }

  return await db.account.update({
    where: { id },
    data: {
      code: data.code,
      name: data.name,
      type: data.type,
      parentId: data.parentId || null,
      isPostable: data.isPostable,
    },
  });
}

export async function deleteAccount(id: string) {
  const account = await db.account.findUnique({
    where: { id },
    include: {
      children: { where: { deletedAt: null } },
      journalLines: { take: 1 },
    },
  });

  if (!account) {
    throw new Error("الحساب المراد حذفه غير موجود");
  }

  // Rule: prevent deleting accounts that have journal lines!
  if (account.journalLines.length > 0) {
    throw new Error(
      "لا يمكن حذف هذا الحساب لأنه يحتوي على قيود وعمليات مسجلة. يمكنك إلغاء تفعيله أو جعله غير قابل للترحيل بدلاً من ذلك."
    );
  }

  // Rule: prevent deleting accounts with children
  if (account.children.length > 0) {
    throw new Error("لا يمكن حذف حساب رئيسي يحتوي على حسابات فرعية نشطة");
  }

  // Soft delete
  return await db.account.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

// ============================================================================
// 2. Journal Entries Services
// ============================================================================

export async function listJournalEntries(params?: {
  search?: string;
  status?: JournalStatus;
  sourceType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  items: JournalEntryListItem[];
  total: number;
  totalPages: number;
}> {
  const page = Math.max(1, params?.page || 1);
  const pageSize = Math.min(100, Math.max(1, params?.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.JournalEntryWhereInput = {};

  if (params?.status) {
    where.status = params.status;
  }

  if (params?.sourceType) {
    where.sourceType = params.sourceType;
  }

  if (params?.search) {
    const q = params.search.trim();
    where.OR = [
      { entryNumber: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  if (params?.startDate || params?.endDate) {
    where.date = {};
    if (params.startDate) {
      where.date.gte = new Date(params.startDate);
    }
    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      where.date.lte = end;
    }
  }

  const [total, entries] = await Promise.all([
    db.journalEntry.count({ where }),
    db.journalEntry.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { date: "desc" },
      include: {
        lines: {
          select: { debit: true, credit: true },
        },
      },
    }),
  ]);

  const items: JournalEntryListItem[] = entries.map((entry) => {
    let totalDebit = 0;
    let totalCredit = 0;
    entry.lines.forEach((line) => {
      totalDebit += Number(line.debit);
      totalCredit += Number(line.credit);
    });

    return {
      id: entry.id,
      entryNumber: entry.entryNumber,
      date: entry.date.toISOString(),
      description: entry.description,
      status: entry.status,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      totalDebit,
      totalCredit,
      linesCount: entry.lines.length,
      postedAt: entry.postedAt?.toISOString() || null,
      createdAt: entry.createdAt.toISOString(),
    };
  });

  return {
    items,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getJournalEntryById(id: string): Promise<JournalEntryDetail | null> {
  const entry = await db.journalEntry.findUnique({
    where: { id },
    include: {
      lines: {
        include: {
          account: {
            select: { id: true, code: true, name: true },
          },
        },
        orderBy: [{ debit: "desc" }, { credit: "desc" }],
      },
    },
  });

  if (!entry) return null;

  // Resolve source document link
  let sourceLink: { href: string; label: string } | null = null;
  if (entry.sourceType && entry.sourceId) {
    switch (entry.sourceType) {
      case "SALES_INVOICE":
        sourceLink = {
          href: `/sales/invoices`,
          label: "فاتورة مبيعات",
        };
        break;
      case "CUSTOMER_PAYMENT":
        sourceLink = {
          href: `/sales/payments`,
          label: "سند قبض عميل",
        };
        break;
      case "SALES_RETURN":
        sourceLink = {
          href: `/sales/returns`,
          label: "مرتجع مبيعات",
        };
        break;
      case "PURCHASE_INVOICE":
        sourceLink = {
          href: `/purchasing/invoices`,
          label: "فاتورة مشتريات",
        };
        break;
      case "SUPPLIER_PAYMENT":
        sourceLink = {
          href: `/purchasing/payments`,
          label: "سند صرف مورد",
        };
        break;
      case "PURCHASE_RETURN":
        sourceLink = {
          href: `/purchasing/returns`,
          label: "مرتجع مشتريات",
        };
        break;
      case "EXPENSE":
        sourceLink = {
          href: `/accounting/expenses`,
          label: "سند مصروف",
        };
        break;
    }
  }

  return {
    id: entry.id,
    entryNumber: entry.entryNumber,
    date: entry.date.toISOString(),
    description: entry.description,
    status: entry.status,
    sourceType: entry.sourceType,
    sourceId: entry.sourceId,
    postedAt: entry.postedAt?.toISOString() || null,
    postedById: entry.postedById,
    createdAt: entry.createdAt.toISOString(),
    lines: entry.lines.map((l) => ({
      id: l.id,
      accountId: l.accountId,
      accountCode: l.account.code,
      accountName: l.account.name,
      debit: Number(l.debit),
      credit: Number(l.credit),
      description: l.description,
    })),
    sourceLink,
  };
}

export async function createManualJournalEntry(
  data: JournalEntryFormValues,
  userId: string
) {
  const date = new Date(data.date);

  return await db.$transaction(async (tx) => {
    return await postJournalEntry(tx, {
      date,
      description: data.description,
      sourceType: "MANUAL",
      postedById: userId,
      status: data.status,
      lines: data.lines.map((l) => ({
        accountId: l.accountId,
        debit: l.debit,
        credit: l.credit,
        description: l.description,
      })),
    });
  });
}

export async function postDraftJournalEntry(id: string, userId: string) {
  return await db.$transaction(async (tx) => {
    const entry = await tx.journalEntry.findUnique({
      where: { id },
      include: {
        lines: { include: { account: true } },
      },
    });

    if (!entry) {
      throw new Error("القيد المحاسبي غير موجود");
    }

    if (entry.status !== JournalStatus.DRAFT) {
      throw new Error("يمكن فقط ترحيل القيود ذات الحالة مسودة (DRAFT)");
    }

    await assertFiscalPeriodOpen(tx, entry.date);

    // Validate balance
    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);

    for (const line of entry.lines) {
      totalDebit = totalDebit.plus(line.debit);
      totalCredit = totalCredit.plus(line.credit);
    }

    if (!totalDebit.equals(totalCredit)) {
      throw new Error("لا يمكن ترحيل قيد محاسبي غير متزن");
    }

    // Update entry status
    const updatedEntry = await tx.journalEntry.update({
      where: { id },
      data: {
        status: JournalStatus.POSTED,
        postedAt: new Date(),
        postedById: userId,
      },
    });

    // Update account balances
    for (const line of entry.lines) {
      const account = line.account;
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

    return updatedEntry;
  });
}

export async function reverseJournalEntryAction(
  id: string,
  userId: string,
  reason?: string
) {
  return await db.$transaction(async (tx) => {
    return await reverseJournalEntry(tx, id, userId, reason);
  });
}

// ============================================================================
// 3. Fiscal Periods Services
// ============================================================================

export async function listFiscalPeriods(): Promise<FiscalPeriodItem[]> {
  const periods = await db.fiscalPeriod.findMany({
    orderBy: { startDate: "desc" },
  });

  return periods.map((p) => ({
    id: p.id,
    name: p.name,
    startDate: p.startDate.toISOString(),
    endDate: p.endDate.toISOString(),
    isClosed: p.isClosed,
    createdAt: p.createdAt.toISOString(),
  }));
}

export async function createFiscalPeriod(data: FiscalPeriodFormValues) {
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  if (startDate > endDate) {
    throw new Error("تاريخ نهاية الفترة يجب أن يكون بعد تاريخ البداية");
  }

  return await db.fiscalPeriod.create({
    data: {
      name: data.name,
      startDate,
      endDate,
      isClosed: false,
    },
  });
}

export async function closeFiscalPeriod(id: string) {
  const period = await db.fiscalPeriod.findUnique({ where: { id } });
  if (!period) throw new Error("الفترة المالية غير موجودة");

  return await db.fiscalPeriod.update({
    where: { id },
    data: { isClosed: true },
  });
}

export async function reopenFiscalPeriod(id: string) {
  const period = await db.fiscalPeriod.findUnique({ where: { id } });
  if (!period) throw new Error("الفترة المالية غير موجودة");

  return await db.fiscalPeriod.update({
    where: { id },
    data: { isClosed: false },
  });
}

// ============================================================================
// 4. Expenses Services
// ============================================================================

export async function recordExpense(data: ExpenseFormValues, userId: string) {
  const date = new Date(data.date);

  return await db.$transaction(async (tx) => {
    // 1. Verify accounts
    const [expenseAcc, paymentAcc, settings] = await Promise.all([
      tx.account.findUnique({ where: { id: data.accountId } }),
      tx.account.findUnique({ where: { id: data.paidFromAccountId } }),
      tx.companySettings.findFirst({ select: { expensePrefix: true } }),
    ]);

    if (!expenseAcc || expenseAcc.deletedAt || !expenseAcc.isPostable) {
      throw new Error("حساب المصروف غير صالح أو غير نشط");
    }

    if (!paymentAcc || paymentAcc.deletedAt || !paymentAcc.isPostable) {
      throw new Error("حساب السداد (الخزينة/البنك) غير صالح أو غير نشط");
    }

    if (expenseAcc.type !== AccountType.EXPENSE) {
      throw new Error("يجب اختيار حساب من نوع المصروفات لبند المصروف");
    }

    // 2. Generate expense number atomically
    const prefix = settings?.expensePrefix || "EXP";
    const expenseNumber = await getNextDocumentNumber({
      type: "EXPENSE",
      prefix,
      tx: tx as Prisma.TransactionClient,
    });

    // 3. Create Expense Record
    const expense = await tx.expense.create({
      data: {
        expenseNumber,
        category: data.category,
        accountId: data.accountId,
        paidFromAccountId: data.paidFromAccountId,
        amount: new Prisma.Decimal(data.amount),
        date,
        note: data.note || null,
      },
    });

    // 4. Post balanced Journal Entry: Dr Expense Account, Cr Payment Account
    await postJournalEntry(tx, {
      date,
      description: `سند صرف مصروف ${expenseNumber} - ${data.category}${
        data.note ? ` - ${data.note}` : ""
      }`,
      sourceType: "EXPENSE",
      sourceId: expense.id,
      postedById: userId,
      lines: [
        {
          accountId: data.accountId,
          debit: data.amount,
          credit: 0,
          description: `مصروف: ${data.category}`,
        },
        {
          accountId: data.paidFromAccountId,
          debit: 0,
          credit: data.amount,
          description: `سداد مصروف ${expenseNumber}`,
        },
      ],
    });

    return expense;
  });
}

export async function listExpenses(params?: {
  search?: string;
  category?: string;
  accountId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  items: ExpenseListItem[];
  total: number;
  totalPages: number;
}> {
  const page = Math.max(1, params?.page || 1);
  const pageSize = Math.min(100, Math.max(1, params?.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.ExpenseWhereInput = {
    deletedAt: null,
  };

  if (params?.category) {
    where.category = { contains: params.category, mode: "insensitive" };
  }

  if (params?.accountId) {
    where.accountId = params.accountId;
  }

  if (params?.search) {
    const q = params.search.trim();
    where.OR = [
      { expenseNumber: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
      { note: { contains: q, mode: "insensitive" } },
    ];
  }

  if (params?.startDate || params?.endDate) {
    where.date = {};
    if (params.startDate) where.date.gte = new Date(params.startDate);
    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      where.date.lte = end;
    }
  }

  const [total, expenses] = await Promise.all([
    db.expense.count({ where }),
    db.expense.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { date: "desc" },
      include: {
        expenseAccount: { select: { id: true, code: true, name: true } },
        paymentAccount: { select: { id: true, code: true, name: true } },
      },
    }),
  ]);

  const items: ExpenseListItem[] = expenses.map((e) => ({
    id: e.id,
    expenseNumber: e.expenseNumber,
    category: e.category,
    accountId: e.accountId,
    accountName: `${e.expenseAccount.code} - ${e.expenseAccount.name}`,
    paidFromAccountId: e.paidFromAccountId,
    paidFromAccountName: `${e.paymentAccount.code} - ${e.paymentAccount.name}`,
    amount: Number(e.amount),
    date: e.date.toISOString(),
    note: e.note,
    createdAt: e.createdAt.toISOString(),
  }));

  return {
    items,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function deleteExpense(id: string, userId: string) {
  return await db.$transaction(async (tx) => {
    const expense = await tx.expense.findUnique({
      where: { id },
    });

    if (!expense) throw new Error("المصروف المراد حذفه غير موجود");

    // Find and reverse the associated journal entry
    const entry = await tx.journalEntry.findFirst({
      where: {
        sourceType: "EXPENSE",
        sourceId: expense.id,
        status: JournalStatus.POSTED,
      },
    });

    if (entry) {
      await reverseJournalEntry(tx, entry.id, userId, `إلغاء سند المصروف ${expense.expenseNumber}`);
    }

    // Soft delete expense
    return await tx.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  });
}

// ============================================================================
// 5. Settings / Account Mapping Services
// ============================================================================

export async function getCompanyAccountMappings(): Promise<AccountMappingConfig> {
  const settings = await db.companySettings.findFirst({
    select: {
      arAccountId: true,
      apAccountId: true,
      salesAccountId: true,
      cogsAccountId: true,
      inventoryAccountId: true,
      taxAccountId: true,
      cashAccountId: true,
      bankAccountId: true,
    },
  });

  return {
    arAccountId: settings?.arAccountId || null,
    apAccountId: settings?.apAccountId || null,
    salesAccountId: settings?.salesAccountId || null,
    cogsAccountId: settings?.cogsAccountId || null,
    inventoryAccountId: settings?.inventoryAccountId || null,
    taxAccountId: settings?.taxAccountId || null,
    cashAccountId: settings?.cashAccountId || null,
    bankAccountId: settings?.bankAccountId || null,
  };
}

export async function updateCompanyAccountMappings(data: AccountMappingFormValues) {
  const settings = await db.companySettings.findFirst();
  if (!settings) {
    throw new Error("إعدادات الشركة غير مهيأة بعد");
  }

  return await db.companySettings.update({
    where: { id: settings.id },
    data: {
      arAccountId: data.arAccountId || null,
      apAccountId: data.apAccountId || null,
      salesAccountId: data.salesAccountId || null,
      cogsAccountId: data.cogsAccountId || null,
      inventoryAccountId: data.inventoryAccountId || null,
      taxAccountId: data.taxAccountId || null,
      cashAccountId: data.cashAccountId || null,
      bankAccountId: data.bankAccountId || null,
    },
  });
}
