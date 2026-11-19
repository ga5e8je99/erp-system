import { db } from "@/lib/db";
import { LeaveStatus, Prisma } from "@prisma/client";
import { LeaveTypeFormData, LeaveRequestFormData } from "../schemas";
import { normalizeDate, calculateLeaveDays } from "./leave-calculations";
import { LeaveBalanceSummary } from "../types";

export { calculateLeaveDays, normalizeDate };

export async function getLeaveTypes(limit = 50) {
  return db.leaveType.findMany({
    take: limit,
    include: {
      _count: {
        select: { leaveRequests: true },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function createLeaveType(data: LeaveTypeFormData) {
  const existing = await db.leaveType.findFirst({
    where: { name: data.name.trim() },
  });
  if (existing) {
    throw new Error(`نوع الإجازة (${data.name}) مسجل بالفعل`);
  }

  return db.leaveType.create({
    data: {
      name: data.name.trim(),
      daysAllowed: data.daysAllowed,
      isPaid: data.isPaid,
    },
  });
}

export async function updateLeaveType(id: string, data: LeaveTypeFormData) {
  const existing = await db.leaveType.findFirst({
    where: {
      name: data.name.trim(),
      NOT: { id },
    },
  });
  if (existing) {
    throw new Error(`نوع الإجازة (${data.name}) مسجل بالفعل`);
  }

  return db.leaveType.update({
    where: { id },
    data: {
      name: data.name.trim(),
      daysAllowed: data.daysAllowed,
      isPaid: data.isPaid,
    },
  });
}

export async function deleteLeaveType(id: string) {
  const counts = await db.leaveType.findUnique({
    where: { id },
    include: {
      _count: { select: { leaveRequests: true } },
    },
  });

  if (!counts) {
    throw new Error("نوع الإجازة غير موجود");
  }

  if (counts._count.leaveRequests > 0) {
    throw new Error("لا يمكن حذف نوع الإجازة لوجود طلبات إجازة مسجلة به");
  }

  return db.leaveType.delete({
    where: { id },
  });
}

export async function getEmployeeLeaveBalance(
  employeeId: string,
  targetYear?: number
): Promise<LeaveBalanceSummary[]> {
  const year = targetYear || new Date().getFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  const [leaveTypes, approvedRequests] = await Promise.all([
    db.leaveType.findMany({ take: 50, orderBy: { name: "asc" } }),
    db.leaveRequest.findMany({
      where: {
        employeeId,
        status: LeaveStatus.APPROVED,
        startDate: { lte: endOfYear },
        endDate: { gte: startOfYear },
      },
      take: 100,
    }),
  ]);

  const usedPerType: Record<string, number> = {};

  for (const req of approvedRequests) {
    const effectiveStart = req.startDate < startOfYear ? startOfYear : req.startDate;
    const effectiveEnd = req.endDate > endOfYear ? endOfYear : req.endDate;
    const days = calculateLeaveDays(effectiveStart, effectiveEnd);

    usedPerType[req.leaveTypeId] = (usedPerType[req.leaveTypeId] || 0) + days;
  }

  return leaveTypes.map((lt) => {
    const usedDays = usedPerType[lt.id] || 0;
    const remainingDays = Math.max(0, lt.daysAllowed - usedDays);
    return {
      leaveTypeId: lt.id,
      leaveTypeName: lt.name,
      daysAllowed: lt.daysAllowed,
      isPaid: lt.isPaid,
      usedDays,
      remainingDays,
    };
  });
}

export async function getLeaveRequests(params?: {
  employeeId?: string;
  status?: LeaveStatus;
  year?: number;
}) {
  const { employeeId, status, year } = params || {};

  const where: Prisma.LeaveRequestWhereInput = {};
  if (employeeId) where.employeeId = employeeId;
  if (status) where.status = status;
  if (year) {
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
    where.startDate = { lte: endOfYear };
    where.endDate = { gte: startOfYear };
  }

  return db.leaveRequest.findMany({
    where,
    take: 100,
    include: {
      employee: {
        select: {
          id: true,
          code: true,
          fullName: true,
          department: { select: { name: true } },
        },
      },
      leaveType: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createLeaveRequest(data: LeaveRequestFormData) {
  const normStart = normalizeDate(data.startDate);
  const normEnd = normalizeDate(data.endDate);

  if (normEnd < normStart) {
    throw new Error("تاريخ نهاية الإجازة يجب ألا يسبق تاريخ بدايتها");
  }

  // Check employee
  const employee = await db.employee.findUnique({
    where: { id: data.employeeId, deletedAt: null },
  });
  if (!employee) {
    throw new Error("الموظف غير موجود أو غير نشط");
  }

  // Calculate requested days
  const requestedDays = calculateLeaveDays(normStart, normEnd);

  // Check remaining balance for this leave type in that year
  const year = normStart.getUTCFullYear();
  const balances = await getEmployeeLeaveBalance(data.employeeId, year);
  const balance = balances.find((b) => b.leaveTypeId === data.leaveTypeId);

  if (!balance) {
    throw new Error("نوع الإجازة غير موجود");
  }

  if (balance.remainingDays < requestedDays) {
    throw new Error(
      `رصيد الإجازة المتبقي (${balance.remainingDays} يوم) لا يكفي للطلب الحالي (${requestedDays} يوم)`
    );
  }

  // Check overlapping active requests
  const overlap = await db.leaveRequest.findFirst({
    where: {
      employeeId: data.employeeId,
      status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
      startDate: { lte: normEnd },
      endDate: { gte: normStart },
    },
  });

  if (overlap) {
    throw new Error("يوجد طلب إجازة مسجل بالفعل يتعارض مع التواريخ المحددة");
  }

  return db.leaveRequest.create({
    data: {
      employeeId: data.employeeId,
      leaveTypeId: data.leaveTypeId,
      startDate: normStart,
      endDate: normEnd,
      reason: data.reason || null,
      status: LeaveStatus.PENDING,
    },
    include: {
      employee: true,
      leaveType: true,
    },
  });
}

export async function approveOrRejectLeaveRequest(params: {
  requestId: string;
  status: "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  approvedById?: string | null;
}) {
  const { requestId, status, rejectionReason, approvedById } = params;

  const request = await db.leaveRequest.findUnique({
    where: { id: requestId },
    include: { employee: true, leaveType: true },
  });

  if (!request) {
    throw new Error("طلب الإجازة غير موجود");
  }

  if (request.status !== LeaveStatus.PENDING) {
    throw new Error("لا يمكن تعديل حالة طلب تم البت فيه مسبقاً");
  }

  return db.leaveRequest.update({
    where: { id: requestId },
    data: {
      status,
      rejectionReason: status === "REJECTED" ? rejectionReason || null : null,
      approvedById: approvedById || null,
    },
    include: {
      employee: true,
      leaveType: true,
    },
  });
}
