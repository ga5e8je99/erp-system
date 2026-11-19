"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { Plus, Edit2, Trash2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PositionItem } from "../types";
import { PositionDialog } from "./position-dialog";
import { deletePositionAction } from "../actions/department-actions";

interface PositionsTableProps {
  positions: PositionItem[];
  departments: { id: string; name: string }[];
}

export function PositionsTable({ positions, departments }: PositionsTableProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingPos, setEditingPos] = React.useState<PositionItem | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<PositionItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleEdit = (pos: PositionItem) => {
    setEditingPos(pos);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingPos(null);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deletePositionAction(deleteTarget.id);
      if (res.ok) {
        toast.success("تم حذف المسمى الوظيفي بنجاح");
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(res.error || "فشل حذف المسمى الوظيفي");
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-base">المسميات الوظيفية</h3>
          <Badge variant="secondary" className="font-mono">
            {positions.length}
          </Badge>
        </div>
        <Button onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4 me-1.5" />
          إضافة مسمى وظيفي
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">الرمز</th>
                <th className="py-3 px-4 text-start">المسمى الوظيفي</th>
                <th className="py-3 px-4 text-start">القسم</th>
                <th className="py-3 px-4 text-center">الموظفون</th>
                <th className="py-3 px-4 text-end">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    لا توجد مسميات وظيفية مسجلة حالياً
                  </td>
                </tr>
              ) : (
                positions.map((pos) => (
                  <tr key={pos.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-xs">
                      <Badge variant="outline">{pos.code}</Badge>
                    </td>
                    <td className="py-3 px-4 font-medium">{pos.title}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {pos.department ? (
                        <Badge variant="secondary">{pos.department.name}</Badge>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-xs">
                      <Badge variant="outline">{pos._count?.employees || 0}</Badge>
                    </td>
                    <td className="py-3 px-4 text-end">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleEdit(pos)}
                          title="تعديل المسمى الوظيفي"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(pos)}
                          title="حذف المسمى الوظيفي"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PositionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        departments={departments}
        position={editingPos}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="تأكيد حذف المسمى الوظيفي"
        description={`هل أنت متأكد من حذف المسمى الوظيفي "${deleteTarget?.title}"؟ لا يمكن حذفه إذا كان هناك موظفون مسجلون به.`}
        confirmText="نعم، احذف المسمى الوظيفي"
        cancelText="إلغاء"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
