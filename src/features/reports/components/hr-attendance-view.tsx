"use client";

import * as React from "react";
import { ReportShell } from "./report-shell";
import { HrAttendanceSummaryRow } from "../types";
import { exportToCsv } from "../utils/export-csv";
import { useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";

interface HrAttendanceViewProps {
  data: HrAttendanceSummaryRow[];
}

export function HrAttendanceView({ data }: HrAttendanceViewProps) {
  const locale = useLocale();
  const isArabic = locale === "ar";

  const totalPresent = data.reduce((s, r) => s + r.presentDays, 0);
  const totalAbsent = data.reduce((s, r) => s + r.absentDays, 0);
  const totalLate = data.reduce((s, r) => s + r.lateDays, 0);
  const totalLeave = data.reduce((s, r) => s + r.leaveDays, 0);

  const avgAttendanceRate =
    data.length > 0
      ? Math.round((data.reduce((s, r) => s + r.attendanceRate, 0) / data.length) * 10) / 10
      : 0;

  const handleExportCsv = () => {
    const headers = [
      isArabic ? "كود الموظف" : "Code",
      isArabic ? "اسم الموظف" : "Employee Name",
      isArabic ? "القسم" : "Department",
      isArabic ? "المسمى الوظيفي" : "Position",
      isArabic ? "أيام العمل المسجلة" : "Working Days",
      isArabic ? "حضور" : "Present",
      isArabic ? "غياب" : "Absent",
      isArabic ? "تأخير" : "Late",
      isArabic ? "إجازات" : "Leave",
      isArabic ? "نسبة الالتزام %" : "Attendance Rate %",
    ];

    const rows = data.map((r) => [
      r.employeeCode,
      r.employeeName,
      r.departmentName,
      r.positionTitle,
      r.totalWorkingDays,
      r.presentDays,
      r.absentDays,
      r.lateDays,
      r.leaveDays,
      `${r.attendanceRate}%`,
    ]);

    rows.push([
      isArabic ? "الإجمالي الكلي" : "Grand Total",
      "",
      "",
      "",
      "",
      totalPresent,
      totalAbsent,
      totalLate,
      totalLeave,
      `${avgAttendanceRate}%`,
    ]);

    exportToCsv("hr_attendance_summary_report", headers, rows);
  };

  return (
    <ReportShell
      title={isArabic ? "تقرير ملخص حضور وانصراف الموظفين" : "HR Attendance Summary Report"}
      description={
        isArabic
          ? "متابعة سجلات الحضور والانصراف، الغياب، التأخير، الإجازات، ونسبة الالتزام بالدوام الرسمي"
          : "Workforce attendance tracking: present days, unexcused absences, late arrivals, leaves, and overall adherence rate"
      }
      moduleName={isArabic ? "الموارد البشرية" : "Human Resources"}
      onExportCsv={handleExportCsv}
    >
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="py-3 px-4 text-start font-medium">{isArabic ? "كود الموظف" : "Code"}</th>
                <th className="py-3 px-4 text-start font-medium">{isArabic ? "اسم الموظف" : "Employee"}</th>
                <th className="py-3 px-4 text-start font-medium">{isArabic ? "القسم" : "Department"}</th>
                <th className="py-3 px-4 text-start font-medium">{isArabic ? "المسمى الوظيفي" : "Position"}</th>
                <th className="py-3 px-4 text-center font-medium">{isArabic ? "حضور" : "Present"}</th>
                <th className="py-3 px-4 text-center font-medium">{isArabic ? "غياب" : "Absent"}</th>
                <th className="py-3 px-4 text-center font-medium">{isArabic ? "تأخير" : "Late"}</th>
                <th className="py-3 px-4 text-center font-medium">{isArabic ? "إجازة" : "Leave"}</th>
                <th className="py-3 px-4 text-center font-medium">{isArabic ? "نسبة الالتزام" : "Adherence"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    {isArabic ? "لا توجد سجلات حضور في هذه الفترة" : "No attendance records found"}
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.employeeId} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-primary">{row.employeeCode}</td>
                    <td className="py-2.5 px-4 font-semibold text-foreground">{row.employeeName}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{row.departmentName}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{row.positionTitle}</td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold text-emerald-600">
                      {row.presentDays}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold text-rose-600">
                      {row.absentDays}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold text-amber-600">
                      {row.lateDays}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono font-medium text-sky-600">
                      {row.leaveDays}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold">
                      <span
                        className={
                          row.attendanceRate >= 90
                            ? "text-emerald-600"
                            : row.attendanceRate >= 75
                            ? "text-amber-600"
                            : "text-rose-600"
                        }
                      >
                        {row.attendanceRate}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Totals Row */}
            {data.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/60 font-bold">
                  <td colSpan={4} className="py-3 px-4 text-start">
                    {isArabic ? "الإجمالي الكلي" : "Grand Total"} ({data.length} {isArabic ? "موظف" : "employees"})
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-emerald-600">{totalPresent}</td>
                  <td className="py-3 px-4 text-center font-mono text-rose-600">{totalAbsent}</td>
                  <td className="py-3 px-4 text-center font-mono text-amber-600">{totalLate}</td>
                  <td className="py-3 px-4 text-center font-mono text-sky-600">{totalLeave}</td>
                  <td className="py-3 px-4 text-center font-mono text-primary text-sm font-bold">
                    {avgAttendanceRate}%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </CardContent>
      </Card>
    </ReportShell>
  );
}
