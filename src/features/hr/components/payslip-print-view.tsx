"use client";

import * as React from "react";
import { useRouter } from "@/i18n/routing";
import { Printer, ArrowRight, Building2 } from "lucide-react";
import { Prisma } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatSalary, maskSalary } from "../utils/mask-salary";

interface PayslipPrintViewProps {
  payslip: {
    id: string;
    payrollRunId: string;
    employeeId: string;
    baseSalary: number | string | Prisma.Decimal;
    allowances: number | string | Prisma.Decimal;
    deductions: number | string | Prisma.Decimal;
    absenceDays: number;
    lateDays: number;
    netSalary: number | string | Prisma.Decimal;
    isPaid: boolean;
    notes: string | null;
    payrollRun: {
      id: string;
      runNumber: string;
      month: number;
      year: number;
      approvedAt: Date | null;
      paidAt: Date | null;
    };
    employee: {
      id: string;
      code: string;
      fullName: string;
      nationalId: string | null;
      hireDate: Date;
      department: { name: string };
      position: { title: string };
    };
  };
  companySettings?: {
    name: string;
    taxNumber: string | null;
    address: string | null;
    phone: string | null;
  } | null;
  canViewSalary: boolean;
}

const MONTH_NAMES = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

export function PayslipPrintView({
  payslip,
  companySettings,
  canViewSalary,
}: PayslipPrintViewProps) {
  const router = useRouter();

  const handlePrint = () => {
    window.print();
  };

  const monthName = MONTH_NAMES[payslip.payrollRun.month - 1] || payslip.payrollRun.month;
  const baseSalary = Number(payslip.baseSalary);
  const allowances = Number(payslip.allowances);
  const deductions = Number(payslip.deductions);
  const netSalary = Number(payslip.netSalary);
  const grossSalary = baseSalary + allowances;

  return (
    <div className="space-y-6">
      {/* Top Action Bar (Hidden in Print) */}
      <div className="print:hidden flex items-center justify-between p-4 bg-muted/40 border rounded-lg">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/hr/payroll/${payslip.payrollRunId}`)}
          className="gap-1.5"
        >
          <ArrowRight className="h-4 w-4" />
          رجوع لمسير الرواتب
        </Button>
        <div className="flex items-center gap-2">
          <Button onClick={handlePrint} className="gap-1.5">
            <Printer className="h-4 w-4" />
            طباعة مفردات المرتب
          </Button>
        </div>
      </div>

      {/* Printable Sheet (A4 Dimensions Simulation) */}
      <div className="bg-card text-card-foreground border rounded-lg p-8 sm:p-12 max-w-3xl mx-auto shadow-sm print:shadow-none print:border-none print:p-0 print:m-0">
        {/* Company Header */}
        <div className="flex justify-between items-start border-b pb-6 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {companySettings?.name || "نظام مسار لإدارة الموارد (Masar ERP)"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {companySettings?.address || "جمهورية مصر العربية"}
                  {companySettings?.phone ? ` | هاتف: ${companySettings.phone}` : ""}
                </p>
              </div>
            </div>
            {companySettings?.taxNumber && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                السجل الضريبي: {companySettings.taxNumber}
              </p>
            )}
          </div>

          <div className="text-end">
            <Badge variant="outline" className="text-sm font-semibold px-3 py-1 mb-1">
              كشف مفردات مرتب (Payslip)
            </Badge>
            <p className="text-xs font-mono text-muted-foreground">
              مسير: {payslip.payrollRun.runNumber}
            </p>
            <p className="text-xs font-semibold text-primary mt-1">
              عن شهر: {monthName} {payslip.payrollRun.year}
            </p>
          </div>
        </div>

        {/* Employee Info Box */}
        <div className="bg-muted/30 border rounded-lg p-4 mb-6 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground block">اسم الموظف:</span>
            <strong className="text-sm text-foreground">{payslip.employee.fullName}</strong>
          </div>
          <div>
            <span className="text-muted-foreground block">الرقم الوظيفي:</span>
            <strong className="font-mono text-sm">{payslip.employee.code}</strong>
          </div>
          <div>
            <span className="text-muted-foreground block">الرقم القومي / الهوية:</span>
            <span className="font-mono">{payslip.employee.nationalId || "-"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">القسم الإداري:</span>
            <span>{payslip.employee.department.name}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">المسمى الوظيفي:</span>
            <span>{payslip.employee.position.title}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">تاريخ التعيين:</span>
            <span className="font-mono">{new Date(payslip.employee.hireDate).toLocaleDateString("ar-EG")}</span>
          </div>
        </div>

        {/* Earnings & Deductions Tables */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          {/* Earnings (الاستحقاقات) */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-semibold px-4 py-2 text-xs border-b">
              الاستحقاقات (Earnings)
            </div>
            <table className="w-full text-xs text-start">
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-2.5 px-4">الراتب الأساسي</td>
                  <td className="py-2.5 px-4 text-end font-mono font-medium">
                    {maskSalary(baseSalary, canViewSalary)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4">البدلات والحوافز</td>
                  <td className="py-2.5 px-4 text-end font-mono font-medium">
                    {maskSalary(allowances, canViewSalary)}
                  </td>
                </tr>
                <tr className="bg-muted/20 font-bold border-t">
                  <td className="py-2.5 px-4">إجمالي الاستحقاق</td>
                  <td className="py-2.5 px-4 text-end font-mono text-emerald-600 dark:text-emerald-400">
                    {maskSalary(grossSalary, canViewSalary)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Deductions (الاستقطاعات) */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 font-semibold px-4 py-2 text-xs border-b">
              الاستقطاعات والجزاءات (Deductions)
            </div>
            <table className="w-full text-xs text-start">
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-2.5 px-4">خصومات الغياب ({payslip.absenceDays} يوم)</td>
                  <td className="py-2.5 px-4 text-end font-mono text-destructive">
                    {payslip.absenceDays > 0 ? (canViewSalary ? formatSalary((baseSalary / 30) * payslip.absenceDays) : "••••••") : "0.00 EGP"}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4">خصومات التأخير ({payslip.lateDays} يوم)</td>
                  <td className="py-2.5 px-4 text-end font-mono text-destructive">
                    {payslip.lateDays > 0 ? (canViewSalary ? formatSalary((baseSalary / 30) * payslip.lateDays * 0.25) : "••••••") : "0.00 EGP"}
                  </td>
                </tr>
                <tr className="bg-muted/20 font-bold border-t">
                  <td className="py-2.5 px-4">إجمالي الاستقطاعات</td>
                  <td className="py-2.5 px-4 text-end font-mono text-destructive">
                    {maskSalary(deductions, canViewSalary)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Net Pay Highlight Banner */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-5 mb-10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 block">
              صافي الراتب المستحق للصرف (Net Payable Salary):
            </span>
            <span className="text-xs text-muted-foreground">
              {payslip.isPaid ? "تم صرف الراتب للموظف" : "قيد الصرف المالي"}
            </span>
          </div>
          <div className="text-end">
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {maskSalary(netSalary, canViewSalary)}
            </span>
          </div>
        </div>

        {/* Signatures Block */}
        <div className="grid grid-cols-3 gap-6 pt-6 border-t text-center text-xs text-muted-foreground">
          <div className="space-y-10">
            <span>إعداد الموارد البشرية (HR)</span>
            <div className="border-b border-dashed border-muted-foreground/40 mx-4"></div>
            <span>التوقيع: ........................</span>
          </div>

          <div className="space-y-10">
            <span>مراجعة الحسابات (Finance)</span>
            <div className="border-b border-dashed border-muted-foreground/40 mx-4"></div>
            <span>التوقيع: ........................</span>
          </div>

          <div className="space-y-10">
            <span>توقيع الموظف بالاستلام</span>
            <div className="border-b border-dashed border-muted-foreground/40 mx-4"></div>
            <span>التاريخ: ...... / ...... / 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}
