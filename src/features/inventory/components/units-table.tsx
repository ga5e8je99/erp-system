"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { createUnitAction, updateUnitAction, deleteUnitAction } from "../actions/units";

interface UnitItem {
  id: string;
  name: string;
  symbol: string;
  _count: { products: number };
}

interface UnitsTableProps {
  units: UnitItem[];
}

export function UnitsTable({ units }: UnitsTableProps) {
  const t = useTranslations("inventory.units");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingUnit, setEditingUnit] = React.useState<{
    id?: string;
    name: string;
    symbol: string;
  } | null>(null);

  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleAddNew = () => {
    setEditingUnit({ name: "", symbol: "" });
    setDialogOpen(true);
  };

  const handleEdit = (unit: UnitItem) => {
    setEditingUnit({ id: unit.id, name: unit.name, symbol: unit.symbol });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit || !editingUnit.name.trim() || !editingUnit.symbol.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingUnit.id) {
        const res = await updateUnitAction({
          id: editingUnit.id,
          name: editingUnit.name.trim(),
          symbol: editingUnit.symbol.trim(),
        });
        if (res.ok) {
          toast.success(t("updatedSuccess"));
          setDialogOpen(false);
          router.refresh();
        } else {
          toast.error(res.error);
        }
      } else {
        const res = await createUnitAction({
          name: editingUnit.name.trim(),
          symbol: editingUnit.symbol.trim(),
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
      const res = await deleteUnitAction(deleteId);
      if (res.ok) {
        toast.success(t("deletedSuccess"));
        setDeleteId(null);
        router.refresh();
      } else {
        if (res.error === "UNIT_HAS_PRODUCTS") {
          toast.error(t("hasProductsError"));
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t("title")}</h3>
          <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={handleAddNew} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          {t("addUnit")}
        </Button>
      </div>

      {units.length === 0 ? (
        <EmptyState
          icon={Scale}
          title={t("title")}
          description={t("subtitle")}
          action={
            <Button onClick={handleAddNew} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              {t("addUnit")}
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("symbol")}</TableHead>
                <TableHead>{t("productsCount")}</TableHead>
                <TableHead className="w-[100px] text-end">{tCommon("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-semibold text-sm">{u.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {u.symbol}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{u._count.products}</TableCell>
                  <TableCell className="text-end">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => handleEdit(u)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(u.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUnit?.id ? t("editUnit") : t("addUnit")}
            </DialogTitle>
            <DialogDescription>{t("subtitle")}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unitName" className="text-start">
                {t("name")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="unitName"
                value={editingUnit?.name || ""}
                onChange={(e) =>
                  setEditingUnit((prev) =>
                    prev ? { ...prev, name: e.target.value } : null
                  )
                }
                placeholder="مثال: قطعة، كرتونة، لتر"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitSymbol" className="text-start">
                {t("symbol")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="unitSymbol"
                value={editingUnit?.symbol || ""}
                onChange={(e) =>
                  setEditingUnit((prev) =>
                    prev ? { ...prev, symbol: e.target.value } : null
                  )
                }
                placeholder="مثال: كجم، قطعة، م"
                required
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
        description="هل أنت متأكد من حذف وحدة القياس هذه؟ لن يمكن الحذف إذا كانت مستخدمة في أي منتجات."
        variant="destructive"
        confirmText={tCommon("delete")}
        cancelText={tCommon("cancel")}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
