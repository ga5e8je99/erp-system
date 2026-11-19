import { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getJournalEntryById } from "@/features/accounting/services/accounting-service";
import { JournalEntryDetailView } from "@/features/accounting/components/journal-entry-detail-view";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const entry = await getJournalEntryById(id);
  return {
    title: entry ? `${entry.entryNumber} | Masar ERP` : "Journal Entry | Masar ERP",
  };
}

export default async function JournalEntryDetailPage({ params }: PageProps) {
  await requirePermission("accounting.journal.view");
  const { id } = await params;

  const entry = await getJournalEntryById(id);
  if (!entry) {
    notFound();
  }

  return <JournalEntryDetailView entry={entry} />;
}
