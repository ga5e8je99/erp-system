"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { attendanceBulkSchema, manualCheckInOutSchema } from "../schemas";
import {
  saveBulkAttendance,
  recordManualCheckInOut,
} from "../services/attendance-service";

export async function saveBulkAttendanceAction(input: unknown) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("hr.attendance.manage");

    const parsed = attendanceBulkSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "بيانات كشف الحضور غير صالحة",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const records = await saveBulkAttendance(parsed.data);

    await logAudit({
      action: "ATTENDANCE_BULK_SAVE",
      entity: "Attendance",
      entityId: parsed.data.date.toISOString().slice(0, 10),
      after: {
        count: records.length,
        date: parsed.data.date.toISOString(),
      },
    });

    revalidatePath("/hr/attendance");
    return { ok: true, data: records };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل حفظ كشف الحضور والانصراف";
    return { ok: false, error: message };
  }
}

export async function recordManualCheckInOutAction(input: unknown) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("hr.attendance.manage");

    const parsed = manualCheckInOutSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "بيانات تسجيل الحضور غير صالحة",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const record = await recordManualCheckInOut(parsed.data);

    await logAudit({
      action: "ATTENDANCE_MANUAL_RECORD",
      entity: "Attendance",
      entityId: record.id,
      after: {
        employeeId: record.employeeId,
        date: record.date,
        status: record.status,
      },
    });

    revalidatePath("/hr/attendance");
    revalidatePath(`/hr/employees/${record.employeeId}`);
    return { ok: true, data: record };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل تسجيل حضور الموظف";
    return { ok: false, error: message };
  }
}
