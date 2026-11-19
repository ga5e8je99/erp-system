import React from "react";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Users,
  Package,
  ShoppingBag,
  Truck,
  TrendingUp,
  Scale,
  BookOpen,
  PieChart,
  Calendar,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  Boxes,
} from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "مركز التقارير الشامل | Masar ERP",
};

interface ReportsHubProps {
  params: Promise<{ locale: string }>;
}

export default async function ReportsHubPage({ params }: ReportsHubProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const isArabic = locale === "ar";
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;

  const userPerms = (session?.user as { permissions?: string[] })?.permissions || [];
  const userRole = (session?.user as { role?: string })?.role || "User";

  const hasPerm = (perm: string) => {
    if (userRole === "Admin" || userPerms.includes("*") || userPerms.includes("admin")) {
      return true;
    }
    return userPerms.includes(perm);
  };

  const reportGroups = [
    {
      moduleTitle: isArabic ? "تقارير المبيعات" : "Sales Reports",
      description: isArabic
        ? "متابعة أداء المبيعات وحركات العملاء ومسؤولي البيع"
        : "Sales performance tracking, customers, and salesperson metrics",
      permission: "reports.sales.view",
      reports: [
        {
          title: isArabic ? "المبيعات حسب العميل" : "Sales by Customer",
          desc: isArabic
            ? "حجم مبيعات كل عميل، الفواتير الصادرة، المسدد، والأرصدة المستحقة"
            : "Customer sales volume, issued invoices, collections, and balance",
          href: "/reports/sales-by-customer",
          icon: Users,
        },
        {
          title: isArabic ? "المبيعات حسب المنتج" : "Sales by Product",
          desc: isArabic
            ? "الكميات المباعة من كل صنف، الإيرادات المحققة، ومتوسط سعر البيع"
            : "Units sold per product, sales revenue, and average price",
          href: "/reports/sales-by-product",
          icon: Package,
        },
        {
          title: isArabic ? "المبيعات حسب مسؤول المبيعات" : "Sales by Salesperson",
          desc: isArabic
            ? "أداء موظفي ومسؤولي المبيعات وحجم الفواتير المحققة"
            : "Sales rep performance, invoice counts, and total sales",
          href: "/reports/sales-by-salesperson",
          icon: ShoppingBag,
        },
      ],
    },
    {
      moduleTitle: isArabic ? "تقارير المشتريات" : "Purchasing Reports",
      description: isArabic
        ? "متابعة فواتير الشراء ومدفوعات الموردين والأرصدة الدائنة"
        : "Vendor purchasing invoices, payments, and payable balances",
      permission: "reports.purchases.view",
      reports: [
        {
          title: isArabic ? "المشتريات حسب المورد" : "Purchases by Supplier",
          desc: isArabic
            ? "إجمالي المشتريات لكل مورد، الفواتير المسجلة، المسدد، والمستحق"
            : "Total purchases per vendor, invoice counts, paid, and payables",
          href: "/reports/purchases-by-supplier",
          icon: Truck,
        },
      ],
    },
    {
      moduleTitle: isArabic ? "تقارير المخزون" : "Inventory Reports",
      description: isArabic
        ? "تقييم رأس المال العامل في البضائع وتتبع دورة حركة المخزون"
        : "Stock valuation, inventory turnover, and movement flow",
      permission: "reports.inventory.view",
      reports: [
        {
          title: isArabic ? "تقييم المخزون (WAC)" : "Inventory Valuation",
          desc: isArabic
            ? "تقييم القيمة الإجمالية للبضائع المتاحة بطريقة المتوسط المرجح"
            : "Total value of on-hand items based on Weighted Average Cost",
          href: "/reports/inventory-valuation",
          icon: Boxes,
        },
        {
          title: isArabic ? "ملخص حركة المخزون" : "Stock Movement Summary",
          desc: isArabic
            ? "رصيد أول المدة، الوارد، المنصرف، التسويات الجردية، ورصيد آخر المدة"
            : "Opening stock, inward receipts, sales issue, adjustments, closing",
          href: "/reports/stock-movement",
          icon: Scale,
        },
      ],
    },
    {
      moduleTitle: isArabic ? "تقارير الربحية والهوامش" : "Profitability Reports",
      description: isArabic
        ? "مقارنة تكاليف البضاعة المباعة بالإيرادات لحساب هوامش الربح الإجمالية"
        : "Gross profit margins comparing sales revenue to COGS",
      permission: "reports.sales.view",
      reports: [
        {
          title: isArabic ? "ربحية المنتجات" : "Profit by Product",
          desc: isArabic
            ? "الإيرادات المحققة، تكلفة البضاعة المباعة (COGS)، ومجمل الربح والهامش %"
            : "Sales revenue, COGS, gross profit amount, and margin %",
          href: "/reports/profit-by-product",
          icon: TrendingUp,
        },
      ],
    },
    {
      moduleTitle: isArabic ? "التقارير المالية والمحاسبية" : "Financial & Accounting Reports",
      description: isArabic
        ? "القوائم المالية الختامية وميزان المراجعة وأعمار الديون والضريبة"
        : "Trial balance, General Ledger, P&L, Balance Sheet, Aging & VAT",
      permission: "reports.financial.view",
      reports: [
        {
          title: isArabic ? "ميزان المراجعة" : "Trial Balance",
          desc: isArabic
            ? "أرصدة الحسابات المدينة والدائنة وحركات الفترة والتوازن المالي"
            : "Debit and credit balances for all chart of accounts",
          href: "/accounting/reports/trial-balance",
          icon: BookOpen,
        },
        {
          title: isArabic ? "دفتر الأستاذ العام" : "General Ledger",
          desc: isArabic
            ? "كشف حركات الحسابات التفصيلية مع الرصيد التراكمي المستمر"
            : "Detailed transactional account entries with running balance",
          href: "/accounting/reports/general-ledger",
          icon: FileText,
        },
        {
          title: isArabic ? "قائمة الدخل (الأرباح والخسائر)" : "Income Statement (P&L)",
          desc: isArabic
            ? "الإيرادات، تكلفة المبيعات، المصروفات التشغيلية، وصافي الربح/الخسارة"
            : "Revenues, cost of sales, operating expenses, and net profit",
          href: "/accounting/reports/profit-loss",
          icon: DollarSign,
        },
        {
          title: isArabic ? "الميزانية العمومية" : "Balance Sheet",
          desc: isArabic
            ? "الأصول والالتزامات وحقوق الملكية في تاريخ محدد"
            : "Assets, liabilities, and equity at a specific point in time",
          href: "/accounting/reports/balance-sheet",
          icon: Scale,
        },
        {
          title: isArabic ? "أعمار الديون (عملاء وموردين)" : "Aging Report",
          desc: isArabic
            ? "تصنيف الفواتير المستحقة حسب فترات التأخير (30، 60، 90+ يوماً)"
            : "Receivables and payables aging buckets (30, 60, 90+ days)",
          href: "/accounting/reports/aging",
          icon: Calendar,
        },
        {
          title: isArabic ? "إقرار ضريبة القيمة المضافة" : "Tax Summary Report",
          desc: isArabic
            ? "ضريبة المخرجات على المبيعات وضريبة المدخلات وصافي الضريبة المستحقة"
            : "Output VAT on sales, input VAT on purchases, and net payable",
          href: "/accounting/reports/tax-summary",
          icon: PieChart,
        },
      ],
    },
    {
      moduleTitle: isArabic ? "تقارير الموارد البشرية" : "Human Resources Reports",
      description: isArabic
        ? "سجلات الحضور والغياب والإجازات ونسب الالتزام بالدوام الرسمي"
        : "Attendance logs, employee leave tracking, and adherence rates",
      permission: "hr.employee.view",
      reports: [
        {
          title: isArabic ? "ملخص حضور وانصراف الموظفين" : "HR Attendance Summary",
          desc: isArabic
            ? "أيام الحضور الفعلي، الغياب، التأخير، الإجازات، ونسبة الالتزام"
            : "Working days, present, absences, late arrivals, leaves, and %",
          href: "/reports/hr-attendance",
          icon: Users,
        },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight">
          {isArabic ? "مركز التقارير والتحليلات" : "Reports & Analytics Center"}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {isArabic
            ? "دليل شامل لجميع التقارير التشغيلية والمالية والمخزنية والإدارية لنظام مسار"
            : "Central gallery for operational, financial, inventory, and HR reporting"}
        </p>
      </div>

      {/* Report Groups */}
      <div className="space-y-8">
        {reportGroups.map((group, gIdx) => {
          if (!hasPerm(group.permission)) return null;

          return (
            <div key={gIdx} className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    {group.moduleTitle}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {group.description}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {group.reports.length} {isArabic ? "تقارير" : "reports"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.reports.map((rep, rIdx) => {
                  const Icon = rep.icon;
                  return (
                    <Card
                      key={rIdx}
                      className="group transition-all hover:border-primary/50 hover:shadow-xs"
                    >
                      <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <Icon className="h-4 w-4" />
                          </div>
                          <ArrowIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                        <CardTitle className="text-sm font-semibold mt-3">
                          <Link href={rep.href} className="hover:underline">
                            {rep.title}
                          </Link>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {rep.desc}
                        </p>
                        <div className="mt-3">
                          <Link
                            href={rep.href}
                            className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                          >
                            <span>{isArabic ? "فتح التقرير" : "View report"}</span>
                            <ArrowIcon className="h-3 w-3" />
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
