import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { requirePermission } from "@/lib/rbac";
import {
  Scale,
  BookOpen,
  TrendingUp,
  Landmark,
  Clock,
  Receipt,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("accounting.reports");
  return {
    title: `${t("hubTitle")} | Masar ERP`,
    description: t("hubDesc"),
  };
}

export default async function AccountingReportsHubPage() {
  await requirePermission("reports.financial.view");
  const t = await getTranslations("accounting.reports");

  const reports = [
    {
      title: t("trialBalanceTitle"),
      description: t("trialBalanceDesc"),
      href: "/accounting/reports/trial-balance",
      icon: Scale,
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
    {
      title: t("generalLedgerTitle"),
      description: t("generalLedgerDesc"),
      href: "/accounting/reports/general-ledger",
      icon: BookOpen,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300",
    },
    {
      title: t("profitLossTitle"),
      description: t("profitLossDesc"),
      href: "/accounting/reports/profit-loss",
      icon: TrendingUp,
      color: "text-teal-600 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-300",
    },
    {
      title: t("balanceSheetTitle"),
      description: t("balanceSheetDesc"),
      href: "/accounting/reports/balance-sheet",
      icon: Landmark,
      color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300",
    },
    {
      title: t("agingTitle"),
      description: t("agingDesc"),
      href: "/accounting/reports/aging",
      icon: Clock,
      color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300",
    },
    {
      title: t("taxSummaryTitle"),
      description: t("taxSummaryDesc"),
      href: "/accounting/reports/tax-summary",
      icon: Receipt,
      color: "text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("hubTitle")}
        description={t("hubDesc")}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <Link key={r.href} href={r.href} className="group block">
              <Card className="h-full transition-all duration-200 group-hover:border-primary/50 group-hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-lg ${r.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                  </div>
                  <CardTitle className="text-lg mt-3 group-hover:text-primary transition-colors">
                    {r.title}
                  </CardTitle>
                  <CardDescription className="text-sm mt-1">
                    {r.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
