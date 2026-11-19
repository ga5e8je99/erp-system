"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Plus, Eye, RotateCcw, CheckCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { JournalEntryListItem } from "../types";
import { JournalEntryFormDialog } from "./journal-entry-form-dialog";
import {
  postDraftJournalEntryAction,
  reverseJournalEntryAction,
} from "../actions/journal-actions";
import { formatCurrency } from "@/lib/money";

interface JournalEntriesTableProps {
  initialItems: JournalEntryListItem[];
  total: number;
  totalPages: number;
  currentPage: number;
  currentSearch?: string;
  currentStatus?: string;
  accounts: { id: string; code: string; name: string; label: string }[];
}

export function JournalEntriesTable({
  initialItems,
  currentSearch = "",
  currentStatus = "ALL",
  accounts,
}: JournalEntriesTableProps) {
  const t = useTranslations("accounting.journal");
  const router = useRouter();

  const [search, setSearch] = React.useState(currentSearch);
  const [status, setStatus] = React.useState(currentStatus);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // Reverse dialog state
  const [reverseTarget, setReverseTarget] = React.useState<JournalEntryListItem | null>(null);
  const [isReversing, setIsReversing] = React.useState(false);

  // Post draft dialog state
  const [postTarget, setPostTarget] = React.useState<JournalEntryListItem | null>(null);
  const [isPosting, setIsPosting] = React.useState(false);

  const applyFilters = (newSearch?: string, newStatus?: string) => {
    const s = newSearch !== undefined ? newSearch : search;
    const st = newStatus !== undefined ? newStatus : status;

    const params = new URLSearchParams();
    if (s) params.set("search", s);
    if (st && st !== "ALL") params.set("status", st);

    router.push(`/accounting/journal?${params.toString()}`);
  };

  const handleConfirmPost = async () => {
    if (!postTarget) return;
    setIsPosting(true);
    try {
      const res = await postDraftJournalEntryAction(postTarget.id);
      if (res.ok) {
        toast.success(t("postedSuccessfully"));
        setPostTarget(null);
        router.refresh();
      } else {
        toast.error(res.error || t("failedToPost"));
      }
    } catch {
      toast.error(t("unexpectedError"));
    } finally {
      setIsPosting(false);
    }
  };

  const handleReverseConfirm = async () => {
    if (!reverseTarget) return;
    setIsReversing(true);
    try {
      const res = await reverseJournalEntryAction(reverseTarget.id, "عكس قيد من شاشة القيود");
      if (res.ok) {
        toast.success(t("reversedSuccessfully"));
        setReverseTarget(null);
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

  const sourceTypeMap: Record<string, string> = {
    MANUAL: "قيد يدوي",
    SALES_INVOICE: "فاتورة مبيعات",
    CUSTOMER_PAYMENT: "سند قبض",
    SALES_RETURN: "مرتجع مبيعات",
    VOID_INVOICE: "إلغاء فاتورة",
    PURCHASE_INVOICE: "فاتورة مشتريات",
    SUPPLIER_PAYMENT: "سند صرف مورد",
    PURCHASE_RETURN: "مرتجع مشتريات",
    EXPENSE: "سند مصروف",
  };

  return (
    <div className="space-y-4">
      {/* Filters & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters(search, status)}
              placeholder={t("searchPlaceholder")}
              className="ps-9"
            />
          </div>
          <Select
            value={status}
            onValueChange={(val) => {
              const s = val || "ALL";
              setStatus(s);
              applyFilters(search, s);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("allStatuses")}</SelectItem>
              <SelectItem value="POSTED">{t("statusOptions.POSTED")}</SelectItem>
              <SelectItem value="DRAFT">{t("statusOptions.DRAFT")}</SelectItem>
              <SelectItem value="REVERSED">{t("statusOptions.REVERSED")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          data-testid="create-journal-entry-btn"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-4 w-4 me-1.5" />
          {t("addNewJournalEntry")}
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">{t("entryNumber")}</th>
                <th className="py-3 px-4 text-start">{t("date")}</th>
                <th className="py-3 px-4 text-start">{t("description")}</th>
                <th className="py-3 px-4 text-start">{t("sourceType")}</th>
                <th className="py-3 px-4 text-start">{t("status")}</th>
                <th className="py-3 px-4 text-end">{t("amount")}</th>
                <th className="py-3 px-4 text-center">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {initialItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    {t("noEntriesFound")}
                  </td>
                </tr>
              ) : (
                initialItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                    {/* Number */}
                    <td className="py-3 px-4 font-mono font-medium" dir="ltr">
                      <Link
                        href={`/accounting/journal/${item.id}`}
                        className="text-primary hover:underline"
                      >
                        {item.entryNumber}
                      </Link>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(item.date).toLocaleDateString("ar-EG")}
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4 max-w-xs truncate" title={item.description}>
                      {item.description}
                    </td>

                    {/* Source */}
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-xs font-normal">
                        {sourceTypeMap[item.sourceType || ""] || item.sourceType || "يدوي"}
                      </Badge>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <StatusBadge status={item.status} />
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-end font-mono tabular-nums font-semibold" dir="ltr">
                      {formatCurrency(item.totalDebit)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                          title={t("viewDetails")}
                        >
                          <Link href={`/accounting/journal/${item.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>

                        {item.status === "DRAFT" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => setPostTarget(item)}
                            title={t("postEntry")}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}

                        {item.status === "POSTED" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => setReverseTarget(item)}
                            title={t("reverseEntry")}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Entry Form Dialog */}
      <JournalEntryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        accounts={accounts}
        onSuccess={() => router.refresh()}
      />

      {/* Post Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(postTarget)}
        onOpenChange={(open) => !open && setPostTarget(null)}
        title={t("postEntry")}
        description={`هل أنت متأكد من ترحيل القيد اليومي رقم "${postTarget?.entryNumber}"؟ بعد الترحيل لا يمكن تعديل القيد.`}
        confirmText={t("postEntry")}
        cancelText={t("cancel")}
        variant="default"
        isLoading={isPosting}
        onConfirm={handleConfirmPost}
      />

      {/* Reverse Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(reverseTarget)}
        onOpenChange={(open) => !open && setReverseTarget(null)}
        title={t("reverseConfirmTitle")}
        description={t("reverseConfirmDescription", {
          number: reverseTarget?.entryNumber || "",
        })}
        confirmText={t("reverseEntry")}
        cancelText={t("cancel")}
        variant="destructive"
        isLoading={isReversing}
        onConfirm={handleReverseConfirm}
      />
    </div>
  );
}
