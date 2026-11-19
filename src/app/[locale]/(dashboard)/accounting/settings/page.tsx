import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import {
  getCompanyAccountMappings,
  getFlatAccountsList,
} from "@/features/accounting/services/accounting-service";
import { AccountSettingsForm } from "@/features/accounting/components/account-settings-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("accounting.settings");
  return {
    title: `${t("title")} | Masar ERP`,
    description: t("description"),
  };
}

export default async function AccountingSettingsPage() {
  await requirePermission("accounting.account.manage");
  const t = await getTranslations("accounting.settings");

  const [mappings, accounts] = await Promise.all([
    getCompanyAccountMappings(),
    getFlatAccountsList({ postableOnly: true }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />
      <AccountSettingsForm initialConfig={mappings} accounts={accounts} />
    </div>
  );
}
