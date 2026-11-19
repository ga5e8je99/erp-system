"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Warehouse as WarehouseIcon, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  createWarehouseAction,
  updateWarehouseAction,
  deleteWarehouseAction,
} from "../actions/warehouses";

interface WarehouseItem {
  id: string;
  name: string;
  code: string;
  address: string | null;
  isDefault: boolean;
  _count: {
    stockLevels: number;
    movements: number;
  };
}

interface WarehousesTableProps {
  warehouses: WarehouseItem[];
}

export function WarehousesTable({ warehouses }: WarehousesTableProps) {
  const t = useTranslations("inventory.warehouses");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingWarehouse, setEditingWarehouse] = React.useState<{
    id?: string;
    name: string;
    code: string;
    address?: string | null;
    isDefault: boolean;
  } | null>(null);

  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleAddNew = () => {
    setEditingWarehouse({
      name: "",
      code: "",
      address: "",
      isDefault: false,
    });
    setDialogOpen(true);
  };

  const handleEdit = (w: WarehouseItem) => {
    setEditingWarehouse({
      id: w.id,
      name: w.name,
      code: w.code,
      address: w.address,
      isDefault: w.isDefault,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarehouse || !editingWarehouse.name.trim() || !editingWarehouse.code.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingWarehouse.id) {
        const res = await updateWarehouseAction({
          id: editingWarehouse.id,
          name: editingWarehouse.name.trim(),
          code: editingWarehouse.code.trim().toUpperCase(),
          address: editingWarehouse.address?.trim() || undefined,
          isDefault: editingWarehouse.isDefault,
        });
        if (res.ok) {
          toast.success(t("updatedSuccess"));
          setDialogOpen(false);
          router.refresh();
        } else {
          toast.error(res.error);
        }
      } else {
        const res = await createWarehouseAction({
          name: editingWarehouse.name.trim(),
          code: editingWarehouse.code.trim().toUpperCase(),
          address: editingWarehouse.address?.trim() || undefined,
          isDefault: editingWarehouse.isDefault,
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
      const res = await deleteWarehouseAction(deleteId);
      if (res.ok) {
        toast.success(t("deletedSuccess"));
        setDeleteId(null);
        router.refresh();
      } else {
        if (res.error === "CANNOT_DELETE_DEFAULT_WAREHOUSE") {
          toast.error(t("cannotDeleteDefault"));
        } else if (res.error === "WAREHOUSE_HAS_STOCK_OR_MOVEMENTS") {
          toast.error(t("hasStockError"));
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
          {t("addWarehouse")}
        </Button>
      </div>

      {warehouses.length === 0 ? (
        <EmptyState
          icon={WarehouseIcon}
          title={t("title")}
          description={t("subtitle")}
          action={
            <Button onClick={handleAddNew} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              {t("addWarehouse")}
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("code")}</TableHead>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("address")}</TableHead>
                <TableHead>{t("isDefault")}</TableHead>
                <TableHead className="w-[100px] text-end">{tCommon("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-mono text-xs font-bold text-primary">
                    {w.code}
                  </TableCell>
                  <TableCell className="font-semibold text-sm">
                    {w.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {w.address || "—"}
                  </TableCell>
                  <TableCell>
                    {w.isDefault ? (
                      <Badge variant="outline" className="border-teal-500/40 text-teal-600 bg-teal-50/50 gap-1 text-[11px]">
                        <CheckCircle2 className="h-3 w-3" />
                        {t("defaultBadge")}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => handleEdit(w)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(w.id)}
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
              {editingWarehouse?.id ? t("editWarehouse") : t("addWarehouse")}
            </DialogTitle>
            <DialogDescription>{t("subtitle")}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whCode" className="text-start">
                {t("code")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="whCode"
                value={editingWarehouse?.code || ""}
                onChange={(e) =>
                  setEditingWarehouse((prev) =>
                    prev ? { ...prev, code: e.target.value.toUpperCase() } : null
                  )
                }
                placeholder="WH-01"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whName" className="text-start">
                {t("name")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="whName"
                value={editingWarehouse?.name || ""}
                onChange={(e) =>
                  setEditingWarehouse((prev) =>
                    prev ? { ...prev, name: e.target.value } : null
                  )
                }
                placeholder={t("name")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whAddress" className="text-start">
                {t("address")}
              </Label>
              <Input
                id="whAddress"
                value={editingWarehouse?.address || ""}
                onChange={(e) =>
                  setEditingWarehouse((prev) =>
                    prev ? { ...prev, address: e.target.value } : null
                  )
                }
                placeholder={t("address")}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="isDefault" className="text-sm font-medium">
                  {t("isDefault")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  تعيين هذا المستودع كالمستودع الرئيسي الافتراضي
                </p>
              </div>
              <Switch
                id="isDefault"
                checked={editingWarehouse?.isDefault || false}
                onCheckedChange={(checked) =>
                  setEditingWarehouse((prev) =>
                    prev ? { ...prev, isDefault: checked } : null
                  )
                }
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
        description="هل أنت متأكد من حذف هذا المستودع؟ لن يمكن الحذف إذا كان المستودع الافتراضي أو يحتوي على مخزون."
        variant="destructive"
        confirmText={tCommon("delete")}
        cancelText={tCommon("cancel")}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
