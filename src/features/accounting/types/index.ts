import { AccountType, JournalStatus } from "@prisma/client";

export type { AccountType, JournalStatus };

export interface AccountTreeNode {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId: string | null;
  isPostable: boolean;
  balance: number;
  totalBalance: number; // includes children balances
  level: number;
  children: AccountTreeNode[];
}

export interface JournalLineItem {
  id?: string;
  accountId: string;
  accountCode?: string;
  accountName?: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntryListItem {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  status: JournalStatus;
  sourceType: string | null;
  sourceId: string | null;
  totalDebit: number;
  totalCredit: number;
  linesCount: number;
  postedAt: string | null;
  createdAt: string;
}

export interface JournalEntryDetail {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  status: JournalStatus;
  sourceType: string | null;
  sourceId: string | null;
  postedAt: string | null;
  postedById: string | null;
  postedByName?: string | null;
  createdAt: string;
  lines: {
    id: string;
    accountId: string;
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    description: string | null;
  }[];
  sourceLink?: {
    href: string;
    label: string;
  } | null;
}

export interface FiscalPeriodItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  createdAt: string;
}

export interface ExpenseListItem {
  id: string;
  expenseNumber: string;
  category: string;
  accountId: string;
  accountName: string;
  paidFromAccountId: string;
  paidFromAccountName: string;
  amount: number;
  date: string;
  note: string | null;
  createdAt: string;
}

export interface AccountMappingConfig {
  arAccountId: string | null;
  apAccountId: string | null;
  salesAccountId: string | null;
  cogsAccountId: string | null;
  inventoryAccountId: string | null;
  taxAccountId: string | null;
  cashAccountId: string | null;
  bankAccountId: string | null;
}

// ----------------------------------------------------------------------------
// Financial Reports Types
// ----------------------------------------------------------------------------

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  isPostable: boolean;
  beginningDebit: number;
  beginningCredit: number;
  periodDebit: number;
  periodCredit: number;
  endingDebit: number;
  endingCredit: number;
}

export interface TrialBalanceReport {
  rows: TrialBalanceRow[];
  totals: {
    beginningDebit: number;
    beginningCredit: number;
    periodDebit: number;
    periodCredit: number;
    endingDebit: number;
    endingCredit: number;
  };
}

export interface GeneralLedgerLine {
  id: string;
  date: string;
  entryNumber: string;
  entryId: string;
  sourceType: string | null;
  description: string;
  debit: number;
  credit: number;
  balanceAfter: number;
}

export interface GeneralLedgerReport {
  account: {
    id: string;
    code: string;
    name: string;
    type: AccountType;
  } | null;
  beginningBalance: number;
  lines: GeneralLedgerLine[];
  endingBalance: number;
  totalDebit: number;
  totalCredit: number;
}

export interface IncomeStatementLine {
  code: string;
  name: string;
  amount: number;
}

export interface ProfitLossReport {
  revenue: {
    items: IncomeStatementLine[];
    total: number;
  };
  cogs: {
    items: IncomeStatementLine[];
    total: number;
  };
  grossProfit: number;
  operatingExpenses: {
    items: IncomeStatementLine[];
    total: number;
  };
  netIncome: number;
}

export interface BalanceSheetCategory {
  title: string;
  items: IncomeStatementLine[];
  total: number;
}

export interface BalanceSheetReport {
  assets: {
    currentAssets: BalanceSheetCategory;
    fixedAssets: BalanceSheetCategory;
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: BalanceSheetCategory;
    longTermLiabilities: BalanceSheetCategory;
    totalLiabilities: number;
  };
  equity: {
    retainedEarnings: number;
    currentPeriodIncome: number;
    items: IncomeStatementLine[];
    totalEquity: number;
  };
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

export interface AgingBucketRow {
  entityId: string;
  entityCode: string;
  entityName: string;
  phone?: string | null;
  bucket0to30: number;
  bucket31to60: number;
  bucket61to90: number;
  bucket90Plus: number;
  totalDue: number;
}

export interface AgingReport {
  type: "CUSTOMERS" | "SUPPLIERS";
  rows: AgingBucketRow[];
  totals: {
    bucket0to30: number;
    bucket31to60: number;
    bucket61to90: number;
    bucket90Plus: number;
    totalDue: number;
  };
}

export interface TaxSummaryReport {
  salesTaxableAmount: number;
  salesTaxAmount: number;
  salesReturnsTaxableAmount: number;
  salesReturnsTaxAmount: number;
  netOutputTax: number;

  purchasesTaxableAmount: number;
  purchasesTaxAmount: number;
  purchasesReturnsTaxableAmount: number;
  purchasesReturnsTaxAmount: number;
  netInputTax: number;

  netTaxPayable: number; // Net Output - Net Input
}
