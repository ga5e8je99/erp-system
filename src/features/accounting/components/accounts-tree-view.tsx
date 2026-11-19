"use client";

import * as React from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Edit2,
  Trash2,
  Folder,
  FolderOpen,
  FileText,
  Search,
} from "lucide-react";
import { AccountType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AccountTreeNode } from "../types";
import { AccountFormDialog } from "./account-form-dialog";
import { deleteAccountAction } from "../actions/account-actions";
import { formatCurrency } from "@/lib/money";

interface AccountsTreeViewProps {
  initialTree: AccountTreeNode[];
}

export function AccountsTreeView({ initialTree }: AccountsTreeViewProps) {
  const t = useTranslations("accounting.accounts");
  const router = useRouter();

  const [tree, setTree] = React.useState<AccountTreeNode[]>(initialTree);
  const [search, setSearch] = React.useState("");
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(() => {
    // Expand root level by default
    return new Set(initialTree.map((n) => n.id));
  });

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedAccount, setSelectedAccount] = React.useState<AccountTreeNode | null>(null);
  const [dialogParentId, setDialogParentId] = React.useState<string | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = React.useState<AccountTreeNode | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    setTree(initialTree);
  }, [initialTree]);

  // Flatten options for parent selection in dialog
  const flatOptions = React.useMemo(() => {
    const list: { id: string; code: string; name: string; type: AccountType }[] = [];
    function walk(nodes: AccountTreeNode[]) {
      nodes.forEach((n) => {
        list.push({ id: n.id, code: n.code, name: n.name, type: n.type });
        if (n.children.length > 0) walk(n.children);
      });
    }
    walk(tree);
    return list;
  }, [tree]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<string>();
    function walk(nodes: AccountTreeNode[]) {
      nodes.forEach((n) => {
        all.add(n.id);
        if (n.children.length > 0) walk(n.children);
      });
    }
    walk(tree);
    setExpandedIds(all);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const handleAddRoot = () => {
    setSelectedAccount(null);
    setDialogParentId(null);
    setDialogOpen(true);
  };

  const handleAddChild = (parent: AccountTreeNode) => {
    setSelectedAccount(null);
    setDialogParentId(parent.id);
    setDialogOpen(true);
  };

  const handleEdit = (account: AccountTreeNode) => {
    setSelectedAccount(account);
    setDialogParentId(account.parentId);
    setDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteAccountAction(deleteTarget.id);
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

  // Helper to filter nodes by search text
  const filterNode = (node: AccountTreeNode, query: string): boolean => {
    if (!query) return true;
    const match =
      node.code.toLowerCase().includes(query.toLowerCase()) ||
      node.name.toLowerCase().includes(query.toLowerCase());
    if (match) return true;
    return node.children.some((c) => filterNode(c, query));
  };

  const renderNode = (node: AccountTreeNode) => {
    if (search && !filterNode(node, search)) return null;

    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.id) || Boolean(search);

    const typeColorMap: Record<string, string> = {
      ASSET: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200",
      LIABILITY: "text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200",
      EQUITY: "text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200",
      REVENUE: "text-teal-700 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200",
      EXPENSE: "text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200",
    };

    return (
      <div key={node.id} className="select-none">
        <div
          className={`group flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/70 transition-colors border-b border-border/40 ${
            node.level === 0 ? "font-semibold bg-muted/30" : ""
          }`}
          style={{ paddingInlineStart: `${node.level * 24 + 12}px` }}
        >
          {/* Left / Info */}
          <div className="flex items-center gap-2 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="p-1 hover:bg-background rounded text-muted-foreground transition-transform"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                )}
              </button>
            ) : (
              <span className="w-6 inline-block" />
            )}

            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <Folder className="h-4 w-4 text-primary/70 shrink-0" />
              )
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            )}

            <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60" dir="ltr">
              {node.code}
            </span>

            <span className="truncate text-sm font-medium">{node.name}</span>

            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 h-4 ${typeColorMap[node.type] || ""}`}
            >
              {t(`types.${node.type}`)}
            </Badge>

            {!node.isPostable && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {t("parentHeader")}
              </Badge>
            )}
          </div>

          {/* Right / Balance & Actions */}
          <div className="flex items-center gap-4 shrink-0">
            <span
              className="text-sm font-mono tabular-nums font-semibold"
              dir="ltr"
            >
              {formatCurrency(node.totalBalance)}
            </span>

            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleAddChild(node)}
                title={t("addSubAccount")}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleEdit(node)}
                title={t("editAccount")}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget(node)}
                title={t("deleteAccount")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Nested Children */}
        {hasChildren && isExpanded && (
          <div className="space-y-0.5">{node.children.map(renderNode)}</div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="ps-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            {t("expandAll")}
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            {t("collapseAll")}
          </Button>
          <Button onClick={handleAddRoot} size="sm">
            <Plus className="h-4 w-4 me-1.5" />
            {t("addNewAccount")}
          </Button>
        </div>
      </div>

      {/* Tree Card */}
      <Card>
        <CardHeader className="py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{t("chartOfAccountsTitle")}</CardTitle>
              <CardDescription>{t("chartOfAccountsDescription")}</CardDescription>
            </div>
            <span className="text-xs text-muted-foreground">
              {t("accountsCount", { count: flatOptions.length })}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-4 divide-y divide-border/20">
          {tree.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {t("noAccountsFound")}
            </div>
          ) : (
            tree.map(renderNode)
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <AccountFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={selectedAccount}
        parentOptions={flatOptions}
        defaultParentId={dialogParentId}
        onSuccess={() => router.refresh()}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDescription", { name: deleteTarget?.name || "" })}
        confirmText={t("delete")}
        cancelText={t("cancel")}
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
