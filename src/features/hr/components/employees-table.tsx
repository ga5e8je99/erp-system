"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter, Link } from "@/i18n/routing";
import {
  Plus,
  Search,
  Eye,
  Edit2,
  UserX,
  Building2,
  Briefcase,
  Users,
} from "lucide-react";
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmployeeListItem } from "../types";
import { EmployeeStatus } from "@prisma/client";
import { EmployeeDialog } from "./employee-dialog";
import { deleteEmployeeAction } from "../actions/employee-actions";
import { maskSalary } from "../utils/mask-salary";

interface EmployeesTableProps {
  employees: EmployeeListItem[];
  departments: { id: string; name: string }[];
  positions: { id: string; title: string; departmentId: string | null }[];
  users?: { id: string; name: string; email: string }[];
  canViewSalary: boolean;
  canManage: boolean;
}

export function EmployeesTable({
  employees,
  departments,
  positions,
  users = [],
  canViewSalary,
  canManage,
}: EmployeesTableProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [selectedDept, setSelectedDept] = React.useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("ALL");

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingEmployee, setEditingEmployee] = React.useState<EmployeeListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<EmployeeListItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const filteredEmployees = React.useMemo(() => {
    return employees.filter((emp) => {
      if (selectedDept !== "ALL" && emp.departmentId !== selectedDept) return false;
      if (selectedStatus !== "ALL" && emp.status !== selectedStatus) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchName = emp.fullName.toLowerCase().includes(q);
        const matchCode = emp.code.toLowerCase().includes(q);
        const matchPhone = emp.phone?.toLowerCase().includes(q);
        const matchEmail = emp.email?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchPhone && !matchEmail) return false;
      }
      return true;
    });
  }, [employees, search, selectedDept, selectedStatus]);

  const handleEdit = (emp: EmployeeListItem) => {
    setEditingEmployee(emp);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingEmployee(null);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteEmployeeAction(deleteTarget.id);
      if (res.ok) {
        toast.success("تم إنهاء خدمة الموظف وتحديث حالته");
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(res.error || "فشل إنهاء خدمة الموظف");
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: EmployeeStatus) => {
    switch (status) {
      case EmployeeStatus.ACTIVE:
        return <Badge className="bg-emerald-600 hover:bg-emerald-700">نشط</Badge>;
      case EmployeeStatus.ON_LEAVE:
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">في إجازة</Badge>;
      case EmployeeStatus.SUSPENDED:
        return <Badge variant="outline" className="text-muted-foreground">موقوف</Badge>;
      case EmployeeStatus.TERMINATED:
        return <Badge variant="destructive">منهي خدمته</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم، الكود، الهاتف..."
              className="ps-9"
            />
          </div>

          <Select value={selectedDept} onValueChange={(val) => setSelectedDept(val || "ALL")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="كل الأقسام" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">كل الأقسام</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val || "ALL")}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="كل الحالات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">كل الحالات</SelectItem>
              <SelectItem value={EmployeeStatus.ACTIVE}>نشط</SelectItem>
              <SelectItem value={EmployeeStatus.ON_LEAVE}>في إجازة</SelectItem>
              <SelectItem value={EmployeeStatus.SUSPENDED}>موقوف</SelectItem>
              <SelectItem value={EmployeeStatus.TERMINATED}>منهي خدمته</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {canManage && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 me-1.5" />
            إضافة موظف جديد
          </Button>
        )}
      </div>

      {/* Employees Table */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">الموظف</th>
                <th className="py-3 px-4 text-start">القسم والوظيفة</th>
                <th className="py-3 px-4 text-start">بيانات الاتصال</th>
                <th className="py-3 px-4 text-center">الحالة</th>
                <th className="py-3 px-4 text-end">الراتب الأساسي</th>
                <th className="py-3 px-4 text-end">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    لا يوجد موظفون مطابقون لشروط البحث
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <Link
                          href={`/hr/employees/${emp.id}`}
                          className="font-semibold text-foreground hover:underline hover:text-primary transition-colors cursor-pointer"
                        >
                          {emp.fullName}
                        </Link>
                        <span className="font-mono text-xs text-muted-foreground">{emp.code}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-xs flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {emp.department?.name || "-"}
                        </span>
                        <span className="text-muted-foreground text-xs flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {emp.position?.title || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono">
                      <div>{emp.phone || "-"}</div>
                      <div className="text-muted-foreground truncate max-w-[160px]">{emp.email || "-"}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(emp.status)}
                    </td>
                    <td className="py-3 px-4 text-end font-mono font-medium">
                      {maskSalary(emp.baseSalary, canViewSalary)}
                    </td>
                    <td className="py-3 px-4 text-end">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          asChild
                          title="عرض الملف"
                        >
                          <Link href={`/hr/employees/${emp.id}`}>
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        {canManage && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleEdit(emp)}
                              title="تعديل"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            {emp.status !== EmployeeStatus.TERMINATED && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteTarget(emp)}
                                title="إنهاء الخدمة"
                              >
                                <UserX className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </>
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

      <EmployeeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        departments={departments}
        positions={positions}
        users={users}
        employee={editingEmployee}
        canViewSalary={canViewSalary}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="تأكيد إنهاء خدمة الموظف"
        description={`هل أنت متأكد من إنهاء خدمة الموظف "${deleteTarget?.fullName}" (${deleteTarget?.code})؟ سيتم تغيير حالته إلى منهي خدمته.`}
        confirmText="نعم، إنهاء الخدمة"
        cancelText="إلغاء"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
