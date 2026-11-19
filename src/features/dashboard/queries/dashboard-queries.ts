import { db } from "@/lib/db";
import {
  DashboardDateRange,
  DashboardPeriodPreset,
  DashboardKpis,
  SalesVsPurchasesMonth,
  TopProductItem,
  CategorySalesItem,
  CashFlowMonthItem,
  RecentInvoiceItem,
  OverdueInvoiceItem,
  LowStockProductItem,
  PendingLeaveItem,
} from "../types";
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  format,
} from "date-fns";
import { arSA, enUS } from "date-fns/locale";

/**
 * Resolves date range based on preset or explicit ISO parameters
 */
export function resolveDashboardDateRange(
  preset?: string | null,
  fromParam?: string | null,
  toParam?: string | null
): DashboardDateRange {
  const now = new Date();
  const validPreset: DashboardPeriodPreset =
    preset === "today" ||
    preset === "month" ||
    preset === "last_month" ||
    preset === "quarter" ||
    preset === "year" ||
    preset === "custom"
      ? preset
      : "month";

  if (validPreset === "custom" && fromParam && toParam) {
    const fromMatch = fromParam.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const toMatch = toParam.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (fromMatch && toMatch) {
      const from = new Date(
        parseInt(fromMatch[1], 10),
        parseInt(fromMatch[2], 10) - 1,
        parseInt(fromMatch[3], 10),
        0, 0, 0, 0
      );
      const to = new Date(
        parseInt(toMatch[1], 10),
        parseInt(toMatch[2], 10) - 1,
        parseInt(toMatch[3], 10),
        23, 59, 59, 999
      );
      return { from, to, preset: "custom" };
    }
  }

  switch (validPreset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now), preset: "today" };
    case "last_month": {
      const prev = subMonths(now, 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev), preset: "last_month" };
    }
    case "quarter":
      return { from: startOfQuarter(now), to: endOfQuarter(now), preset: "quarter" };
    case "year":
      return { from: startOfYear(now), to: endOfYear(now), preset: "year" };
    case "month":
    default:
      return { from: startOfMonth(now), to: endOfMonth(now), preset: "month" };
  }
}

/**
 * Aggregates all top-level KPIs
 */
export async function getDashboardKpis(): Promise<DashboardKpis> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const curMonthStart = startOfMonth(now);
  const curMonthEnd = endOfMonth(now);

  const prevMonthStart = startOfMonth(subMonths(now, 1));
  const prevMonthEnd = endOfMonth(subMonths(now, 1));

  const [
    todayInvoices,
    monthInvoices,
    prevMonthInvoices,
    unpaidSalesInvoices,
    unpaidPurchaseInvoices,
    cashAccounts,
    allProducts,
  ] = await Promise.all([
    // Today's Sales
    db.salesInvoice.aggregate({
      _sum: { total: true },
      where: {
        status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
        issueDate: { gte: todayStart, lte: todayEnd },
      },
    }),

    // Month-to-date Sales
    db.salesInvoice.aggregate({
      _sum: { total: true },
      where: {
        status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
        issueDate: { gte: curMonthStart, lte: curMonthEnd },
      },
    }),

    // Previous Month Sales
    db.salesInvoice.aggregate({
      _sum: { total: true },
      where: {
        status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
        issueDate: { gte: prevMonthStart, lte: prevMonthEnd },
      },
    }),

    // Receivables Outstanding
    db.salesInvoice.findMany({
      where: {
        status: { in: ["ISSUED", "PARTIALLY_PAID"] },
      },
      select: {
        total: true,
        paidAmount: true,
      },
    }),

    // Payables Outstanding
    db.purchaseInvoice.findMany({
      where: {
        status: { in: ["ISSUED", "PARTIALLY_PAID"] },
      },
      select: {
        total: true,
        paidAmount: true,
      },
    }),

    // Cash and Bank accounts (1110, 1120 or by code prefix)
    db.account.findMany({
      where: {
        isPostable: true,
        OR: [
          { code: { startsWith: "1110" } },
          { code: { startsWith: "1120" } },
        ],
      },
      select: {
        balance: true,
      },
    }),

    // Low stock count
    db.product.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        trackStock: true,
      },
      select: {
        reorderLevel: true,
        stockLevels: {
          select: { quantity: true },
        },
      },
    }),
  ]);

  const todaySales = Number(todayInvoices._sum.total || 0);
  const monthToDateSales = Number(monthInvoices._sum.total || 0);
  const prevMonthSales = Number(prevMonthInvoices._sum.total || 0);

  let salesChangePercent = 0;
  if (prevMonthSales > 0) {
    salesChangePercent = Math.round(((monthToDateSales - prevMonthSales) / prevMonthSales) * 100);
  } else if (monthToDateSales > 0) {
    salesChangePercent = 100;
  }

  const receivablesOutstanding = unpaidSalesInvoices.reduce((sum, inv) => {
    const remaining = Number(inv.total) - Number(inv.paidAmount);
    return sum + (remaining > 0 ? remaining : 0);
  }, 0);

  const payablesOutstanding = unpaidPurchaseInvoices.reduce((sum, inv) => {
    const remaining = Number(inv.total) - Number(inv.paidAmount);
    return sum + (remaining > 0 ? remaining : 0);
  }, 0);

  const cashAndBankBalance = cashAccounts.reduce(
    (sum, acc) => sum + Number(acc.balance),
    0
  );

  const lowStockCount = allProducts.filter((p) => {
    const totalQty = p.stockLevels.reduce((s, sl) => s + Number(sl.quantity), 0);
    return totalQty <= p.reorderLevel;
  }).length;

  return {
    todaySales,
    monthToDateSales,
    prevMonthSales,
    salesChangePercent,
    receivablesOutstanding,
    payablesOutstanding,
    cashAndBankBalance,
    lowStockCount,
  };
}

/**
 * 12-Month Sales vs Purchases comparison
 */
export async function getSalesVsPurchasesLast12Months(
  locale: string = "ar"
): Promise<SalesVsPurchasesMonth[]> {
  const now = new Date();
  const twelveMonthsAgo = startOfMonth(subMonths(now, 11));
  const dateLocale = locale === "ar" ? arSA : enUS;

  const [salesInvoices, purchaseInvoices] = await Promise.all([
    db.salesInvoice.findMany({
      where: {
        status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
        issueDate: { gte: twelveMonthsAgo },
      },
      select: {
        issueDate: true,
        total: true,
      },
    }),
    db.purchaseInvoice.findMany({
      where: {
        status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
        issueDate: { gte: twelveMonthsAgo },
      },
      select: {
        issueDate: true,
        total: true,
      },
    }),
  ]);

  // Build the 12 month skeleton
  const monthsMap = new Map<string, { label: string; sales: number; purchases: number }>();
  for (let i = 11; i >= 0; i--) {
    const d = subMonths(now, i);
    const key = format(d, "yyyy-MM");
    const label = format(d, "MMM yyyy", { locale: dateLocale });
    monthsMap.set(key, { label, sales: 0, purchases: 0 });
  }

  for (const inv of salesInvoices) {
    const key = format(inv.issueDate, "yyyy-MM");
    const item = monthsMap.get(key);
    if (item) {
      item.sales += Number(inv.total);
    }
  }

  for (const inv of purchaseInvoices) {
    const key = format(inv.issueDate, "yyyy-MM");
    const item = monthsMap.get(key);
    if (item) {
      item.purchases += Number(inv.total);
    }
  }

  return Array.from(monthsMap.entries()).map(([monthKey, val]) => ({
    monthKey,
    monthLabel: val.label,
    sales: Math.round(val.sales),
    purchases: Math.round(val.purchases),
  }));
}

/**
 * Top 5 Products by Sales Revenue in date range
 */
export async function getTop5Products(
  dateRange: DashboardDateRange
): Promise<TopProductItem[]> {
  const items = await db.salesInvoiceItem.findMany({
    where: {
      invoice: {
        status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
        issueDate: { gte: dateRange.from, lte: dateRange.to },
      },
    },
    select: {
      productId: true,
      quantity: true,
      unitPrice: true,
      discount: true,
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
        },
      },
    },
  });

  const productAggMap = new Map<
    string,
    { sku: string; name: string; quantity: number; total: number }
  >();

  for (const it of items) {
    const pid = it.productId;
    const qty = Number(it.quantity);
    const sub = Number(it.unitPrice) * qty - Number(it.discount);

    const existing = productAggMap.get(pid);
    if (existing) {
      existing.quantity += qty;
      existing.total += sub;
    } else {
      productAggMap.set(pid, {
        sku: it.product.sku,
        name: it.product.name,
        quantity: qty,
        total: sub,
      });
    }
  }

  const sorted = Array.from(productAggMap.entries())
    .map(([id, val]) => ({
      id,
      sku: val.sku,
      name: val.name,
      quantitySold: val.quantity,
      totalRevenue: Math.round(val.total),
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);

  return sorted;
}

/**
 * Sales distribution by Product Category in date range
 */
export async function getSalesByCategory(
  dateRange: DashboardDateRange
): Promise<CategorySalesItem[]> {
  const items = await db.salesInvoiceItem.findMany({
    where: {
      invoice: {
        status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
        issueDate: { gte: dateRange.from, lte: dateRange.to },
      },
    },
    select: {
      quantity: true,
      unitPrice: true,
      discount: true,
      product: {
        select: {
          category: {
            select: { name: true },
          },
        },
      },
    },
  });

  const categoryMap = new Map<string, number>();
  let grandTotal = 0;

  for (const it of items) {
    const catName = it.product.category?.name || "غير مصنف";
    const lineTotal = Number(it.unitPrice) * Number(it.quantity) - Number(it.discount);
    grandTotal += lineTotal;
    categoryMap.set(catName, (categoryMap.get(catName) || 0) + lineTotal);
  }

  if (grandTotal === 0) {
    return [];
  }

  return Array.from(categoryMap.entries())
    .map(([name, total]) => ({
      name,
      totalRevenue: Math.round(total),
      percentage: Math.round((total / grandTotal) * 100),
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

/**
 * Cash Flow Trend over the last 6 months (Inflow vs Outflow vs Net)
 */
export async function getCashFlowTrend(
  locale: string = "ar"
): Promise<CashFlowMonthItem[]> {
  const now = new Date();
  const sixMonthsAgo = startOfMonth(subMonths(now, 5));
  const dateLocale = locale === "ar" ? arSA : enUS;

  const [customerPayments, supplierPayments, expenses] = await Promise.all([
    db.customerPayment.findMany({
      where: { date: { gte: sixMonthsAgo } },
      select: { date: true, amount: true },
    }),
    db.supplierPayment.findMany({
      where: { date: { gte: sixMonthsAgo } },
      select: { date: true, amount: true },
    }),
    db.expense.findMany({
      where: {
        deletedAt: null,
        date: { gte: sixMonthsAgo },
      },
      select: { date: true, amount: true },
    }),
  ]);

  const flowMap = new Map<string, { label: string; inflow: number; outflow: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    const key = format(d, "yyyy-MM");
    const label = format(d, "MMM yyyy", { locale: dateLocale });
    flowMap.set(key, { label, inflow: 0, outflow: 0 });
  }

  for (const p of customerPayments) {
    const key = format(p.date, "yyyy-MM");
    const item = flowMap.get(key);
    if (item) {
      item.inflow += Number(p.amount);
    }
  }

  for (const sp of supplierPayments) {
    const key = format(sp.date, "yyyy-MM");
    const item = flowMap.get(key);
    if (item) {
      item.outflow += Number(sp.amount);
    }
  }

  for (const ex of expenses) {
    const key = format(ex.date, "yyyy-MM");
    const item = flowMap.get(key);
    if (item) {
      item.outflow += Number(ex.amount);
    }
  }

  return Array.from(flowMap.entries()).map(([monthKey, val]) => ({
    monthKey,
    monthLabel: val.label,
    inflow: Math.round(val.inflow),
    outflow: Math.round(val.outflow),
    net: Math.round(val.inflow - val.outflow),
  }));
}

/**
 * Recent issued sales invoices
 */
export async function getRecentInvoices(limit = 6): Promise<RecentInvoiceItem[]> {
  const invoices = await db.salesInvoice.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      invoiceNumber: true,
      issueDate: true,
      total: true,
      status: true,
      customer: {
        select: { name: true },
      },
    },
  });

  return invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customerName: inv.customer.name,
    issueDate: inv.issueDate,
    total: Number(inv.total),
    status: inv.status,
  }));
}

/**
 * Overdue sales invoices
 */
export async function getOverdueInvoices(limit = 6): Promise<OverdueInvoiceItem[]> {
  const now = new Date();
  const invoices = await db.salesInvoice.findMany({
    where: {
      status: { in: ["ISSUED", "PARTIALLY_PAID"] },
      dueDate: { lt: now },
    },
    orderBy: { dueDate: "asc" },
    take: limit,
    select: {
      id: true,
      invoiceNumber: true,
      dueDate: true,
      total: true,
      paidAmount: true,
      customer: {
        select: { name: true },
      },
    },
  });

  return invoices
    .map((inv) => {
      const remaining = Number(inv.total) - Number(inv.paidAmount);
      const overdueMs = now.getTime() - new Date(inv.dueDate).getTime();
      const overdueDays = Math.max(1, Math.floor(overdueMs / (1000 * 60 * 60 * 24)));
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer.name,
        dueDate: inv.dueDate,
        overdueDays,
        remainingAmount: remaining,
        total: Number(inv.total),
      };
    })
    .filter((inv) => inv.remainingAmount > 0);
}

/**
 * Low stock products
 */
export async function getLowStockProducts(limit = 6): Promise<LowStockProductItem[]> {
  const products = await db.product.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      trackStock: true,
    },
    include: {
      category: { select: { name: true } },
      unit: { select: { symbol: true } },
      stockLevels: { select: { quantity: true } },
    },
  });

  const lowStock = products
    .map((p) => {
      const currentStock = p.stockLevels.reduce((s, sl) => s + Number(sl.quantity), 0);
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        categoryName: p.category?.name || "—",
        currentStock,
        reorderLevel: p.reorderLevel,
        unitSymbol: p.unit?.symbol || "",
      };
    })
    .filter((p) => p.currentStock <= p.reorderLevel)
    .sort((a, b) => a.currentStock - b.currentStock)
    .slice(0, limit);

  return lowStock;
}

/**
 * Pending leave requests for HR
 */
export async function getPendingLeaveRequests(limit = 6): Promise<PendingLeaveItem[]> {
  const leaves = await db.leaveRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      employee: {
        select: {
          fullName: true,
          department: { select: { name: true } },
        },
      },
      leaveType: { select: { name: true } },
    },
  });

  return leaves.map((l) => {
    const days =
      Math.ceil(
        (new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1;

    return {
      id: l.id,
      employeeName: l.employee.fullName,
      departmentName: l.employee.department?.name || "—",
      leaveTypeName: l.leaveType.name,
      startDate: l.startDate,
      endDate: l.endDate,
      days,
    };
  });
}
