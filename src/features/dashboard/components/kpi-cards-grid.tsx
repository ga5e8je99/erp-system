import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  AlertTriangle,
  CreditCard,
  Building2,
  Wallet,
} from "lucide-react";
import { DashboardKpis } from "../types";

interface KpiCardsGridProps {
  kpis: DashboardKpis;
  permissions: string[];
  locale: string;
}

export function KpiCardsGrid({ kpis, permissions, locale }: KpiCardsGridProps) {
  const isArabic = locale === "ar";
  const hasPerm = (perm: string) => {
    if (permissions.includes("admin") || permissions.includes("Admin") || permissions.includes("*")) {
      return true;
    }
    return permissions.includes(perm);
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {/* 1. Today's Sales */}
      {hasPerm("sales.invoice.view") && (
        <Card className="transition-all hover:shadow-xs border-s-4 border-s-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {isArabic ? "مبيعات اليوم" : "Today's Sales"}
            </CardTitle>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
              <Calendar className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold font-mono tracking-tight">
              {formatCurrency(kpis.todaySales)}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {isArabic ? "إجمالي الفواتير الصادرة اليوم" : "Issued invoices today"}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Month-to-Date Sales */}
      {hasPerm("sales.invoice.view") && (
        <Card className="transition-all hover:shadow-xs border-s-4 border-s-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {isArabic ? "مبيعات الشهر الحالي" : "MTD Sales"}
            </CardTitle>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <DollarSign className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold font-mono tracking-tight">
              {formatCurrency(kpis.monthToDateSales)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px]">
              {kpis.salesChangePercent >= 0 ? (
                <span className="flex items-center text-emerald-600 font-semibold">
                  <TrendingUp className="me-0.5 h-3 w-3" />
                  +{kpis.salesChangePercent}%
                </span>
              ) : (
                <span className="flex items-center text-rose-600 font-semibold">
                  <TrendingDown className="me-0.5 h-3 w-3" />
                  {kpis.salesChangePercent}%
                </span>
              )}
              <span className="text-muted-foreground">
                {isArabic ? "مقارنة بالسابق" : "vs last month"}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Receivables Outstanding */}
      {hasPerm("sales.invoice.view") && (
        <Card className="transition-all hover:shadow-xs border-s-4 border-s-sky-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {isArabic ? "مستحقات العملاء" : "Receivables"}
            </CardTitle>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/10 text-sky-600">
              <CreditCard className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold font-mono tracking-tight text-sky-700 dark:text-sky-400">
              {formatCurrency(kpis.receivablesOutstanding)}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {isArabic ? "رصيد الفواتير غير المحصلة" : "Uncollected balance"}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Payables Outstanding */}
      {hasPerm("purchasing.invoice.view") && (
        <Card className="transition-all hover:shadow-xs border-s-4 border-s-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {isArabic ? "مستحقات الموردين" : "Payables"}
            </CardTitle>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
              <Building2 className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold font-mono tracking-tight text-amber-700 dark:text-amber-400">
              {formatCurrency(kpis.payablesOutstanding)}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {isArabic ? "فواتير شراء قيد السداد" : "Unpaid purchase balance"}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. Cash & Bank Balance */}
      {hasPerm("accounting.account.view") && (
        <Card className="transition-all hover:shadow-xs border-s-4 border-s-teal-600">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {isArabic ? "الرصيد النقدي والبنكي" : "Cash & Bank"}
            </CardTitle>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-600/10 text-teal-600">
              <Wallet className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold font-mono tracking-tight text-teal-700 dark:text-teal-400">
              {formatCurrency(kpis.cashAndBankBalance)}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {isArabic ? "السيولة المتاحة حالياً" : "Available liquidity"}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6. Low Stock Items */}
      {hasPerm("inventory.product.view") && (
        <Card className="transition-all hover:shadow-xs border-s-4 border-s-rose-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {isArabic ? "أصناف دون حد الطلب" : "Low Stock Items"}
            </CardTitle>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-500/10 text-rose-600">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-mono tracking-tight text-rose-600">
                {kpis.lowStockCount}
              </span>
              {kpis.lowStockCount > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                  {isArabic ? "يتطلب إجراء" : "Action needed"}
                </Badge>
              )}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {isArabic ? "أصناف بلغت حد إعادة الطلب" : "Items at or below reorder"}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
