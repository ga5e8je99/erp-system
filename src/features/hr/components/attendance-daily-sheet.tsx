"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import {
  Calendar as CalendarIcon,
  CheckCircle,
  Save,
  Clock,
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
import { AttendanceStatus } from "@prisma/client";
import { DailyAttendanceRow } from "../types";
import { saveBulkAttendanceAction } from "../actions/attendance-actions";
import { ManualCheckInDialog } from "./manual-check-in-dialog";

interface AttendanceDailySheetProps {
  initialDate: string; // YYYY-MM-DD
  initialRows: DailyAttendanceRow[];
  employees: { id: string; name: string; code: string }[];
  canManage: boolean;
}

export function AttendanceDailySheet({
  initialDate,
  initialRows,
  employees,
  canManage,
}: AttendanceDailySheetProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = React.useState(initialDate);
  const [rows, setRows] = React.useState<DailyAttendanceRow[]>(initialRows);
  const [isSaving, setIsSaving] = React.useState(false);
  const [manualDialogOpen, setManualDialogOpen] = React.useState(false);

  React.useEffect(() => {
    setRows(initialRows);
    setSelectedDate(initialDate);
  }, [initialRows, initialDate]);

  const handleDateChange = (newDateStr: string) => {
    setSelectedDate(newDateStr);
    router.push(`/hr/attendance?date=${newDateStr}`);
  };

  const handleStatusChange = (employeeId: string, status: AttendanceStatus) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.employeeId !== employeeId) return r;
        // Auto default standard checkIn time if marked present and was empty
        const defaultCheckIn = status === AttendanceStatus.PRESENT && !r.checkIn ? "09:00" : r.checkIn;
        const defaultCheckOut = status === AttendanceStatus.PRESENT && !r.checkOut ? "17:00" : r.checkOut;
        return {
          ...r,
          status,
          checkIn: status === AttendanceStatus.ABSENT ? null : defaultCheckIn,
          checkOut: status === AttendanceStatus.ABSENT ? null : defaultCheckOut,
        };
      })
    );
  };

  const handleTimeChange = (
    employeeId: string,
    field: "checkIn" | "checkOut",
    val: string
  ) => {
    setRows((prev) =>
      prev.map((r) =>
        r.employeeId === employeeId ? { ...r, [field]: val || null } : r
      )
    );
  };

  const handleNotesChange = (employeeId: string, notes: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.employeeId === employeeId ? { ...r, notes } : r
      )
    );
  };

  const handleMarkAllPresent = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        status: AttendanceStatus.PRESENT,
        checkIn: r.checkIn || "09:00",
        checkOut: r.checkOut || "17:00",
      }))
    );
    toast.info("تم تحديد جميع الموظفين كحضور (09:00 - 17:00)");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        date: selectedDate,
        records: rows.map((r) => ({
          employeeId: r.employeeId,
          status: r.status,
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          notes: r.notes || null,
        })),
      };

      const res = await saveBulkAttendanceAction(payload);
      if (res.ok) {
        toast.success("تم حفظ كشف الحضور والانصراف بنجاح");
        router.refresh();
      } else {
        toast.error(res.error || "فشل حفظ كشف الحضور");
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsSaving(false);
    }
  };

  // Quick stats for current sheet
  const presentCount = rows.filter((r) => r.status === AttendanceStatus.PRESENT).length;
  const absentCount = rows.filter((r) => r.status === AttendanceStatus.ABSENT).length;
  const lateCount = rows.filter((r) => r.status === AttendanceStatus.LATE).length;

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-card border rounded-lg">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold">تاريخ الكشف:</span>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-44 font-mono text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs border-s ps-3">
            <Badge className="bg-emerald-600">حاضر: {presentCount}</Badge>
            <Badge variant="destructive">غائب: {absentCount}</Badge>
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">متأخر: {lateCount}</Badge>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleMarkAllPresent}
              disabled={isSaving}
            >
              <CheckCircle className="h-4 w-4 me-1.5 text-emerald-600" />
              تحديد الكل حاضر
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setManualDialogOpen(true)}
              disabled={isSaving}
            >
              <Clock className="h-4 w-4 me-1.5" />
              تسجيل فردي
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 me-1.5" />
              {isSaving ? "جاري الحفظ..." : "حفظ الكشف"}
            </Button>
          </div>
        )}
      </div>

      {/* Attendance Table */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">الموظف</th>
                <th className="py-3 px-4 text-start">القسم والوظيفة</th>
                <th className="py-3 px-4 text-start w-40">الحالة</th>
                <th className="py-3 px-4 text-start w-32">وقت الحضور</th>
                <th className="py-3 px-4 text-start w-32">وقت الانصراف</th>
                <th className="py-3 px-4 text-start">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    لا يوجد موظفون نشطون مسجلون بالنظام
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.employeeId} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs sm:text-sm">{row.employeeName}</span>
                        <span className="font-mono text-xs text-muted-foreground">{row.employeeCode}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-muted-foreground">
                      <div>{row.departmentName}</div>
                      <div>{row.positionTitle}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <Select
                        value={row.status}
                        onValueChange={(val) =>
                          handleStatusChange(row.employeeId, val as AttendanceStatus)
                        }
                        disabled={!canManage || isSaving}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={AttendanceStatus.PRESENT}>حاضر</SelectItem>
                          <SelectItem value={AttendanceStatus.ABSENT}>غائب</SelectItem>
                          <SelectItem value={AttendanceStatus.LATE}>متأخر</SelectItem>
                          <SelectItem value={AttendanceStatus.HALF_DAY}>نصف يوم</SelectItem>
                          <SelectItem value={AttendanceStatus.ON_LEAVE}>إجازة</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2.5 px-4">
                      <Input
                        type="time"
                        value={row.checkIn || ""}
                        onChange={(e) =>
                          handleTimeChange(row.employeeId, "checkIn", e.target.value)
                        }
                        disabled={
                          !canManage ||
                          isSaving ||
                          row.status === AttendanceStatus.ABSENT ||
                          row.status === AttendanceStatus.ON_LEAVE
                        }
                        className="h-8 font-mono text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-4">
                      <Input
                        type="time"
                        value={row.checkOut || ""}
                        onChange={(e) =>
                          handleTimeChange(row.employeeId, "checkOut", e.target.value)
                        }
                        disabled={
                          !canManage ||
                          isSaving ||
                          row.status === AttendanceStatus.ABSENT ||
                          row.status === AttendanceStatus.ON_LEAVE
                        }
                        className="h-8 font-mono text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-4">
                      <Input
                        type="text"
                        placeholder="ملاحظات..."
                        value={row.notes || ""}
                        onChange={(e) =>
                          handleNotesChange(row.employeeId, e.target.value)
                        }
                        disabled={!canManage || isSaving}
                        className="h-8 text-xs"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ManualCheckInDialog
        open={manualDialogOpen}
        onOpenChange={setManualDialogOpen}
        employees={employees}
        defaultDate={selectedDate}
      />
    </div>
  );
}
