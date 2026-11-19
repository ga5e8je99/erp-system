"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { ArrowRight, RotateCcw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { JournalEntryDetail } from "../types";
import { reverseJournalEntryAction } from "../actions/journal-actions";
import { formatCurrency } from "@/lib/money";

interface JournalEntryDetailViewProps {
  entry: JournalEntryDetail;
}

export function JournalEntryDetailView({ entry }: JournalEntryDetailViewProps) {
  const t = useTranslations("accounting.journal");
  const router = useRouter();

  const [reverseOpen, setReverseOpen] = React.useState(false);
  const [isReversing, setIsReversing] = React.useState(false);

  const totalDebit = entry.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = entry.lines.reduce((s, l) => s + l.credit, 0);

  const handleReverseConfirm = async () => {
    setIsReversing(true);
    try {
      const res = await reverseJournalEntryAction(entry.id, `عكس القيد ${entry.entryNumber}`);
      if (res.ok) {
        toast.success(t("reversedSuccessfully"));
        setReverseOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || t("failedToReverse"));
      }
    } catch {
      toast.error(t("unexpectedError"));
    } finally {
      setIsReversing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/accounting/journal">
            <ArrowRight className="h-4 w-4 me-1.5 rtl:rotate-180" />
            {t("backToJournal")}
          </Link>
        </Button>

        {entry.status === "POSTED" && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setReverseOpen(true)}
          >
            <RotateCcw className="h-4 w-4 me-1.5" />
            {t("reverseEntry")}
          </Button>
        )}
      </div>

      {/* Main Header Card */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold font-mono tracking-tight" dir="ltr">
                  {entry.entryNumber}
                </span>
                <StatusBadge status={entry.status} />
              </div>
              <CardDescription className="mt-1.5 text-base">
                {entry.description}
              </CardDescription>
            </div>

            {/* Source document link if any */}
            {entry.sourceLink && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("linkedDocument")}:</span>
                <Button variant="outline" size="sm" asChild>
                  <Link href={entry.sourceLink.href}>
                    <ExternalLink className="h-3.5 w-3.5 me-1.5" />
                    {entry.sourceLink.label}
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">{t("date")}</span>
              <span className="font-medium">
                {new Date(entry.date).toLocaleDateString("ar-EG")}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">{t("postedAt")}</span>
              <span className="font-medium">
                {entry.postedAt
                  ? new Date(entry.postedAt).toLocaleString("ar-EG")
                  : "-"}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">{t("sourceType")}</span>
              <span className="font-medium">
                {entry.sourceType ? entry.sourceType : t("manualEntry")}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">{t("linesCount")}</span>
              <span className="font-medium">{entry.lines.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lines Table Card */}
      <Card>
        <CardHeader className="py-4 border-b">
          <CardTitle className="text-base">{t("journalLines")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-semibold">
                <tr>
                  <th className="py-3 px-4 text-start">{t("accountCode")}</th>
                  <th className="py-3 px-4 text-start">{t("accountName")}</th>
                  <th className="py-3 px-4 text-start">{t("lineNote")}</th>
                  <th className="py-3 px-4 text-end">{t("debit")}</th>
                  <th className="py-3 px-4 text-end">{t("credit")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {entry.lines.map((line) => (
                  <tr key={line.id} className="hover:bg-muted/30">
                    <td className="py-3 px-4 font-mono text-xs font-semibold" dir="ltr">
                      {line.accountCode}
                    </td>
                    <td className="py-3 px-4 font-medium">{line.accountName}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      {line.description || "-"}
                    </td>
                    <td className="py-3 px-4 text-end font-mono tabular-nums font-semibold" dir="ltr">
                      {line.debit > 0 ? formatCurrency(line.debit) : "-"}
                    </td>
                    <td className="py-3 px-4 text-end font-mono tabular-nums font-semibold" dir="ltr">
                      {line.credit > 0 ? formatCurrency(line.credit) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/30 font-semibold">
                <tr>
                  <td colSpan={3} className="py-3 px-4 text-end">
                    {t("total")}:
                  </td>
                  <td className="py-3 px-4 text-end font-mono tabular-nums" dir="ltr">
                    {formatCurrency(totalDebit)}
                  </td>
                  <td className="py-3 px-4 text-end font-mono tabular-nums" dir="ltr">
                    {formatCurrency(totalCredit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Reverse Confirm Dialog */}
      <ConfirmDialog
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        title={t("reverseConfirmTitle")}
        description={t("reverseConfirmDescription", { number: entry.entryNumber })}
        confirmText={t("reverseEntry")}
        cancelText={t("cancel")}
        variant="destructive"
        isLoading={isReversing}
        onConfirm={handleReverseConfirm}
      />
    </div>
  );
}
