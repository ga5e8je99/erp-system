import { AccountType, JournalStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  TrialBalanceReport,
  TrialBalanceRow,
  GeneralLedgerReport,
  GeneralLedgerLine,
  ProfitLossReport,
  IncomeStatementLine,
  BalanceSheetReport,
  AgingReport,
  AgingBucketRow,
  TaxSummaryReport,
} from "../types";

// ============================================================================
// 1. Trial Balance (ميزان المراجعة)
// ============================================================================

export async function getTrialBalanceReport(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<TrialBalanceReport> {
  const startDate = params?.startDate ? new Date(params.startDate) : new Date(new Date().getFullYear(), 0, 1);
  const endDate = params?.endDate ? new Date(params.endDate) : new Date();
  endDate.setHours(23, 59, 59, 999);

  const accounts = await db.account.findMany({
    where: { deletedAt: null },
    orderBy: { code: "asc" },
  });

  // Fetch all journal lines for posted entries
  const allLines = await db.journalLine.findMany({
    where: {
      entry: {
        status: JournalStatus.POSTED,
      },
    },
    include: {
      entry: {
        select: { date: true },
      },
    },
  });

  const rowMap = new Map<string, TrialBalanceRow>();

  accounts.forEach((acc) => {
    rowMap.set(acc.id, {
      accountId: acc.id,
      accountCode: acc.code,
      accountName: acc.name,
      accountType: acc.type,
      isPostable: acc.isPostable,
      beginningDebit: 0,
      beginningCredit: 0,
      periodDebit: 0,
      periodCredit: 0,
      endingDebit: 0,
      endingCredit: 0,
    });
  });

  // Calculate beginning and period amounts per account
  allLines.forEach((line) => {
    const row = rowMap.get(line.accountId);
    if (!row) return;

    const debit = Number(line.debit);
    const credit = Number(line.credit);
    const lineDate = line.entry.date;

    if (lineDate < startDate) {
      row.beginningDebit += debit;
      row.beginningCredit += credit;
    } else if (lineDate <= endDate) {
      row.periodDebit += debit;
      row.periodCredit += credit;
    }
  });

  // Compute ending balances per account
  let totalBeginningDebit = 0;
  let totalBeginningCredit = 0;
  let totalPeriodDebit = 0;
  let totalPeriodCredit = 0;
  let totalEndingDebit = 0;
  let totalEndingCredit = 0;

  const rows: TrialBalanceRow[] = [];

  accounts.forEach((acc) => {
    const row = rowMap.get(acc.id)!;

    const totalDebitAccum = row.beginningDebit + row.periodDebit;
    const totalCreditAccum = row.beginningCredit + row.periodCredit;

    if (row.accountType === AccountType.ASSET || row.accountType === AccountType.EXPENSE) {
      const net = totalDebitAccum - totalCreditAccum;
      if (net >= 0) {
        row.endingDebit = net;
        row.endingCredit = 0;
      } else {
        row.endingDebit = 0;
        row.endingCredit = Math.abs(net);
      }
    } else {
      const net = totalCreditAccum - totalDebitAccum;
      if (net >= 0) {
        row.endingCredit = net;
        row.endingDebit = 0;
      } else {
        row.endingCredit = 0;
        row.endingDebit = Math.abs(net);
      }
    }

    totalBeginningDebit += row.beginningDebit;
    totalBeginningCredit += row.beginningCredit;
    totalPeriodDebit += row.periodDebit;
    totalPeriodCredit += row.periodCredit;
    totalEndingDebit += row.endingDebit;
    totalEndingCredit += row.endingCredit;

    rows.push(row);
  });

  return {
    rows,
    totals: {
      beginningDebit: totalBeginningDebit,
      beginningCredit: totalBeginningCredit,
      periodDebit: totalPeriodDebit,
      periodCredit: totalPeriodCredit,
      endingDebit: totalEndingDebit,
      endingCredit: totalEndingCredit,
    },
  };
}

// ============================================================================
// 2. General Ledger (دفتر الأستاذ العام)
// ============================================================================

export async function getGeneralLedgerReport(params: {
  accountId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<GeneralLedgerReport> {
  const startDate = params.startDate ? new Date(params.startDate) : new Date(new Date().getFullYear(), 0, 1);
  const endDate = params.endDate ? new Date(params.endDate) : new Date();
  endDate.setHours(23, 59, 59, 999);

  let targetAccount = null;
  if (params.accountId) {
    targetAccount = await db.account.findUnique({
      where: { id: params.accountId },
      select: { id: true, code: true, name: true, type: true },
    });
  }

  // If no account selected, pick first postable account (e.g. Cash 1110)
  if (!targetAccount) {
    targetAccount = await db.account.findFirst({
      where: { isPostable: true, deletedAt: null },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, type: true },
    });
  }

  if (!targetAccount) {
    return {
      account: null,
      beginningBalance: 0,
      lines: [],
      endingBalance: 0,
      totalDebit: 0,
      totalCredit: 0,
    };
  }

  const isDebitNormal =
    targetAccount.type === AccountType.ASSET || targetAccount.type === AccountType.EXPENSE;

  // Calculate opening balance before startDate
  const priorLines = await db.journalLine.findMany({
    where: {
      accountId: targetAccount.id,
      entry: {
        status: JournalStatus.POSTED,
        date: { lt: startDate },
      },
    },
    select: { debit: true, credit: true },
  });

  let beginningBalance = 0;
  priorLines.forEach((l) => {
    const d = Number(l.debit);
    const c = Number(l.credit);
    beginningBalance += isDebitNormal ? d - c : c - d;
  });

  // Fetch lines in period
  const periodJournalLines = await db.journalLine.findMany({
    where: {
      accountId: targetAccount.id,
      entry: {
        status: JournalStatus.POSTED,
        date: { gte: startDate, lte: endDate },
      },
    },
    include: {
      entry: {
        select: {
          id: true,
          entryNumber: true,
          date: true,
          description: true,
          sourceType: true,
        },
      },
    },
    orderBy: { entry: { date: "asc" } },
  });

  let runningBalance = beginningBalance;
  let totalDebit = 0;
  let totalCredit = 0;

  const lines: GeneralLedgerLine[] = periodJournalLines.map((line) => {
    const debit = Number(line.debit);
    const credit = Number(line.credit);
    totalDebit += debit;
    totalCredit += credit;

    runningBalance += isDebitNormal ? debit - credit : credit - debit;

    return {
      id: line.id,
      date: line.entry.date.toISOString(),
      entryNumber: line.entry.entryNumber,
      entryId: line.entry.id,
      sourceType: line.entry.sourceType,
      description: line.description || line.entry.description,
      debit,
      credit,
      balanceAfter: runningBalance,
    };
  });

  return {
    account: targetAccount,
    beginningBalance,
    lines,
    endingBalance: runningBalance,
    totalDebit,
    totalCredit,
  };
}

// ============================================================================
// 3. Profit & Loss / Income Statement (قائمة الدخل)
// ============================================================================

export async function getProfitLossReport(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<ProfitLossReport> {
  const startDate = params?.startDate ? new Date(params.startDate) : new Date(new Date().getFullYear(), 0, 1);
  const endDate = params?.endDate ? new Date(params.endDate) : new Date();
  endDate.setHours(23, 59, 59, 999);

  // Get revenue and expense accounts
  const accounts = await db.account.findMany({
    where: {
      type: { in: [AccountType.REVENUE, AccountType.EXPENSE] },
      deletedAt: null,
    },
    include: {
      journalLines: {
        where: {
          entry: {
            status: JournalStatus.POSTED,
            date: { gte: startDate, lte: endDate },
          },
        },
        select: { debit: true, credit: true },
      },
    },
    orderBy: { code: "asc" },
  });

  const revenueItems: IncomeStatementLine[] = [];
  const cogsItems: IncomeStatementLine[] = [];
  const expenseItems: IncomeStatementLine[] = [];

  let totalRevenue = 0;
  let totalCogs = 0;
  let totalExpenses = 0;

  accounts.forEach((acc) => {
    let debitSum = 0;
    let creditSum = 0;
    acc.journalLines.forEach((l) => {
      debitSum += Number(l.debit);
      creditSum += Number(l.credit);
    });

    if (acc.type === AccountType.REVENUE) {
      // Net revenue = credit - debit
      const net = creditSum - debitSum;
      if (acc.isPostable || net !== 0) {
        revenueItems.push({ code: acc.code, name: acc.name, amount: net });
        totalRevenue += net;
      }
    } else if (acc.type === AccountType.EXPENSE) {
      // Net expense = debit - credit
      const net = debitSum - creditSum;
      // COGS is code 5000 series
      if (acc.code.startsWith("5")) {
        if (acc.isPostable || net !== 0) {
          cogsItems.push({ code: acc.code, name: acc.name, amount: net });
          totalCogs += net;
        }
      } else {
        // Operating & administrative expenses (6000 series or other)
        if (acc.isPostable || net !== 0) {
          expenseItems.push({ code: acc.code, name: acc.name, amount: net });
          totalExpenses += net;
        }
      }
    }
  });

  const grossProfit = totalRevenue - totalCogs;
  const netIncome = grossProfit - totalExpenses;

  return {
    revenue: {
      items: revenueItems.filter((i) => i.amount !== 0),
      total: totalRevenue,
    },
    cogs: {
      items: cogsItems.filter((i) => i.amount !== 0),
      total: totalCogs,
    },
    grossProfit,
    operatingExpenses: {
      items: expenseItems.filter((i) => i.amount !== 0),
      total: totalExpenses,
    },
    netIncome,
  };
}

// ============================================================================
// 4. Balance Sheet (الميزانية العمومية)
// ============================================================================

export async function getBalanceSheetReport(params?: {
  asOfDate?: string;
}): Promise<BalanceSheetReport> {
  const asOf = params?.asOfDate ? new Date(params.asOfDate) : new Date();
  asOf.setHours(23, 59, 59, 999);

  const accounts = await db.account.findMany({
    where: {
      type: { in: [AccountType.ASSET, AccountType.LIABILITY, AccountType.EQUITY] },
      deletedAt: null,
    },
    include: {
      journalLines: {
        where: {
          entry: {
            status: JournalStatus.POSTED,
            date: { lte: asOf },
          },
        },
        select: { debit: true, credit: true },
      },
    },
    orderBy: { code: "asc" },
  });

  // Calculate Net Income up to asOf date
  const plReport = await getProfitLossReport({
    startDate: "1970-01-01",
    endDate: asOf.toISOString(),
  });
  const currentPeriodIncome = plReport.netIncome;

  const currentAssetsList: IncomeStatementLine[] = [];
  const fixedAssetsList: IncomeStatementLine[] = [];
  let currentAssetsTotal = 0;
  let fixedAssetsTotal = 0;

  const currentLiabilitiesList: IncomeStatementLine[] = [];
  const longTermLiabilitiesList: IncomeStatementLine[] = [];
  let currentLiabilitiesTotal = 0;
  let longTermLiabilitiesTotal = 0;

  const equityList: IncomeStatementLine[] = [];
  let totalEquityBase = 0;

  accounts.forEach((acc) => {
    let debitSum = 0;
    let creditSum = 0;
    acc.journalLines.forEach((l) => {
      debitSum += Number(l.debit);
      creditSum += Number(l.credit);
    });

    if (acc.type === AccountType.ASSET) {
      const balance = debitSum - creditSum;
      if (acc.isPostable && balance !== 0) {
        if (acc.code.startsWith("11")) {
          currentAssetsList.push({ code: acc.code, name: acc.name, amount: balance });
          currentAssetsTotal += balance;
        } else {
          fixedAssetsList.push({ code: acc.code, name: acc.name, amount: balance });
          fixedAssetsTotal += balance;
        }
      }
    } else if (acc.type === AccountType.LIABILITY) {
      const balance = creditSum - debitSum;
      if (acc.isPostable && balance !== 0) {
        if (acc.code.startsWith("21")) {
          currentLiabilitiesList.push({ code: acc.code, name: acc.name, amount: balance });
          currentLiabilitiesTotal += balance;
        } else {
          longTermLiabilitiesList.push({ code: acc.code, name: acc.name, amount: balance });
          longTermLiabilitiesTotal += balance;
        }
      }
    } else if (acc.type === AccountType.EQUITY) {
      const balance = creditSum - debitSum;
      if (acc.isPostable && balance !== 0) {
        equityList.push({ code: acc.code, name: acc.name, amount: balance });
        totalEquityBase += balance;
      }
    }
  });

  const totalAssets = currentAssetsTotal + fixedAssetsTotal;
  const totalLiabilities = currentLiabilitiesTotal + longTermLiabilitiesTotal;
  const totalEquity = totalEquityBase + currentPeriodIncome;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.05;

  return {
    assets: {
      currentAssets: {
        title: "الأصول المتداولة",
        items: currentAssetsList,
        total: currentAssetsTotal,
      },
      fixedAssets: {
        title: "الأصول الثابتة وغير المتداولة",
        items: fixedAssetsList,
        total: fixedAssetsTotal,
      },
      totalAssets,
    },
    liabilities: {
      currentLiabilities: {
        title: "الالتزامات المتداولة",
        items: currentLiabilitiesList,
        total: currentLiabilitiesTotal,
      },
      longTermLiabilities: {
        title: "الالتزامات طويلة الأجل",
        items: longTermLiabilitiesList,
        total: longTermLiabilitiesTotal,
      },
      totalLiabilities,
    },
    equity: {
      retainedEarnings: totalEquityBase,
      currentPeriodIncome,
      items: equityList,
      totalEquity,
    },
    totalLiabilitiesAndEquity,
    isBalanced,
  };
}

// ============================================================================
// 5. Customer & Supplier Aging (أعمار الديون)
// ============================================================================

export async function getAgingReport(params: {
  type: "CUSTOMERS" | "SUPPLIERS";
  asOfDate?: string;
}): Promise<AgingReport> {
  const asOf = params.asOfDate ? new Date(params.asOfDate) : new Date();
  asOf.setHours(23, 59, 59, 999);

  const rows: AgingBucketRow[] = [];
  const totals = {
    bucket0to30: 0,
    bucket31to60: 0,
    bucket61to90: 0,
    bucket90Plus: 0,
    totalDue: 0,
  };

  if (params.type === "CUSTOMERS") {
    const customers = await db.customer.findMany({
      where: { deletedAt: null },
      include: {
        invoices: {
          where: {
            status: { in: ["ISSUED", "PARTIALLY_PAID"] },
            issueDate: { lte: asOf },
          },
        },
      },
      orderBy: { code: "asc" },
    });

    customers.forEach((c) => {
      let b0 = 0;
      let b31 = 0;
      let b61 = 0;
      let b90 = 0;

      c.invoices.forEach((inv) => {
        const remaining = Number(inv.total) - Number(inv.paidAmount);
        if (remaining <= 0) return;

        // Calculate age in days from invoice dueDate or issueDate
        const refDate = inv.dueDate || inv.issueDate;
        const diffMs = asOf.getTime() - new Date(refDate).getTime();
        const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        if (diffDays <= 30) b0 += remaining;
        else if (diffDays <= 60) b31 += remaining;
        else if (diffDays <= 90) b61 += remaining;
        else b90 += remaining;
      });

      const customerTotal = b0 + b31 + b61 + b90;
      if (customerTotal > 0 || Number(c.balance) !== 0) {
        rows.push({
          entityId: c.id,
          entityCode: c.code,
          entityName: c.name,
          phone: c.phone,
          bucket0to30: b0,
          bucket31to60: b31,
          bucket61to90: b61,
          bucket90Plus: b90,
          totalDue: customerTotal > 0 ? customerTotal : Number(c.balance),
        });

        totals.bucket0to30 += b0;
        totals.bucket31to60 += b31;
        totals.bucket61to90 += b61;
        totals.bucket90Plus += b90;
        totals.totalDue += customerTotal > 0 ? customerTotal : Number(c.balance);
      }
    });
  } else {
    const suppliers = await db.supplier.findMany({
      where: { deletedAt: null },
      include: {
        invoices: {
          where: {
            status: { in: ["ISSUED", "PARTIALLY_PAID"] },
            issueDate: { lte: asOf },
          },
        },
      },
      orderBy: { code: "asc" },
    });

    suppliers.forEach((s) => {
      let b0 = 0;
      let b31 = 0;
      let b61 = 0;
      let b90 = 0;

      s.invoices.forEach((inv) => {
        const remaining = Number(inv.total) - Number(inv.paidAmount);
        if (remaining <= 0) return;

        const refDate = inv.dueDate || inv.issueDate;
        const diffMs = asOf.getTime() - new Date(refDate).getTime();
        const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        if (diffDays <= 30) b0 += remaining;
        else if (diffDays <= 60) b31 += remaining;
        else if (diffDays <= 90) b61 += remaining;
        else b90 += remaining;
      });

      const supplierTotal = b0 + b31 + b61 + b90;
      if (supplierTotal > 0 || Number(s.balance) !== 0) {
        rows.push({
          entityId: s.id,
          entityCode: s.code,
          entityName: s.name,
          phone: s.phone,
          bucket0to30: b0,
          bucket31to60: b31,
          bucket61to90: b61,
          bucket90Plus: b90,
          totalDue: supplierTotal > 0 ? supplierTotal : Number(s.balance),
        });

        totals.bucket0to30 += b0;
        totals.bucket31to60 += b31;
        totals.bucket61to90 += b61;
        totals.bucket90Plus += b90;
        totals.totalDue += supplierTotal > 0 ? supplierTotal : Number(s.balance);
      }
    });
  }

  return {
    type: params.type,
    rows,
    totals,
  };
}

// ============================================================================
// 6. Tax Summary (ملخص ضريبة القيمة المضافة)
// ============================================================================

export async function getTaxSummaryReport(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<TaxSummaryReport> {
  const startDate = params?.startDate ? new Date(params.startDate) : new Date(new Date().getFullYear(), 0, 1);
  const endDate = params?.endDate ? new Date(params.endDate) : new Date();
  endDate.setHours(23, 59, 59, 999);

  const dateFilter = {
    gte: startDate,
    lte: endDate,
  };

  const [salesInvoices, salesReturns, purchaseInvoices, purchaseReturns] = await Promise.all([
    // Sales Invoices (Issued or paid)
    db.salesInvoice.findMany({
      where: {
        status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
        issueDate: dateFilter,
      },
      select: { subtotal: true, discount: true, tax: true },
    }),
    // Sales Returns
    db.salesReturn.findMany({
      where: {
        createdAt: dateFilter,
      },
      select: { subtotal: true, tax: true },
    }),
    // Purchase Invoices
    db.purchaseInvoice.findMany({
      where: {
        status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
        issueDate: dateFilter,
      },
      select: { subtotal: true, discount: true, tax: true },
    }),
    // Purchase Returns
    db.purchaseReturn.findMany({
      where: {
        createdAt: dateFilter,
      },
      select: { subtotal: true, tax: true },
    }),
  ]);

  let salesTaxableAmount = 0;
  let salesTaxAmount = 0;
  salesInvoices.forEach((inv) => {
    salesTaxableAmount += Math.max(0, Number(inv.subtotal) - Number(inv.discount));
    salesTaxAmount += Number(inv.tax);
  });

  let salesReturnsTaxableAmount = 0;
  let salesReturnsTaxAmount = 0;
  salesReturns.forEach((rtn) => {
    salesReturnsTaxableAmount += Number(rtn.subtotal);
    salesReturnsTaxAmount += Number(rtn.tax);
  });

  const netOutputTax = salesTaxAmount - salesReturnsTaxAmount;

  let purchasesTaxableAmount = 0;
  let purchasesTaxAmount = 0;
  purchaseInvoices.forEach((inv) => {
    purchasesTaxableAmount += Math.max(0, Number(inv.subtotal) - Number(inv.discount));
    purchasesTaxAmount += Number(inv.tax);
  });

  let purchasesReturnsTaxableAmount = 0;
  let purchasesReturnsTaxAmount = 0;
  purchaseReturns.forEach((rtn) => {
    purchasesReturnsTaxableAmount += Number(rtn.subtotal);
    purchasesReturnsTaxAmount += Number(rtn.tax);
  });

  const netInputTax = purchasesTaxAmount - purchasesReturnsTaxAmount;
  const netTaxPayable = netOutputTax - netInputTax;

  return {
    salesTaxableAmount,
    salesTaxAmount,
    salesReturnsTaxableAmount,
    salesReturnsTaxAmount,
    netOutputTax,

    purchasesTaxableAmount,
    purchasesTaxAmount,
    purchasesReturnsTaxableAmount,
    purchasesReturnsTaxAmount,
    netInputTax,

    netTaxPayable,
  };
}
