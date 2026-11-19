"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter, Link } from "@/i18n/routing";
import {
  ArrowRight,
  CheckCircle,
  CreditCard,
  Printer,
  Receipt,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PayrollRunDetail } from "../types";
import { PayrollStatus } from "@prisma/client";
import { approvePayrollRunAction } from "../actions/payroll-actions";
import { PayPayrollDialog } from "./pay-payroll-dialog";
import { maskSalary } from "../utils/mask-salary";

interface PayrollRunDetailViewProps {
  run: PayrollRunDetail;
  paymentAccounts: { id: string; code: string; name: string }[];
  canViewSalary: boolean;
  canManage: boolean;
}

const MONTH_NAMES = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

export function PayrollRunDetailView({
  run,
  paymentAccounts,
  canViewSalary,
  canManage,
}: PayrollRunDetailViewProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [approveConfirmOpen, setApproveConfirmOpen] = React.useState(false);
  const [isApproving, setIsApproving] = React.useState(false);
  const [payDialogOpen, setPayDialogOpen] = React.useState(false);

  const monthName = MONTH_NAMES[run.month - 1] || run.month;

  const filteredPayslips = React.useMemo(() => {
    if (!search.trim()) return run.payslips;
    const q = search.trim().toLowerCase();
    return run.payslips.filter(
      (ps) =>
        ps.employee.fullName.toLowerCase().includes(q) ||
        ps.employee.code.toLowerCase().includes(q) ||
        ps.employee.department.name.toLowerCase().includes(q) ||
        ps.employee.position.title.toLowerCase().includes(q)
    );
  }, [run.payslips, search]);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const res = await approvePayrollRunAction(run.id);
      if (res.ok) {
        toast.success("تم اعتماد مسير الرواتب وترحيل قيد الاستحقاق المحاسبي بنجاح");
        setApproveConfirmOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || "فشل اعتماد مسير الرواتب");
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsApproving(false);
    }
  };

  const getStatusBadge = (status: PayrollStatus) => {
    switch (status) {
      case PayrollStatus.PAID:
        return <Badge className="bg-emerald-600 hover:bg-emerald-700">تم الصرف</Badge>;
      case PayrollStatus.APPROVED:
        return <Badge className="bg-blue-600 hover:bg-blue-700">معتمد ومرحل</Badge>;
      case PayrollStatus.DRAFT:
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">مسودة مراجعة</Badge>;
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
            onClick={() => router.push("/hr/payroll")}
            className="h-9 w-9"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">
                مسير رواتب شهر {monthName} {run.year}
              </h2>
              <Badge variant="outline" className="font-mono text-xs">
                {run.runNumber}
              </Badge>
              {getStatusBadge(run.status)}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
              <span>تاريخ الاحتساب: {run.processedAt ? new Date(run.processedAt).toLocaleDateString("ar-EG") : "-"}</span>
              {run.approvedAt && (
                <span>• تاريخ الاعتماد: {new Date(run.approvedAt).toLocaleDateString("ar-EG")}</span>
              )}
              {run.paidAt && (
                <span>• تاريخ الصرف: {new Date(run.paidAt).toLocaleDateString("ar-EG")}</span>
              )}
            </p>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            {run.status === PayrollStatus.DRAFT && (
              <Button
                onClick={() => setApproveConfirmOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="h-4 w-4 me-1.5" />
                اعتماد المسير وترحيل القيد
              </Button>
            )}

            {run.status === PayrollStatus.APPROVED && (
              <Button
                onClick={() => setPayDialogOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CreditCard className="h-4 w-4 me-1.5" />
                صرف الرواتب وترحيل السداد
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-xs text-muted-foreground">إجمالي الراتب الأساسي</span>
          <p className="text-xl font-bold font-mono mt-1">
            {maskSalary(run.totalBaseSalary, canViewSalary)}
          </p>
        </Card>

        <Card className="p-4">
          <span className="text-xs text-muted-foreground">إجمالي البدلات والحوافز</span>
          <p className="text-xl font-bold font-mono text-blue-600 mt-1">
            {maskSalary(run.totalAllowances, canViewSalary)}
          </p>
        </Card>

        <Card className="p-4">
          <span className="text-xs text-muted-foreground">إجمالي الاستقطاعات (غياب وتأخير)</span>
          <p className="text-xl font-bold font-mono text-destructive mt-1">
            {maskSalary(run.totalDeductions, canViewSalary)}
          </p>
        </Card>

        <Card className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
          <span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
            إجمالي صافي الرواتب المستحقة
          </span>
          <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {maskSalary(run.totalNetSalary, canViewSalary)}
          </p>
        </Card>
      </div>

      {/* Accounting Link Alerts */}
      {(run.journalEntryId || run.paymentJournalEntryId) && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg border text-xs">
          <span className="font-semibold">القيود المحاسبية المرتبطة:</span>
          {run.journalEntryId && (
            <Badge variant="outline" className="font-mono">
              قيد الاستحقاق: #{run.journalEntryId.slice(-6)}
            </Badge>
          )}
          {run.paymentJournalEntryId && (
            <Badge variant="outline" className="font-mono">
              قيد الصرف: #{run.paymentJournalEntryId.slice(-6)}
            </Badge>
          )}
        </div>
      )}

      {/* Payslips Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            مفردات رواتب الموظفين ({run.payslips.length})
          </h3>
          <div className="relative w-64">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في مفردات المرتب..."
              className="ps-9 h-9 text-xs"
            />
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-semibold">
                <tr>
                  <th className="py-3 px-4 text-start">الموظف</th>
                  <th className="py-3 px-4 text-start">القسم والوظيفة</th>
                  <th className="py-3 px-4 text-end">الراتب الأساسي</th>
                  <th className="py-3 px-4 text-end">البدلات</th>
                  <th className="py-3 px-4 text-center">أيام الغياب</th>
                  <th className="py-3 px-4 text-center">أيام التأخير</th>
                  <th className="py-3 px-4 text-end">الاستقطاعات</th>
                  <th className="py-3 px-4 text-end">صافي الراتب</th>
                  <th className="py-3 px-4 text-center">الحالة</th>
                  <th className="py-3 px-4 text-end">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPayslips.map((ps) => (
                  <tr key={ps.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs sm:text-sm">{ps.employee.fullName}</span>
                        <span className="font-mono text-xs text-muted-foreground">{ps.employee.code}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      <div>{ps.employee.department.name}</div>
                      <div>{ps.employee.position.title}</div>
                    </td>
                    <td className="py-3 px-4 text-end font-mono">
                      {maskSalary(ps.baseSalary, canViewSalary)}
                    </td>
                    <td className="py-3 px-4 text-end font-mono">
                      {maskSalary(ps.allowances, canViewSalary)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {ps.absenceDays > 0 ? (
                        <Badge variant="destructive" className="font-mono text-xs">
                          {ps.absenceDays}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {ps.lateDays > 0 ? (
                        <Badge variant="secondary" className="font-mono text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          {ps.lateDays}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-end font-mono text-destructive">
                      {maskSalary(ps.deductions, canViewSalary)}
                    </td>
                    <td className="py-3 px-4 text-end font-mono font-bold text-emerald-600">
                      {maskSalary(ps.netSalary, canViewSalary)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {ps.isPaid ? (
                        <Badge className="bg-emerald-600">مدفوع</Badge>
                      ) : (
                        <Badge variant="outline">غير مدفوع</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        asChild
                      >
                        <Link href={`/hr/payroll/${run.id}/payslips/${ps.id}/print`}>
                          <Printer className="h-3.5 w-3.5" />
                          طباعة
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Approve Confirmation Dialog */}
      <ConfirmDialog
        open={approveConfirmOpen}
        onOpenChange={setApproveConfirmOpen}
        title="تأكيد اعتماد مسير الرواتب وترحيل القيد"
        description={`هل أنت متأكد من اعتماد مسير رواتب شهر ${monthName} ${run.year} بمبلغ إجمالي ${canViewSalary ? maskSalary(run.totalNetSalary, true) : "صافي المسير"}؟ سيتم ترحيل قيد استحقاق في الحسابات العامة (مدين: مصروفات الرواتب والأجور - دائن: مستحقات الرواتب والأجور).`}
        confirmText="نعم، اعتمد المسير ورحّل القيد"
        cancelText="إلغاء"
        variant="default"
        isLoading={isApproving}
        onConfirm={handleApprove}
      />

      {/* Pay Payroll Dialog */}
      <PayPayrollDialog
        open={payDialogOpen}
        onOpenChange={setPayDialogOpen}
        runId={run.id}
        runNumber={run.runNumber}
        totalNetSalary={Number(run.totalNetSalary)}
        paymentAccounts={paymentAccounts}
      />
    </div>
  );
}
