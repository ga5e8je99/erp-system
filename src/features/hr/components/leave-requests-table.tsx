"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import {
  Plus,
  Search,
  Check,
  X,
  Calendar,
  Layers,
  Edit2,
  Trash2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaveRequestItem, LeaveTypeItem } from "../types";
import { LeaveStatus } from "@prisma/client";
import { LeaveRequestDialog } from "./leave-request-dialog";
import { LeaveApprovalDialog } from "./leave-approval-dialog";
import { LeaveTypeDialog } from "./leave-type-dialog";
import { deleteLeaveTypeAction } from "../actions/leave-actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { calculateLeaveDays } from "../services/leave-calculations";

interface LeaveRequestsTableProps {
  leaveRequests: LeaveRequestItem[];
  leaveTypes: LeaveTypeItem[];
  employees: { id: string; name: string; code: string }[];
  canManage: boolean;
}

export function LeaveRequestsTable({
  leaveRequests,
  leaveTypes,
  employees,
  canManage,
}: LeaveRequestsTableProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  // Request modal states
  const [requestDialogOpen, setRequestDialogOpen] = React.useState(false);

  // Approval modal states
  const [approvalTarget, setApprovalTarget] = React.useState<LeaveRequestItem | null>(null);
  const [approvalMode, setApprovalMode] = React.useState<"APPROVE" | "REJECT">("APPROVE");
  const [approvalDialogOpen, setApprovalDialogOpen] = React.useState(false);

  // Leave Type states
  const [typeDialogOpen, setTypeDialogOpen] = React.useState(false);
  const [editingType, setEditingType] = React.useState<LeaveTypeItem | null>(null);
  const [deleteTypeTarget, setDeleteTypeTarget] = React.useState<LeaveTypeItem | null>(null);
  const [isDeletingType, setIsDeletingType] = React.useState(false);

  const filteredRequests = React.useMemo(() => {
    return leaveRequests.filter((req) => {
      if (statusFilter !== "ALL" && req.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchEmp = req.employee.fullName.toLowerCase().includes(q) || req.employee.code.toLowerCase().includes(q);
        const matchType = req.leaveType.name.toLowerCase().includes(q);
        const matchReason = req.reason?.toLowerCase().includes(q);
        if (!matchEmp && !matchType && !matchReason) return false;
      }
      return true;
    });
  }, [leaveRequests, statusFilter, search]);

  const handleOpenApproval = (req: LeaveRequestItem, mode: "APPROVE" | "REJECT") => {
    setApprovalTarget(req);
    setApprovalMode(mode);
    setApprovalDialogOpen(true);
  };

  const handleDeleteType = async () => {
    if (!deleteTypeTarget) return;
    setIsDeletingType(true);
    try {
      const res = await deleteLeaveTypeAction(deleteTypeTarget.id);
      if (res.ok) {
        toast.success("تم حذف نوع الإجازة بنجاح");
        setDeleteTypeTarget(null);
        router.refresh();
      } else {
        toast.error(res.error || "فشل حذف نوع الإجازة");
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsDeletingType(false);
    }
  };

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case LeaveStatus.APPROVED:
        return <Badge className="bg-emerald-600 hover:bg-emerald-700">معتمدة</Badge>;
      case LeaveStatus.REJECTED:
        return <Badge variant="destructive">مرفوضة</Badge>;
      case LeaveStatus.PENDING:
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">قيد المراجعة</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="requests" className="w-full">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2">
          <TabsList>
            <TabsTrigger value="requests" className="gap-1.5">
              <Calendar className="h-4 w-4" />
              طلبات الإجازات
              <Badge variant="secondary" className="font-mono text-xs ms-1">
                {leaveRequests.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="types" className="gap-1.5">
              <Layers className="h-4 w-4" />
              أنواع الإجازات واللوائح
              <Badge variant="secondary" className="font-mono text-xs ms-1">
                {leaveTypes.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <Button onClick={() => setRequestDialogOpen(true)}>
            <Plus className="h-4 w-4 me-1.5" />
            تقديم طلب إجازة
          </Button>
        </div>

        {/* TAB 1: REQUESTS */}
        <TabsContent value="requests" className="space-y-4 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[220px] flex-1 max-w-sm">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث باسم الموظف أو نوع الإجازة..."
                  className="ps-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "ALL")}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="كل الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">كل الحالات</SelectItem>
                  <SelectItem value={LeaveStatus.PENDING}>قيد المراجعة</SelectItem>
                  <SelectItem value={LeaveStatus.APPROVED}>معتمدة</SelectItem>
                  <SelectItem value={LeaveStatus.REJECTED}>مرفوضة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-start">
                <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-start">الموظف</th>
                    <th className="py-3 px-4 text-start">نوع الإجازة</th>
                    <th className="py-3 px-4 text-start">الفترة المطلوبة</th>
                    <th className="py-3 px-4 text-center">المدة</th>
                    <th className="py-3 px-4 text-start">السبب / الملاحظات</th>
                    <th className="py-3 px-4 text-center">الحالة</th>
                    <th className="py-3 px-4 text-end">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        لا توجد طلبات إجازة مطابقة لشروط البحث
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => {
                      const days = calculateLeaveDays(req.startDate, req.endDate);
                      return (
                        <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-xs sm:text-sm">
                                {req.employee.fullName}
                              </span>
                              <span className="font-mono text-xs text-muted-foreground">
                                {req.employee.code}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">{req.leaveType.name}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {req.leaveType.isPaid ? "مدفوعة" : "بدون أجر"}
                              </Badge>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs">
                            {new Date(req.startDate).toLocaleDateString("ar-EG")} إلى{" "}
                            {new Date(req.endDate).toLocaleDateString("ar-EG")}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant="secondary" className="font-mono">
                              {days} يوم
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs">
                            <div>{req.reason || "-"}</div>
                            {req.rejectionReason && (
                              <div className="text-destructive font-semibold mt-0.5">
                                سبب الرفض: {req.rejectionReason}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {getStatusBadge(req.status)}
                          </td>
                          <td className="py-3 px-4 text-end">
                            {req.status === LeaveStatus.PENDING && canManage ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                                  onClick={() => handleOpenApproval(req, "APPROVE")}
                                >
                                  <Check className="h-4 w-4 me-1" />
                                  اعتماد
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-destructive hover:bg-destructive/10"
                                  onClick={() => handleOpenApproval(req, "REJECT")}
                                >
                                  <X className="h-4 w-4 me-1" />
                                  رفض
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: LEAVE TYPES */}
        <TabsContent value="types" className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              تعريف أنواع الإجازات السنوية والرصيد المستحق لكل نوع
            </p>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingType(null);
                  setTypeDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 me-1.5" />
                إضافة نوع إجازة
              </Button>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-start">
                <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-start">نوع الإجازة</th>
                    <th className="py-3 px-4 text-center">الرصيد السنوي</th>
                    <th className="py-3 px-4 text-center">طبيعة الأجر</th>
                    <th className="py-3 px-4 text-center">الطلبات المسجلة</th>
                    <th className="py-3 px-4 text-end">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leaveTypes.map((type) => (
                    <tr key={type.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-semibold">{type.name}</td>
                      <td className="py-3 px-4 text-center font-mono font-medium">
                        {type.daysAllowed} يوم
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={type.isPaid ? "secondary" : "outline"}>
                          {type.isPaid ? "مدفوعة الأجر" : "بدون أجر"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-xs">
                        <Badge variant="outline">{type._count?.leaveRequests || 0}</Badge>
                      </td>
                      <td className="py-3 px-4 text-end">
                        {canManage && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setEditingType(type);
                                setTypeDialogOpen(true);
                              }}
                              title="تعديل"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTypeTarget(type)}
                              title="حذف"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <LeaveRequestDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        employees={employees}
        leaveTypes={leaveTypes}
      />

      <LeaveApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        request={approvalTarget}
        mode={approvalMode}
      />

      <LeaveTypeDialog
        open={typeDialogOpen}
        onOpenChange={setTypeDialogOpen}
        leaveType={editingType}
      />

      <ConfirmDialog
        open={Boolean(deleteTypeTarget)}
        onOpenChange={(open) => !open && setDeleteTypeTarget(null)}
        title="تأكيد حذف نوع الإجازة"
        description={`هل أنت متأكد من حذف نوع الإجازة "${deleteTypeTarget?.name}"؟ لا يمكن الحذف إذا كانت هناك طلبات إجازة مسجلة به.`}
        confirmText="نعم، احذف نوع الإجازة"
        cancelText="إلغاء"
        variant="destructive"
        isLoading={isDeletingType}
        onConfirm={handleDeleteType}
      />
    </div>
  );
}
