import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JournalStatus } from "@prisma/client";
import { requirePermission } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import {
  listJournalEntries,
  getFlatAccountsList,
} from "@/features/accounting/services/accounting-service";
import { JournalEntriesTable } from "@/features/accounting/components/journal-entries-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("accounting.journal");
  return {
    title: `${t("title")} | Masar ERP`,
    description: t("description"),
  };
}

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function JournalEntriesPage({ searchParams }: PageProps) {
  await requirePermission("accounting.journal.view");
  const t = await getTranslations("accounting.journal");

  const resolvedParams = await searchParams;
  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;
  const search = resolvedParams.search || "";
  const statusParam = resolvedParams.status;
  const status =
    statusParam && statusParam !== "ALL" ? (statusParam as JournalStatus) : undefined;

  const [{ items, total, totalPages }, accounts] = await Promise.all([
    listJournalEntries({
      page,
      search,
      status,
      pageSize: 25,
    }),
    getFlatAccountsList({ postableOnly: true }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />
      <JournalEntriesTable
        initialItems={items}
        total={total}
        totalPages={totalPages}
        currentPage={page}
        currentSearch={search}
        currentStatus={statusParam || "ALL"}
        accounts={accounts}
      />
    </div>
  );
}
