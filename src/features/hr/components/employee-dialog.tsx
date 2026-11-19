"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeStatus, Prisma } from "@prisma/client";
import { employeeSchema, EmployeeFormData } from "../schemas";
import { createEmployeeAction, updateEmployeeAction } from "../actions/employee-actions";

interface EmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: { id: string; name: string }[];
  positions: { id: string; title: string; departmentId: string | null }[];
  users?: { id: string; name: string; email: string }[];
  employee?: {
    id: string;
    fullName: string;
    nationalId: string | null;
    phone: string | null;
    email: string | null;
    hireDate: Date;
    departmentId: string;
    positionId: string;
    baseSalary: number | string | Prisma.Decimal;
    allowances: number | string | Prisma.Decimal;
    status: EmployeeStatus;
    userId: string | null;
    notes?: string | null;
    documentsNote?: string | null;
  } | null;
  canViewSalary?: boolean;
}

export function EmployeeDialog({
  open,
  onOpenChange,
  departments,
  positions,
  users = [],
  employee,
  canViewSalary = true,
}: EmployeeDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      fullName: "",
      nationalId: "",
      phone: "",
      email: "",
      hireDate: new Date(),
      departmentId: "",
      positionId: "",
      baseSalary: 0,
      allowances: 0,
      status: EmployeeStatus.ACTIVE,
      userId: "",
      notes: "",
      documentsNote: "",
    },
  });

  const selectedDept = watch("departmentId");
  const selectedPos = watch("positionId");
  const selectedStatus = watch("status");
  const selectedUser = watch("userId");
  const hireDateVal = watch("hireDate");

  // Filter positions by selected department
  const filteredPositions = React.useMemo(() => {
    if (!selectedDept) return positions;
    return positions.filter(
      (p) => !p.departmentId || p.departmentId === selectedDept
    );
  }, [positions, selectedDept]);

  React.useEffect(() => {
    if (employee) {
      reset({
        fullName: employee.fullName,
        nationalId: employee.nationalId || "",
        phone: employee.phone || "",
        email: employee.email || "",
        hireDate: new Date(employee.hireDate),
        departmentId: employee.departmentId,
        positionId: employee.positionId,
        baseSalary: Number(employee.baseSalary) || 0,
        allowances: Number(employee.allowances) || 0,
        status: employee.status,
        userId: employee.userId || "",
        notes: employee.notes || "",
        documentsNote: employee.documentsNote || "",
      });
    } else {
      reset({
        fullName: "",
        nationalId: "",
        phone: "",
        email: "",
        hireDate: new Date(),
        departmentId: departments[0]?.id || "",
        positionId: positions[0]?.id || "",
        baseSalary: 0,
        allowances: 0,
        status: EmployeeStatus.ACTIVE,
        userId: "",
        notes: "",
        documentsNote: "",
      });
    }
  }, [employee, departments, positions, reset, open]);

  const onSubmit = async (data: EmployeeFormData) => {
    setIsSubmitting(true);
    try {
      if (employee) {
        const res = await updateEmployeeAction(employee.id, data);
        if (res.ok) {
          toast.success("تم تحديث بيانات الموظف بنجاح");
          onOpenChange(false);
          router.refresh();
        } else {
          toast.error(res.error || "فشل تحديث بيانات الموظف");
        }
      } else {
        const res = await createEmployeeAction(data);
        if (res.ok) {
          toast.success("تم إضافة الموظف بنجاح");
          onOpenChange(false);
          router.refresh();
        } else {
          toast.error(res.error || "فشل إضافة الموظف");
        }
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              {employee ? "تعديل بيانات الموظف" : "إضافة موظف جديد"}
            </DialogTitle>
            <DialogDescription>
              أدخل كافة البيانات الشخصية والوظيفية والمالية للموظف
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="personal" className="w-full mt-4">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="personal">البيانات الشخصية</TabsTrigger>
              <TabsTrigger value="job">الوظيفة والتعيين</TabsTrigger>
              <TabsTrigger value="salary">الراتب والبدلات</TabsTrigger>
              <TabsTrigger value="documents">المستندات والملاحظات</TabsTrigger>
            </TabsList>

            {/* TAB 1: PERSONAL */}
            <TabsContent value="personal" className="space-y-4 py-3">
              <div className="space-y-2">
                <Label htmlFor="emp-name">الاسم الكامل *</Label>
                <Input
                  id="emp-name"
                  placeholder="الاسم الرباعي للموظف"
                  {...register("fullName")}
                  disabled={isSubmitting}
                />
                {errors.fullName && (
                  <p className="text-xs text-destructive">{errors.fullName.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="emp-nid">الرقم القومي / الهوية</Label>
                  <Input
                    id="emp-nid"
                    placeholder="14 رقم"
                    {...register("nationalId")}
                    disabled={isSubmitting}
                    className="font-mono"
                  />
                  {errors.nationalId && (
                    <p className="text-xs text-destructive">{errors.nationalId.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emp-phone">رقم الهاتف</Label>
                  <Input
                    id="emp-phone"
                    placeholder="+20 10 ..."
                    {...register("phone")}
                    disabled={isSubmitting}
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emp-email">البريد الإلكتروني</Label>
                <Input
                  id="emp-email"
                  type="email"
                  placeholder="employee@company.com"
                  {...register("email")}
                  disabled={isSubmitting}
                  dir="ltr"
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
            </TabsContent>

            {/* TAB 2: JOB */}
            <TabsContent value="job" className="space-y-4 py-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>القسم الإداري *</Label>
                  <Select
                    value={selectedDept}
                    onValueChange={(val) => {
                      setValue("departmentId", val || "");
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر القسم" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.departmentId && (
                    <p className="text-xs text-destructive">{errors.departmentId.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>المسمى الوظيفي *</Label>
                  <Select
                    value={selectedPos}
                    onValueChange={(val) => setValue("positionId", val || "")}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المسمى الوظيفي" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPositions.map((pos) => (
                        <SelectItem key={pos.id} value={pos.id}>
                          {pos.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.positionId && (
                    <p className="text-xs text-destructive">{errors.positionId.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="emp-hiredate">تاريخ التعيين *</Label>
                  <Input
                    id="emp-hiredate"
                    type="date"
                    value={
                      hireDateVal instanceof Date && !isNaN(hireDateVal.getTime())
                        ? hireDateVal.toISOString().slice(0, 10)
                        : ""
                    }
                    onChange={(e) => {
                      const d = e.target.value ? new Date(e.target.value) : new Date();
                      setValue("hireDate", d);
                    }}
                    disabled={isSubmitting}
                  />
                  {errors.hireDate && (
                    <p className="text-xs text-destructive">{errors.hireDate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>حالة الموظف</Label>
                  <Select
                    value={selectedStatus}
                    onValueChange={(val) =>
                      setValue("status", (val as EmployeeStatus) || EmployeeStatus.ACTIVE)
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EmployeeStatus.ACTIVE}>نشط وعلى رأس العمل</SelectItem>
                      <SelectItem value={EmployeeStatus.ON_LEAVE}>في إجازة</SelectItem>
                      <SelectItem value={EmployeeStatus.SUSPENDED}>موقوف عن العمل</SelectItem>
                      <SelectItem value={EmployeeStatus.TERMINATED}>منهي خدمته</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {users.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <Label>ربط بحساب مستخدم في النظام (اختياري)</Label>
                  <Select
                    value={selectedUser || "NONE"}
                    onValueChange={(val) => setValue("userId", val === "NONE" ? null : val)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر حساب مستخدم" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">بدون حساب مستخدم</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>

            {/* TAB 3: SALARY */}
            <TabsContent value="salary" className="space-y-4 py-3">
              {!canViewSalary ? (
                <div className="p-4 bg-muted/60 rounded-md border text-center text-sm text-muted-foreground">
                  🔒 ليس لديك صلاحية عرض وتعديل بيانات الراتب (hr.salary.view). يرجى مراجعة المسؤول.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="emp-salary">الراتب الأساسي الشهري (ج.م) *</Label>
                    <Input
                      id="emp-salary"
                      type="number"
                      step="0.01"
                      min="0"
                      {...register("baseSalary", { valueAsNumber: true })}
                      disabled={isSubmitting}
                      className="font-mono text-end"
                    />
                    {errors.baseSalary && (
                      <p className="text-xs text-destructive">{errors.baseSalary.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emp-allowances">البدلات والحوافز الشهرية (ج.م)</Label>
                    <Input
                      id="emp-allowances"
                      type="number"
                      step="0.01"
                      min="0"
                      {...register("allowances", { valueAsNumber: true })}
                      disabled={isSubmitting}
                      className="font-mono text-end"
                    />
                    {errors.allowances && (
                      <p className="text-xs text-destructive">{errors.allowances.message}</p>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB 4: DOCUMENTS & NOTES */}
            <TabsContent value="documents" className="space-y-4 py-3">
              <div className="space-y-2">
                <Label htmlFor="emp-docs">ملاحظات المستندات وأوراق التعيين</Label>
                <Textarea
                  id="emp-docs"
                  placeholder="ملاحظات أصول المستندات المستلمة (شهادة الميلاد، المؤهل، الموقف التجنيدي، فيش وتشبيه...)"
                  {...register("documentsNote")}
                  disabled={isSubmitting}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emp-notes">ملاحظات عامة</Label>
                <Textarea
                  id="emp-notes"
                  placeholder="أي ملاحظات إدارية أخرى حول الموظف..."
                  {...register("notes")}
                  disabled={isSubmitting}
                  rows={3}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "جاري الحفظ..." : employee ? "حفظ التعديلات" : "إضافة الموظف"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
