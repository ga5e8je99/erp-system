import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { AccountType, JournalStatus } from "@prisma/client";
import {
  postJournalEntry,
  reverseJournalEntry,
  getPostingAccountMappings,
} from "../posting";
import {
  getChartOfAccountsTree,
  createAccount,
  deleteAccount,
  createFiscalPeriod,
  closeFiscalPeriod,
  recordExpense,
  deleteExpense,
} from "../accounting-service";
import {
  getTrialBalanceReport,
  getProfitLossReport,
  getBalanceSheetReport,
} from "../reports-service";

describe("Accounting Domain & Lifecycle Integration", () => {
  let mappings: Awaited<ReturnType<typeof getPostingAccountMappings>>;

  beforeAll(async () => {
    mappings = await getPostingAccountMappings(db);
  });

  describe("Chart of Accounts (COA)", () => {
    it("builds a hierarchical tree and aggregates child balances correctly", async () => {
      const tree = await getChartOfAccountsTree();
      expect(tree.length).toBeGreaterThan(0);

      // Verify roots are main 5 accounts: 1000, 2000, 3000, 4000, 5000, 6000
      const assetRoot = tree.find((n) => n.code === "1000");
      expect(assetRoot).toBeDefined();
      expect(assetRoot?.type).toBe(AccountType.ASSET);
      expect(assetRoot?.children.length).toBeGreaterThan(0);
    });

    it("creates an account and prevents deleting an account that has journal lines", async () => {
      const testCode = `TEST-${Date.now().toString().slice(-6)}`;
      const acc = await createAccount({
        code: testCode,
        name: "حساب تجارب الحذف",
        type: AccountType.EXPENSE,
        isPostable: true,
      });

      expect(acc.id).toBeDefined();

      // Post a journal entry to this account
      await postJournalEntry(db, {
        date: new Date(),
        description: "قيد تجريبي لمنع الحذف",
        lines: [
          { accountId: acc.id, debit: 100, credit: 0 },
          { accountId: mappings.cashAccountId, debit: 0, credit: 100 },
        ],
      });

      // Attempting to delete this account MUST throw an error
      await expect(deleteAccount(acc.id)).rejects.toThrow(
        /لا يمكن حذف هذا الحساب لأنه يحتوي على قيود وعمليات مسجلة/
      );
    });
  });

  describe("Fiscal Periods & Posting Controls", () => {
    it("blocks posting journal entries into a closed fiscal period", async () => {
      // Create a closed fiscal period in past year (2020)
      const period = await createFiscalPeriod({
        name: `سنة 2020 المالية المقفلة - ${Date.now()}`,
        startDate: "2020-01-01",
        endDate: "2020-12-31",
      });

      await closeFiscalPeriod(period.id);

      // Attempting to post on 2020-06-15 MUST throw
      await expect(
        postJournalEntry(db, {
          date: new Date("2020-06-15"),
          description: "قيد في فترة مغلقة",
          lines: [
            { accountId: mappings.cashAccountId, debit: 200, credit: 0 },
            { accountId: mappings.salesAccountId, debit: 0, credit: 200 },
          ],
        })
      ).rejects.toThrow(/لا يمكن تسجيل أو ترحيل قيود في فترة مالية مقفلة/);
    });
  });

  describe("Manual Journal Entries & Reversals", () => {
    it("rejects unbalanced journal entries", async () => {
      await expect(
        postJournalEntry(db, {
          date: new Date(),
          description: "قيد غير متزن تجريبي",
          lines: [
            { accountId: mappings.cashAccountId, debit: 500, credit: 0 },
            { accountId: mappings.salesAccountId, debit: 0, credit: 300 }, // diff 200!
          ],
        })
      ).rejects.toThrow(/القيد غير متزن/);
    });

    it("posts a balanced entry and reverses it with a mirrored entry", async () => {
      const entry = await postJournalEntry(db, {
        date: new Date(),
        description: "قيد يدوي تجريبي للعكس",
        lines: [
          { accountId: mappings.bankAccountId, debit: 750, credit: 0 },
          { accountId: mappings.salesAccountId, debit: 0, credit: 750 },
        ],
      });

      expect(entry.status).toBe(JournalStatus.POSTED);
      expect(entry.entryNumber).toMatch(/^JRN-\d{4}-\d{5}$/);

      // Reverse the entry
      const { reversingEntry } = await reverseJournalEntry(
        db,
        entry.id,
        "test-user",
        "خطأ في التسجيل"
      );

      expect(reversingEntry.status).toBe(JournalStatus.POSTED);
      expect(reversingEntry.description).toContain("عكس قيد");

      // Check original entry is updated to REVERSED
      const checkOriginal = await db.journalEntry.findUnique({ where: { id: entry.id } });
      expect(checkOriginal?.status).toBe(JournalStatus.REVERSED);

      // Verify reversing lines are mirrored
      const bankLine = reversingEntry.lines.find((l) => l.accountId === mappings.bankAccountId);
      const salesLine = reversingEntry.lines.find((l) => l.accountId === mappings.salesAccountId);

      expect(Number(bankLine?.credit)).toBe(750);
      expect(Number(bankLine?.debit)).toBe(0);
      expect(Number(salesLine?.debit)).toBe(750);
      expect(Number(salesLine?.credit)).toBe(0);
    });
  });

  describe("Expenses Ledger", () => {
    it("records an expense with automated journal posting and reverses it on deletion", async () => {
      // Find an expense account (e.g. 6400 General & Administrative)
      const expAccount = await db.account.findFirst({
        where: { code: "6400", deletedAt: null },
      });
      expect(expAccount).toBeDefined();

      const expense = await recordExpense(
        {
          category: "ضيافة واجتماعات",
          accountId: expAccount!.id,
          paidFromAccountId: mappings.cashAccountId,
          amount: 350,
          date: new Date().toISOString(),
          note: "شاي وقهوة للمكتب",
        },
        "user-test"
      );

      expect(expense.id).toBeDefined();
      expect(expense.expenseNumber).toMatch(/^EXP-\d{4}-\d{5}$/);

      // Verify journal entry exists
      const entry = await db.journalEntry.findFirst({
        where: { sourceType: "EXPENSE", sourceId: expense.id },
        include: { lines: true },
      });
      expect(entry).toBeDefined();
      expect(entry?.status).toBe(JournalStatus.POSTED);

      // Delete expense
      await deleteExpense(expense.id, "user-test");

      // Verify journal entry was reversed
      const reloadedEntry = await db.journalEntry.findUnique({ where: { id: entry!.id } });
      expect(reloadedEntry?.status).toBe(JournalStatus.REVERSED);
    });
  });

  describe("Proof of Books Balance after Sequence of Transactions", () => {
    it("proves the books balance after purchase -> pay -> return -> sell -> collect -> return -> void", async () => {
      // 1. Purchase on credit: 5000 subtotal, 700 VAT = 5700 total
      await postJournalEntry(db, {
        date: new Date(),
        description: "شراء بضاعة بالأجل دورة محاسبية",
        sourceType: "PURCHASE_INVOICE",
        lines: [
          { accountId: mappings.inventoryAccountId, debit: 5000, credit: 0 },
          { accountId: mappings.taxAccountId, debit: 700, credit: 0 },
          { accountId: mappings.apAccountId, debit: 0, credit: 5700 },
        ],
      });

      // 2. Pay supplier 2000 from Bank
      await postJournalEntry(db, {
        date: new Date(),
        description: "سداد دفعة للمورد من البنك",
        sourceType: "SUPPLIER_PAYMENT",
        lines: [
          { accountId: mappings.apAccountId, debit: 2000, credit: 0 },
          { accountId: mappings.bankAccountId, debit: 0, credit: 2000 },
        ],
      });

      // 3. Return defective goods to supplier: 1000 subtotal, 140 tax = 1140 total
      await postJournalEntry(db, {
        date: new Date(),
        description: "مرتجع بضاعة معيبة للمورد",
        sourceType: "PURCHASE_RETURN",
        lines: [
          { accountId: mappings.apAccountId, debit: 1140, credit: 0 },
          { accountId: mappings.inventoryAccountId, debit: 0, credit: 1000 },
          { accountId: mappings.taxAccountId, debit: 0, credit: 140 },
        ],
      });

      // 4. Sell goods to customer: 8000 subtotal, 1120 VAT = 9120 total, COGS 4000
      await postJournalEntry(db, {
        date: new Date(),
        description: "بيع بضاعة لعميل دورة محاسبية",
        sourceType: "SALES_INVOICE",
        lines: [
          { accountId: mappings.arAccountId, debit: 9120, credit: 0 },
          { accountId: mappings.salesAccountId, debit: 0, credit: 8000 },
          { accountId: mappings.taxAccountId, debit: 0, credit: 1120 },
          { accountId: mappings.cogsAccountId, debit: 4000, credit: 0 },
          { accountId: mappings.inventoryAccountId, debit: 0, credit: 4000 },
        ],
      });

      // 5. Customer pays 5000 into Bank
      await postJournalEntry(db, {
        date: new Date(),
        description: "تحصيل دفعة من العميل في البنك",
        sourceType: "CUSTOMER_PAYMENT",
        lines: [
          { accountId: mappings.bankAccountId, debit: 5000, credit: 0 },
          { accountId: mappings.arAccountId, debit: 0, credit: 5000 },
        ],
      });

      // 6. Customer returns goods: 1000 subtotal, 140 tax = 1140 total, COGS 500
      await postJournalEntry(db, {
        date: new Date(),
        description: "مرتجع مبيعات من العميل",
        sourceType: "SALES_RETURN",
        lines: [
          { accountId: mappings.salesAccountId, debit: 1000, credit: 0 },
          { accountId: mappings.taxAccountId, debit: 140, credit: 0 },
          { accountId: mappings.arAccountId, debit: 0, credit: 1140 },
          { accountId: mappings.inventoryAccountId, debit: 500, credit: 0 },
          { accountId: mappings.cogsAccountId, debit: 0, credit: 500 },
        ],
      });

      // 7. Void a sales invoice (create and void)
      const voidableEntry = await postJournalEntry(db, {
        date: new Date(),
        description: "فاتورة مبيعات سيتم إلغاؤها",
        lines: [
          { accountId: mappings.arAccountId, debit: 2280, credit: 0 },
          { accountId: mappings.salesAccountId, debit: 0, credit: 2000 },
          { accountId: mappings.taxAccountId, debit: 0, credit: 280 },
        ],
      });

      await reverseJournalEntry(db, voidableEntry.id, "test-user", "إلغاء فاتورة خاطئة");

      // 8. VERIFY TRIAL BALANCE: Total Debits MUST EQUAL Total Credits
      const trialBalance = await getTrialBalanceReport();
      expect(trialBalance.totals.periodDebit).toBeGreaterThan(0);
      expect(Math.abs(trialBalance.totals.periodDebit - trialBalance.totals.periodCredit)).toBeLessThan(0.01);
      expect(Math.abs(trialBalance.totals.endingDebit - trialBalance.totals.endingCredit)).toBeLessThan(0.01);

      // 9. VERIFY BALANCE SHEET: Assets == Liabilities + Equity
      const balanceSheet = await getBalanceSheetReport();
      expect(balanceSheet.isBalanced).toBe(true);

      // 10. VERIFY PROFIT & LOSS REPORT
      const pl = await getProfitLossReport();
      expect(pl.revenue.total).toBeGreaterThan(0);
      expect(pl.grossProfit).toBe(pl.revenue.total - pl.cogs.total);
      expect(pl.netIncome).toBe(pl.grossProfit - pl.operatingExpenses.total);
    });
  });
});
