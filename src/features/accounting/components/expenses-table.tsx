"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ExpenseListItem } from "../types";
import { ExpenseFormDialog } from "./expense-form-dialog";
import { deleteExpenseAction } from "../actions/expense-actions";
import { formatCurrency } from "@/lib/money";

interface ExpensesTableProps {
  initialItems: ExpenseListItem[];
  total: number;
  totalPages: number;
  currentPage: number;
  currentSearch?: string;
  expenseAccounts: { id: string; code: string; name: string; label: string }[];
  paymentAccounts: { id: string; code: string; name: string; label: string }[];
}

export function ExpensesTable({
  initialItems,
  currentSearch = "",
  expenseAccounts,
  paymentAccounts,
}: ExpensesTableProps) {
  const t = useTranslations("accounting.expenses");
  const router = useRouter();

  const [search, setSearch] = React.useState(currentSearch);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = React.useState<ExpenseListItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const applySearch = (val: string) => {
    const params = new URLSearchParams();
    if (val) params.set("search", val);
    router.push(`/accounting/expenses?${params.toString()}`);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteExpenseAction(deleteTarget.id);
      if (res.ok) {
        toast.success(t("deletedSuccessfully"));
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(res.error || t("failedToDelete"));
      }
    } catch {
      toast.error(t("unexpectedError"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch(search)}
            placeholder={t("searchPlaceholder")}
            className="ps-9"
          />
        </div>

        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 me-1.5" />
          {t("recordExpense")}
        </Button>
      </div>

      {/* Table Card */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">{t("expenseNumber")}</th>
                <th className="py-3 px-4 text-start">{t("date")}</th>
                <th className="py-3 px-4 text-start">{t("category")}</th>
                <th className="py-3 px-4 text-start">{t("expenseAccount")}</th>
                <th className="py-3 px-4 text-start">{t("paidFromAccount")}</th>
                <th className="py-3 px-4 text-end">{t("amount")}</th>
                <th className="py-3 px-4 text-start">{t("note")}</th>
                <th className="py-3 px-4 text-center">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {initialItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    {t("noExpensesFound")}
                  </td>
                </tr>
              ) : (
                initialItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium" dir="ltr">
                      {item.expenseNumber}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(item.date).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="py-3 px-4 font-medium">{item.category}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{item.accountName}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      {item.paidFromAccountName}
                    </td>
                    <td className="py-3 px-4 text-end font-mono tabular-nums font-semibold" dir="ltr">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs max-w-xs truncate">
                      {item.note || "-"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(item)}
                        title={t("deleteExpense")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Form Dialog */}
      <ExpenseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expenseAccounts={expenseAccounts}
        paymentAccounts={paymentAccounts}
        onSuccess={() => router.refresh()}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDescription", {
          number: deleteTarget?.expenseNumber || "",
        })}
        confirmText={t("delete")}
        cancelText={t("cancel")}
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
