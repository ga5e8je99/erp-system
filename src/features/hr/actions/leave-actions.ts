"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import {
  leaveTypeSchema,
  leaveRequestSchema,
  leaveApprovalSchema,
} from "../schemas";
import {
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  createLeaveRequest,
  approveOrRejectLeaveRequest,
} from "../services/leave-service";

export async function createLeaveTypeAction(input: unknown) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("hr.leave.manage");

    const parsed = leaveTypeSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "بيانات نوع الإجازة غير صالحة",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const leaveType = await createLeaveType(parsed.data);

    await logAudit({
      action: "LEAVE_TYPE_CREATE",
      entity: "LeaveType",
      entityId: leaveType.id,
      after: { name: leaveType.name, daysAllowed: leaveType.daysAllowed },
    });

    revalidatePath("/hr/leave");
    return { ok: true, data: leaveType };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل إنشاء نوع الإجازة";
    return { ok: false, error: message };
  }
}

export async function updateLeaveTypeAction(id: string, input: unknown) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("hr.leave.manage");

    const parsed = leaveTypeSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "بيانات نوع الإجازة غير صالحة",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const leaveType = await updateLeaveType(id, parsed.data);

    await logAudit({
      action: "LEAVE_TYPE_UPDATE",
      entity: "LeaveType",
      entityId: leaveType.id,
      after: { name: leaveType.name, daysAllowed: leaveType.daysAllowed },
    });

    revalidatePath("/hr/leave");
    return { ok: true, data: leaveType };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل تحديث نوع الإجازة";
    return { ok: false, error: message };
  }
}

export async function deleteLeaveTypeAction(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("hr.leave.manage");

    const leaveType = await deleteLeaveType(id);

    await logAudit({
      action: "LEAVE_TYPE_DELETE",
      entity: "LeaveType",
      entityId: leaveType.id,
      before: { name: leaveType.name },
    });

    revalidatePath("/hr/leave");
    return { ok: true, data: leaveType };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل حذف نوع الإجازة";
    return { ok: false, error: message };
  }
}

export async function createLeaveRequestAction(input: unknown) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("hr.leave.manage");

    const parsed = leaveRequestSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "بيانات طلب الإجازة غير صالحة",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const request = await createLeaveRequest(parsed.data);

    await logAudit({
      action: "LEAVE_REQUEST_CREATE",
      entity: "LeaveRequest",
      entityId: request.id,
      after: {
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        startDate: request.startDate,
        endDate: request.endDate,
      },
    });

    revalidatePath("/hr/leave");
    revalidatePath(`/hr/employees/${request.employeeId}`);
    return { ok: true, data: request };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل تقديم طلب الإجازة";
    return { ok: false, error: message };
  }
}

export async function approveOrRejectLeaveRequestAction(input: unknown) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("hr.leave.manage");

    const parsed = leaveApprovalSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "بيانات اعتماد أو رفض الإجازة غير صالحة",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const request = await approveOrRejectLeaveRequest({
      requestId: parsed.data.requestId,
      status: parsed.data.status,
      rejectionReason: parsed.data.rejectionReason,
      approvedById: session.user.id,
    });

    await logAudit({
      action: parsed.data.status === "APPROVED" ? "LEAVE_REQUEST_APPROVE" : "LEAVE_REQUEST_REJECT",
      entity: "LeaveRequest",
      entityId: request.id,
      after: {
        status: request.status,
        rejectionReason: request.rejectionReason,
        approvedById: session.user.id,
      },
    });

    revalidatePath("/hr/leave");
    revalidatePath(`/hr/employees/${request.employeeId}`);
    return { ok: true, data: request };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل تعديل حالة طلب الإجازة";
    return { ok: false, error: message };
  }
}
