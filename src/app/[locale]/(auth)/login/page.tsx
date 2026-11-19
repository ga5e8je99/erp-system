import React, { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { LoginForm } from "@/features/auth/components/login-form";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Languages,
  Boxes,
  ReceiptText,
  Scale,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface LoginPageProps {
  params: Promise<{ locale: string }>;
}

export default async function LoginPage({ params }: LoginPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("auth");
  const tCommon = await getTranslations("common");
  const isArabic = locale === "ar";
  const otherLocale = isArabic ? "en" : "ar";

  const features = [
    {
      icon: Boxes,
      title: isArabic ? "إدارة المخازن المتعددة" : "Multi-Warehouse Management",
      desc: t("featureMultiWarehouse"),
    },
    {
      icon: ReceiptText,
      title: isArabic ? "دورة مبيعات وفواتير إلكترونية" : "Sales Cycle & E-Invoicing",
      desc: t("featureSalesCycle"),
    },
    {
      icon: Scale,
      title: isArabic ? "محاسبة مالية ودفتر أستاذ" : "General Ledger Accounting",
      desc: t("featureAccounting"),
    },
    {
      icon: ShieldCheck,
      title: isArabic ? "أمان ورقابة وتدقيق كامل" : "Audit Log & Access Control",
      desc: t("featureAuditSecurity"),
    },
  ];

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Brand Hero Side (collapses cleanly on mobile via hidden lg:flex) */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-zinc-950 p-10 text-white lg:flex">
        {/* Background glow and subtle pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-zinc-900 to-black opacity-90" />
        <div className="absolute -top-24 -start-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -end-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              {tCommon("appName")}
            </h2>
            <p className="text-xs text-zinc-400">{t("heroSubBadge")}</p>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{t("heroBadge")}</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-100 sm:text-5xl">
            {t("heroTitle")}
          </h1>

          <p className="text-base text-zinc-400">
            {t("heroDescription")}
          </p>

          <div className="grid grid-cols-1 gap-3 pt-4">
            {features.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xs transition-colors hover:bg-white/10"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <item.icon className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-zinc-200">{item.title}</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero Footer */}
        <div className="relative z-10 flex items-center justify-between border-t border-zinc-800/80 pt-6 text-xs text-zinc-500">
          <span>
            © {new Date().getFullYear()} {tCommon("appName")}.
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
            <Zap className="h-3.5 w-3.5 text-primary" />
            v0.1.0
          </span>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex flex-col justify-between p-6 sm:p-10 lg:p-12">
        {/* Top bar with mobile logo & language switcher */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="font-bold text-base">{tCommon("appName")}</span>
          </div>

          <div className="ms-auto">
            <Button asChild variant="ghost" size="sm" className="gap-2">
              <Link href="/login" locale={otherLocale}>
                <Languages className="h-4 w-4" />
                <span>{isArabic ? tCommon("switchToEn") : tCommon("switchToAr")}</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Center Form */}
        <div className="my-auto flex justify-center py-8">
          <Suspense fallback={<div className="h-64 w-full max-w-md animate-pulse rounded-lg bg-muted/40" />}>
            <LoginForm locale={locale} />
          </Suspense>
        </div>

        {/* Bottom copyright on small screens */}
        <div className="text-center text-xs text-muted-foreground lg:text-start flex flex-col sm:flex-row items-center justify-between gap-2 border-t pt-4">
          <span>{tCommon("appName")} — {tCommon("description")}</span>
          <span className="font-mono text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} Masar ERP v0.1.0
          </span>
        </div>
      </div>
    </div>
  );
}
