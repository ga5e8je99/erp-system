import { db } from "@/lib/db";
import { AttendanceStatus, EmployeeStatus } from "@prisma/client";
import { AttendanceBulkFormData, ManualCheckInOutFormData } from "../schemas";

/**
 * Normalizes any Date to UTC midnight for Prisma @db.Date matching.
 */
export function normalizeDate(date: Date | string): Date {
  if (typeof date === "string") {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    }
  }
  const d = typeof date === "string" ? new Date(date) : date;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function parseTimeString(timeStr?: string | null, baseDate?: Date): Date | null {
  if (!timeStr || !timeStr.trim()) return null;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;

  const d = baseDate ? new Date(baseDate) : new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function formatTimeToHHMM(d?: Date | null): string | null {
  if (!d) return null;
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export async function getDailyAttendance(date: Date) {
  const normDate = normalizeDate(date);

  const employees = await db.employee.findMany({
    where: {
      deletedAt: null,
      status: EmployeeStatus.ACTIVE,
    },
    take: 200,
    include: {
      department: true,
      position: true,
    },
    orderBy: { code: "asc" },
  });

  const attendances = await db.attendance.findMany({
    where: {
      date: normDate,
    },
    take: 200,
  });

  const attendanceMap = new Map(attendances.map((a) => [a.employeeId, a]));

  return employees.map((emp) => {
    const att = attendanceMap.get(emp.id);
    return {
      employeeId: emp.id,
      employeeCode: emp.code,
      employeeName: emp.fullName,
      departmentName: emp.department?.name || "-",
      positionTitle: emp.position?.title || "-",
      attendanceId: att?.id,
      status: att?.status || AttendanceStatus.PRESENT,
      checkIn: formatTimeToHHMM(att?.checkIn),
      checkOut: formatTimeToHHMM(att?.checkOut),
      notes: att?.notes || "",
    };
  });
}

export async function saveBulkAttendance(data: AttendanceBulkFormData) {
  const normDate = normalizeDate(data.date);

  return db.$transaction(async (tx) => {
    const results = [];
    for (const rec of data.records) {
      const checkInDate = parseTimeString(rec.checkIn, normDate);
      const checkOutDate = parseTimeString(rec.checkOut, normDate);

      const record = await tx.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: rec.employeeId,
            date: normDate,
          },
        },
        update: {
          status: rec.status,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          notes: rec.notes || null,
        },
        create: {
          employeeId: rec.employeeId,
          date: normDate,
          status: rec.status,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          notes: rec.notes || null,
        },
      });
      results.push(record);
    }
    return results;
  });
}

export async function getEmployeeMonthlyAttendance(employeeId: string, month: number, year: number) {
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  return db.attendance.findMany({
    where: {
      employeeId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    take: 100,
    orderBy: { date: "asc" },
  });
}

export async function recordManualCheckInOut(data: ManualCheckInOutFormData) {
  const normDate = normalizeDate(data.date);
  const checkInDate = parseTimeString(data.checkIn, normDate);
  const checkOutDate = parseTimeString(data.checkOut, normDate);

  return db.attendance.upsert({
    where: {
      employeeId_date: {
        employeeId: data.employeeId,
        date: normDate,
      },
    },
    update: {
      status: data.status,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      notes: data.notes || null,
    },
    create: {
      employeeId: data.employeeId,
      date: normDate,
      status: data.status,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      notes: data.notes || null,
    },
  });
}
