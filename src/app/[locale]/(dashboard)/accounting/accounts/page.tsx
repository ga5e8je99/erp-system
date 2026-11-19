import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { getChartOfAccountsTree } from "@/features/accounting/services/accounting-service";
import { AccountsTreeView } from "@/features/accounting/components/accounts-tree-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("accounting.accounts");
  return {
    title: `${t("title")} | Masar ERP`,
    description: t("description"),
  };
}

export default async function AccountsPage() {
  await requirePermission("accounting.account.view");
  const t = await getTranslations("accounting.accounts");

  const tree = await getChartOfAccountsTree();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />
      <AccountsTreeView initialTree={tree} />
    </div>
  );
}
