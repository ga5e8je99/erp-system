import React from "react";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getCompanySettings, getPostableAccounts } from "@/features/settings/services/settings-service";
import { SettingsForm } from "@/features/settings/components/settings-form";

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Permission Gate: company.settings.manage
  if (!hasPermission(session, "company.settings.manage")) {
    redirect(`/${locale}/forbidden`);
  }

  const isArabic = locale === "ar";
  const [settings, accounts] = await Promise.all([
    getCompanySettings(),
    getPostableAccounts(),
  ]);

  return (
    <div className="space-y-6">
      <div className="border-b pb-4 text-start">
        <h1 className="text-2xl font-bold tracking-tight">
          {isArabic ? "إعدادات النظام العامة" : "System Settings"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isArabic
            ? "إدارة هوية الشركة، العملات، الضرائب، ترقيم المستندات، وتوجيهات شجرة الحسابات"
            : "Manage company identity, currencies, taxes, document numbering, and GL mappings"}
        </p>
      </div>

      <SettingsForm initialSettings={settings} accounts={accounts} />
    </div>
  );
}
