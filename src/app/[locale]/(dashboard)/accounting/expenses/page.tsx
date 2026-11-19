import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AccountType } from "@prisma/client";
import { requirePermission } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import {
  listExpenses,
  getFlatAccountsList,
} from "@/features/accounting/services/accounting-service";
import { ExpensesTable } from "@/features/accounting/components/expenses-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("accounting.expenses");
  return {
    title: `${t("title")} | Masar ERP`,
    description: t("description"),
  };
}

interface PageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
}

export default async function ExpensesPage({ searchParams }: PageProps) {
  await requirePermission("accounting.expense.manage");
  const t = await getTranslations("accounting.expenses");

  const resolvedParams = await searchParams;
  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;
  const search = resolvedParams.search || "";

  const [{ items, total, totalPages }, expenseAccounts, paymentAccounts] =
    await Promise.all([
      listExpenses({
        page,
        search,
        pageSize: 25,
      }),
      getFlatAccountsList({ postableOnly: true, type: AccountType.EXPENSE }),
      getFlatAccountsList({ postableOnly: true, type: AccountType.ASSET }),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />
      <ExpensesTable
        initialItems={items}
        total={total}
        totalPages={totalPages}
        currentPage={page}
        currentSearch={search}
        expenseAccounts={expenseAccounts}
        paymentAccounts={paymentAccounts}
      />
    </div>
  );
}
