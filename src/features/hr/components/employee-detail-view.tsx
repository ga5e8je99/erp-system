"use client";

import * as React from "react";
import { useRouter } from "@/i18n/routing";
import {
  ArrowRight,
  Edit2,
  Calendar,
  Building2,
  Briefcase,
  Phone,
  Mail,
  CreditCard,
  FileText,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeDetail, LeaveBalanceSummary } from "../types";
import { EmployeeStatus, AttendanceStatus, LeaveStatus } from "@prisma/client";
import { EmployeeDialog } from "./employee-dialog";
import { maskSalary } from "../utils/mask-salary";

interface EmployeeDetailViewProps {
  employee: EmployeeDetail;
  leaveBalances: LeaveBalanceSummary[];
  departments: { id: string; name: string }[];
  positions: { id: string; title: string; departmentId: string | null }[];
  users?: { id: string; name: string; email: string }[];
  canViewSalary: boolean;
  canManage: boolean;
}

export function EmployeeDetailView({
  employee,
  leaveBalances,
  departments,
  positions,
  users = [],
  canViewSalary,
  canManage,
}: EmployeeDetailViewProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // Calculate attendance summary stats
  const attendances = employee.attendances || [];
  const totalDays = attendances.length;
  const presentCount = attendances.filter((a) => a.status === AttendanceStatus.PRESENT).length;
  const absentCount = attendances.filter((a) => a.status === AttendanceStatus.ABSENT).length;
  const lateCount = attendances.filter((a) => a.status === AttendanceStatus.LATE).length;

  const getAttendanceBadge = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return <Badge className="bg-emerald-600">حاضر</Badge>;
      case AttendanceStatus.ABSENT:
        return <Badge variant="destructive">غائب</Badge>;
      case AttendanceStatus.LATE:
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">متأخر</Badge>;
      case AttendanceStatus.HALF_DAY:
        return <Badge variant="outline">نصف يوم</Badge>;
      case AttendanceStatus.ON_LEAVE:
        return <Badge variant="secondary">في إجازة</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLeaveStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case LeaveStatus.APPROVED:
        return <Badge className="bg-emerald-600">معتمدة</Badge>;
      case LeaveStatus.REJECTED:
        return <Badge variant="destructive">مرفوضة</Badge>;
      case LeaveStatus.PENDING:
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">قيد المراجعة</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/hr/employees")}
            className="h-9 w-9"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{employee.fullName}</h2>
              <Badge variant="outline" className="font-mono text-xs">
                {employee.code}
              </Badge>
              {employee.status === EmployeeStatus.ACTIVE && (
                <Badge className="bg-emerald-600">نشط</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {employee.department?.name}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {employee.position?.title}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                تاريخ التعيين: {new Date(employee.hireDate).toLocaleDateString("ar-EG")}
              </span>
            </p>
          </div>
        </div>

        {canManage && (
          <Button onClick={() => setDialogOpen(true)}>
            <Edit2 className="h-4 w-4 me-1.5" />
            تعديل بيانات الموظف
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="attendance">الحضور والانصراف</TabsTrigger>
          <TabsTrigger value="leave">رصيد الإجازات</TabsTrigger>
          <TabsTrigger value="payroll">سجل الرواتب</TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Personal Details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  البيانات الشخصية والاتصال
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">الرقم القومي / الهوية:</span>
                  <span className="font-mono font-medium">{employee.nationalId || "-"}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> رقم الهاتف:
                  </span>
                  <span className="font-mono font-medium" dir="ltr">{employee.phone || "-"}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> البريد الإلكتروني:
                  </span>
                  <span className="font-mono font-medium" dir="ltr">{employee.email || "-"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> حساب المستخدم المرتبط:
                  </span>
                  <span className="font-medium">
                    {employee.user ? `${employee.user.name} (${employee.user.email})` : "غير مرتبط"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Salary & Compensation */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  البيانات المالية والتعويضات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">الراتب الأساسي الشهري:</span>
                  <span className="font-mono font-bold text-base">
                    {maskSalary(employee.baseSalary, canViewSalary)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">البدلات والحوافز الشهرية:</span>
                  <span className="font-mono font-semibold">
                    {maskSalary(employee.allowances, canViewSalary)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">إجمالي الاستحقاق الشهري:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {canViewSalary
                      ? maskSalary(
                          Number(employee.baseSalary) + Number(employee.allowances || 0),
                          true
                        )
                      : "••••••"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes and Documents */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  ملاحظات أوراق ومستندات التعيين
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {employee.documentsNote || "لا توجد ملاحظات مسجلة لمستندات التعيين."}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  ملاحظات عامة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {employee.notes || "لا توجد ملاحظات عامة مسجلة."}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: ATTENDANCE */}
        <TabsContent value="attendance" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Card className="p-3">
              <span className="text-xs text-muted-foreground">إجمالي الأيام المسجلة</span>
              <p className="text-xl font-bold font-mono mt-1">{totalDays}</p>
            </Card>
            <Card className="p-3">
              <span className="text-xs text-muted-foreground">أيام الحضور</span>
              <p className="text-xl font-bold font-mono text-emerald-600 mt-1">{presentCount}</p>
            </Card>
            <Card className="p-3">
              <span className="text-xs text-muted-foreground">أيام الغياب</span>
              <p className="text-xl font-bold font-mono text-destructive mt-1">{absentCount}</p>
            </Card>
            <Card className="p-3">
              <span className="text-xs text-muted-foreground">أيام التأخير</span>
              <p className="text-xl font-bold font-mono text-amber-600 mt-1">{lateCount}</p>
            </Card>
          </div>

          <div className="border rounded-lg overflow-hidden bg-card">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-semibold">
                <tr>
                  <th className="py-2.5 px-4 text-start">التاريخ</th>
                  <th className="py-2.5 px-4 text-start">الحالة</th>
                  <th className="py-2.5 px-4 text-start">وقت الحضور</th>
                  <th className="py-2.5 px-4 text-start">وقت الانصراف</th>
                  <th className="py-2.5 px-4 text-start">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attendances.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      لا توجد سجلات حضور مسجلة لهذا الموظف
                    </td>
                  </tr>
                ) : (
                  attendances.map((att) => (
                    <tr key={att.id} className="hover:bg-muted/40">
                      <td className="py-2.5 px-4 font-mono text-xs">
                        {new Date(att.date).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="py-2.5 px-4">{getAttendanceBadge(att.status)}</td>
                      <td className="py-2.5 px-4 font-mono text-xs">
                        {att.checkIn ? new Date(att.checkIn).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "-"}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs">
                        {att.checkOut ? new Date(att.checkOut).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "-"}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-muted-foreground">{att.notes || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* TAB 3: LEAVE */}
        <TabsContent value="leave" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {leaveBalances.map((b) => (
              <Card key={b.leaveTypeId} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-sm">{b.leaveTypeName}</h4>
                    <span className="text-xs text-muted-foreground">
                      الرصيد السنوي: {b.daysAllowed} يوم
                    </span>
                  </div>
                  <Badge variant="outline">{b.isPaid ? "مدفوعة" : "غير مدفوعة"}</Badge>
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between items-center text-xs">
                  <span>المستهلك: <strong className="font-mono text-muted-foreground">{b.usedDays}</strong></span>
                  <span>المتبقي: <strong className="font-mono text-emerald-600 text-sm">{b.remainingDays}</strong> يوم</span>
                </div>
              </Card>
            ))}
          </div>

          <div className="border rounded-lg overflow-hidden bg-card">
            <div className="p-3 bg-muted/30 border-b font-semibold text-xs">
              سجل طلبات الإجازة للموظف
            </div>
            <table className="w-full text-sm text-start">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-semibold">
                <tr>
                  <th className="py-2.5 px-4 text-start">نوع الإجازة</th>
                  <th className="py-2.5 px-4 text-start">من</th>
                  <th className="py-2.5 px-4 text-start">إلى</th>
                  <th className="py-2.5 px-4 text-start">السبب</th>
                  <th className="py-2.5 px-4 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(!employee.leaveRequests || employee.leaveRequests.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      لا توجد طلبات إجازة مسجلة
                    </td>
                  </tr>
                ) : (
                  employee.leaveRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-muted/40">
                      <td className="py-2.5 px-4 font-medium">{req.leaveType.name}</td>
                      <td className="py-2.5 px-4 font-mono text-xs">
                        {new Date(req.startDate).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs">
                        {new Date(req.endDate).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-muted-foreground max-w-xs truncate">
                        {req.reason || "-"}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {getLeaveStatusBadge(req.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* TAB 4: PAYROLL */}
        <TabsContent value="payroll" className="space-y-4 pt-4">
          <div className="border rounded-lg overflow-hidden bg-card">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-semibold">
                <tr>
                  <th className="py-2.5 px-4 text-start">رقم المسير</th>
                  <th className="py-2.5 px-4 text-start">الشهر / السنة</th>
                  <th className="py-2.5 px-4 text-end">الأساسي</th>
                  <th className="py-2.5 px-4 text-end">البدلات</th>
                  <th className="py-2.5 px-4 text-end">الاستقطاعات</th>
                  <th className="py-2.5 px-4 text-end">صافي الراتب</th>
                  <th className="py-2.5 px-4 text-center">حالة الصرف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(!employee.payslips || employee.payslips.length === 0) ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      لا توجد مفردات رواتب سابقة مسجلة للموظف
                    </td>
                  </tr>
                ) : (
                  employee.payslips.map((ps) => (
                    <tr key={ps.id} className="hover:bg-muted/40">
                      <td className="py-2.5 px-4 font-mono text-xs">
                        {ps.payrollRun ? (
                          <Badge variant="outline">{ps.payrollRun.runNumber}</Badge>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs">
                        {ps.payrollRun ? `${ps.payrollRun.month} / ${ps.payrollRun.year}` : "-"}
                      </td>
                      <td className="py-2.5 px-4 text-end font-mono">
                        {maskSalary(ps.baseSalary, canViewSalary)}
                      </td>
                      <td className="py-2.5 px-4 text-end font-mono">
                        {maskSalary(ps.allowances, canViewSalary)}
                      </td>
                      <td className="py-2.5 px-4 text-end font-mono text-destructive">
                        {maskSalary(ps.deductions, canViewSalary)}
                      </td>
                      <td className="py-2.5 px-4 text-end font-mono font-bold text-emerald-600">
                        {maskSalary(ps.netSalary, canViewSalary)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {ps.isPaid ? (
                          <Badge className="bg-emerald-600">مدفوع</Badge>
                        ) : (
                          <Badge variant="outline">غير مدفوع</Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <EmployeeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        departments={departments}
        positions={positions}
        users={users}
        employee={employee}
        canViewSalary={canViewSalary}
      />
    </div>
  );
}
