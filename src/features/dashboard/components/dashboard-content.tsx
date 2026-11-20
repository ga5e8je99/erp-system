import React from "react";
import {
  resolveDashboardDateRange,
  getDashboardKpis,
  getSalesVsPurchasesLast12Months,
  getTop5Products,
  getSalesByCategory,
  getCashFlowTrend,
  getRecentInvoices,
  getOverdueInvoices,
  getLowStockProducts,
  getPendingLeaveRequests,
} from "../queries/dashboard-queries";
import { KpiCardsGrid } from "./kpi-cards-grid";
import { SalesPurchasesChart } from "./sales-purchases-chart";
import { TopProductsChart } from "./top-products-chart";
import { SalesCategoryChart } from "./sales-category-chart";
import { CashFlowChart } from "./cash-flow-chart";
import { FinancialHealthWidget } from "./financial-health-widget";
import { RecentInvoicesWidget } from "./recent-invoices-widget";
import { OverdueInvoicesWidget } from "./overdue-invoices-widget";
import { LowStockWidget } from "./low-stock-widget";
import { PendingLeaveWidget } from "./pending-leave-widget";

interface DashboardContentProps {
  searchParams: {
    period?: string;
    from?: string;
    to?: string;
  };
  permissions: string[];
  locale: string;
}

export async function DashboardContent({
  searchParams,
  permissions,
  locale,
}: DashboardContentProps) {
  const dateRange = resolveDashboardDateRange(
    searchParams.period,
    searchParams.from,
    searchParams.to
  );

  const hasPerm = (perm: string) => {
    if (
      permissions.includes("admin") ||
      permissions.includes("Admin") ||
      permissions.includes("*")
    ) {
      return true;
    }
    return permissions.includes(perm);
  };

  const canSales = hasPerm("sales.invoice.view");
  const canPurchasing = hasPerm("purchasing.invoice.view");
  const canAccounting = hasPerm("accounting.account.view");
  const canInventory = hasPerm("inventory.product.view");
  const canHr = hasPerm("hr.leave.manage") || hasPerm("hr.employee.view");

  const [
    kpis,
    salesVsPurchases,
    topProducts,
    salesByCategory,
    cashFlowTrend,
    recentInvoices,
    overdueInvoices,
    lowStockProducts,
    pendingLeaves,
  ] = await Promise.all([
    getDashboardKpis(),
    canSales || canPurchasing ? getSalesVsPurchasesLast12Months(locale) : Promise.resolve([]),
    canSales ? getTop5Products(dateRange) : Promise.resolve([]),
    canSales ? getSalesByCategory(dateRange) : Promise.resolve([]),
    canAccounting ? getCashFlowTrend(locale) : Promise.resolve([]),
    canSales ? getRecentInvoices(6) : Promise.resolve([]),
    canSales ? getOverdueInvoices(6) : Promise.resolve([]),
    canInventory ? getLowStockProducts(6) : Promise.resolve([]),
    canHr ? getPendingLeaveRequests(6) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      {/* 1. Top KPI Cards */}
      <KpiCardsGrid kpis={kpis} permissions={permissions} locale={locale} />

      {/* 2. Charts Section */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {(canSales || canPurchasing) && (
          <SalesPurchasesChart data={salesVsPurchases} />
        )}

        {canSales && <TopProductsChart data={topProducts} />}

        {canSales && <SalesCategoryChart data={salesByCategory} />}

        {canAccounting && <CashFlowChart data={cashFlowTrend} />}

        {canAccounting && <FinancialHealthWidget kpis={kpis} locale={locale} />}
      </div>

      {/* 3. Operational Tables Section */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {canSales && (
          <RecentInvoicesWidget invoices={recentInvoices} locale={locale} />
        )}

        {canSales && (
          <OverdueInvoicesWidget invoices={overdueInvoices} locale={locale} />
        )}

        {canInventory && (
          <LowStockWidget products={lowStockProducts} locale={locale} />
        )}

        {canHr && (
          <PendingLeaveWidget leaves={pendingLeaves} locale={locale} />
        )}
      </div>
    </div>
  );
}
