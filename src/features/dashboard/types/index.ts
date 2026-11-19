export type DashboardPeriodPreset =
  | "today"
  | "month"
  | "last_month"
  | "quarter"
  | "year"
  | "custom";

export interface DashboardDateRange {
  from: Date;
  to: Date;
  preset: DashboardPeriodPreset;
}

export interface DashboardKpis {
  todaySales: number;
  monthToDateSales: number;
  prevMonthSales: number;
  salesChangePercent: number;
  receivablesOutstanding: number;
  payablesOutstanding: number;
  cashAndBankBalance: number;
  lowStockCount: number;
}

export interface SalesVsPurchasesMonth {
  monthKey: string;
  monthLabel: string;
  sales: number;
  purchases: number;
}

export interface TopProductItem {
  id: string;
  sku: string;
  name: string;
  quantitySold: number;
  totalRevenue: number;
}

export interface CategorySalesItem {
  name: string;
  totalRevenue: number;
  percentage: number;
}

export interface CashFlowMonthItem {
  monthKey: string;
  monthLabel: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface RecentInvoiceItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  issueDate: Date;
  total: number;
  status: string;
}

export interface OverdueInvoiceItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  dueDate: Date;
  overdueDays: number;
  remainingAmount: number;
  total: number;
}

export interface LowStockProductItem {
  id: string;
  sku: string;
  name: string;
  categoryName: string;
  currentStock: number;
  reorderLevel: number;
  unitSymbol: string;
}

export interface PendingLeaveItem {
  id: string;
  employeeName: string;
  departmentName: string;
  leaveTypeName: string;
  startDate: Date;
  endDate: Date;
  days: number;
}

export interface DashboardData {
  kpis: DashboardKpis;
  salesVsPurchases: SalesVsPurchasesMonth[];
  topProducts: TopProductItem[];
  salesByCategory: CategorySalesItem[];
  cashFlowTrend: CashFlowMonthItem[];
  recentInvoices: RecentInvoiceItem[];
  overdueInvoices: OverdueInvoiceItem[];
  lowStockProducts: LowStockProductItem[];
  pendingLeaves: PendingLeaveItem[];
}
