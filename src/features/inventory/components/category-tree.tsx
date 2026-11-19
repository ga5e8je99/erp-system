"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import {
  FolderTree,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { CategoryTreeNode } from "../queries/categories";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from "../actions/categories";

interface CategoryTreeProps {
  tree: CategoryTreeNode[];
  flatCategories: { id: string; name: string }[];
}

export function CategoryTree({ tree, flatCategories }: CategoryTreeProps) {
  const t = useTranslations("inventory.categories");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [expandedNodes, setExpandedNodes] = React.useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<{
    id?: string;
    name: string;
    description?: string | null;
    parentId?: string | null;
  } | null>(null);

  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddNew = (parentId?: string) => {
    setEditingCategory({
      name: "",
      description: "",
      parentId: parentId || null,
    });
    setDialogOpen(true);
  };

  const handleEdit = (cat: CategoryTreeNode) => {
    setEditingCategory({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      parentId: cat.parentId,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingCategory.id) {
        const res = await updateCategoryAction({
          id: editingCategory.id,
          name: editingCategory.name.trim(),
          description: editingCategory.description?.trim() || undefined,
          parentId: editingCategory.parentId || undefined,
        });
        if (res.ok) {
          toast.success(t("updatedSuccess"));
          setDialogOpen(false);
          router.refresh();
        } else {
          toast.error(res.error);
        }
      } else {
        const res = await createCategoryAction({
          name: editingCategory.name.trim(),
          description: editingCategory.description?.trim() || undefined,
          parentId: editingCategory.parentId || undefined,
        });
        if (res.ok) {
          toast.success(t("createdSuccess"));
          setDialogOpen(false);
          router.refresh();
        } else {
          toast.error(res.error);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon("error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await deleteCategoryAction(deleteId);
      if (res.ok) {
        toast.success(t("deletedSuccess"));
        setDeleteId(null);
        router.refresh();
      } else {
        if (res.error === "CATEGORY_HAS_PRODUCTS") {
          toast.error(t("hasProductsError"));
        } else if (res.error === "CATEGORY_HAS_CHILDREN") {
          toast.error(t("hasChildrenError"));
        } else {
          toast.error(res.error);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon("error"));
    } finally {
      setIsDeleting(false);
    }
  };

  const renderNode = (node: CategoryTreeNode, level = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes[node.id] ?? true;

    return (
      <div key={node.id} className="space-y-1">
        <div
          className={`flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40 ${
            level > 0 ? "ms-6 border-dashed" : "border-solid"
          }`}
        >
          <div className="flex items-center gap-3">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent text-muted-foreground"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="h-6 w-6 flex items-center justify-center text-muted-foreground/40">
                <span className="h-1.5 w-1.5 rounded-full bg-border" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{node.name}</span>
                <Badge variant="secondary" className="gap-1 font-mono text-[11px]">
                  <Package className="h-3 w-3" />
                  {node.productsCount}
                </Badge>
              </div>
              {node.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {node.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => handleAddNew(node.id)}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">فرعي</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => handleEdit(node)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeleteId(node.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t("title")}</h3>
          <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => handleAddNew()} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          {t("addCategory")}
        </Button>
      </div>

      {tree.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title={t("title")}
          description={t("subtitle")}
          action={
            <Button onClick={() => handleAddNew()} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              {t("addCategory")}
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">{tree.map((root) => renderNode(root, 0))}</div>
      )}

      {/* Add / Edit Category Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory?.id ? t("editCategory") : t("addCategory")}
            </DialogTitle>
            <DialogDescription>{t("subtitle")}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="catName" className="text-start">
                {t("name")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="catName"
                value={editingCategory?.name || ""}
                onChange={(e) =>
                  setEditingCategory((prev) =>
                    prev ? { ...prev, name: e.target.value } : null
                  )
                }
                placeholder={t("name")}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label className="text-start">{t("parent")}</Label>
              <Select
                value={editingCategory?.parentId || "none"}
                onValueChange={(val) =>
                  setEditingCategory((prev) =>
                    prev ? { ...prev, parentId: (!val || val === "none") ? null : val } : null
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("noneParent")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("noneParent")}</SelectItem>
                  {flatCategories
                    .filter((c) => c.id !== editingCategory?.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="catDesc" className="text-start">
                {t("description")}
              </Label>
              <Textarea
                id="catDesc"
                value={editingCategory?.description || ""}
                onChange={(e) =>
                  setEditingCategory((prev) =>
                    prev ? { ...prev, description: e.target.value } : null
                  )
                }
                placeholder={t("description")}
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSubmitting}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? tCommon("loading") : tCommon("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={tCommon("confirm")}
        description="هل أنت متأكد من حذف هذا التصنيف؟ لن يمكن الحذف إذا كان مرتبطاً بمنتجات أو تصنيفات فرعية."
        variant="destructive"
        confirmText={tCommon("delete")}
        cancelText={tCommon("cancel")}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
