"use client";

import * as React from "react";
import { Link } from "@/i18n/routing";
import {
  Plus,
  Eye,
  Calendar,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PayrollRunListItem } from "../types";
import { PayrollStatus } from "@prisma/client";
import { GeneratePayrollDialog } from "./generate-payroll-dialog";
import { maskSalary } from "../utils/mask-salary";

interface PayrollRunsTableProps {
  runs: PayrollRunListItem[];
  canViewSalary: boolean;
  canManage: boolean;
}

const MONTH_NAMES = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

export function PayrollRunsTable({
  runs,
  canViewSalary,
  canManage,
}: PayrollRunsTableProps) {
  const [generateOpen, setGenerateOpen] = React.useState(false);

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-base">مسيرات الرواتب الشهرية</h3>
          <Badge variant="secondary" className="font-mono">
            {runs.length}
          </Badge>
        </div>

        {canManage && (
          <Button onClick={() => setGenerateOpen(true)}>
            <Plus className="h-4 w-4 me-1.5" />
            توليد مسير رواتب جديد
          </Button>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">رقم المسير</th>
                <th className="py-3 px-4 text-start">فترة الاستحقاق</th>
                <th className="py-3 px-4 text-center">عدد الموظفين</th>
                <th className="py-3 px-4 text-end">إجمالي الأساسي</th>
                <th className="py-3 px-4 text-end">إجمالي الاستقطاعات</th>
                <th className="py-3 px-4 text-end">صافي الرواتب</th>
                <th className="py-3 px-4 text-center">الحالة</th>
                <th className="py-3 px-4 text-end">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    لا توجد مسيرات رواتب مسجلة حتى الآن
                  </td>
                </tr>
              ) : (
                runs.map((run) => {
                  const monthName = MONTH_NAMES[run.month - 1] || run.month;
                  return (
                    <tr key={run.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="font-mono text-xs">
                          {run.runNumber}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{monthName} {run.year}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-xs">
                        <Badge variant="secondary">{run._count?.payslips || 0}</Badge>
                      </td>
                      <td className="py-3 px-4 text-end font-mono">
                        {maskSalary(run.totalBaseSalary, canViewSalary)}
                      </td>
                      <td className="py-3 px-4 text-end font-mono text-destructive">
                        {maskSalary(run.totalDeductions, canViewSalary)}
                      </td>
                      <td className="py-3 px-4 text-end font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {maskSalary(run.totalNetSalary, canViewSalary)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(run.status)}
                      </td>
                      <td className="py-3 px-4 text-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1.5"
                          asChild
                        >
                          <Link href={`/hr/payroll/${run.id}`}>
                            <Eye className="h-3.5 w-3.5" />
                            مراجعة وتفاصيل
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <GeneratePayrollDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
      />
    </div>
  );
}
