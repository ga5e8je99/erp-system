"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { Plus, Edit2, Trash2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DepartmentItem } from "../types";
import { DepartmentDialog } from "./department-dialog";
import { deleteDepartmentAction } from "../actions/department-actions";

interface DepartmentsTableProps {
  departments: DepartmentItem[];
}

export function DepartmentsTable({ departments }: DepartmentsTableProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingDept, setEditingDept] = React.useState<DepartmentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<DepartmentItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleEdit = (dept: DepartmentItem) => {
    setEditingDept(dept);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingDept(null);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteDepartmentAction(deleteTarget.id);
      if (res.ok) {
        toast.success("تم حذف القسم بنجاح");
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(res.error || "فشل حذف القسم");
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
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-base">الأقسام الإدارية</h3>
          <Badge variant="secondary" className="font-mono">
            {departments.length}
          </Badge>
        </div>
        <Button onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4 me-1.5" />
          إضافة قسم جديد
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">الرمز</th>
                <th className="py-3 px-4 text-start">اسم القسم</th>
                <th className="py-3 px-4 text-start">الوصف</th>
                <th className="py-3 px-4 text-center">الوظائف</th>
                <th className="py-3 px-4 text-center">الموظفون</th>
                <th className="py-3 px-4 text-end">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {departments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    لا توجد أقسام مسجلة حالياً
                  </td>
                </tr>
              ) : (
                departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-xs">
                      <Badge variant="outline">{dept.code}</Badge>
                    </td>
                    <td className="py-3 px-4 font-medium">{dept.name}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs max-w-xs truncate">
                      {dept.description || "-"}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-xs">
                      {dept._count?.positions || 0}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-xs">
                      <Badge variant="secondary">{dept._count?.employees || 0}</Badge>
                    </td>
                    <td className="py-3 px-4 text-end">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleEdit(dept)}
                          title="تعديل القسم"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(dept)}
                          title="حذف القسم"
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

      <DepartmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        department={editingDept}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="تأكيد حذف القسم"
        description={`هل أنت متأكد من حذف قسم "${deleteTarget?.name}"؟ لن تتمكن من حذفه إذا كان مرتبطاً بموظفين أو مسميات وظيفية.`}
        confirmText="نعم، احذف القسم"
        cancelText="إلغاء"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
