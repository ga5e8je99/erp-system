import { db } from "@/lib/db";
import { EmployeeStatus, Prisma } from "@prisma/client";
import { EmployeeFormData } from "../schemas";
import { serializeDecimals } from "@/lib/serialization";

export async function getNextEmployeeCode(tx?: Prisma.TransactionClient): Promise<string> {
  const client = tx || db;
  const lastEmp = await client.employee.findFirst({
    where: { code: { startsWith: "EMP-" } },
    orderBy: { code: "desc" },
    select: { code: true },
  });

  if (!lastEmp) {
    return "EMP-001";
  }

  const match = lastEmp.code.match(/EMP-(\d+)/);
  if (!match) {
    return `EMP-${Date.now().toString().slice(-4)}`;
  }

  const nextNum = parseInt(match[1], 10) + 1;
  return `EMP-${String(nextNum).padStart(3, "0")}`;
}

export async function getEmployees(params?: {
  search?: string;
  departmentId?: string;
  positionId?: string;
  status?: EmployeeStatus;
}) {
  const { search, departmentId, positionId, status } = params || {};

  const where: Prisma.EmployeeWhereInput = {
    deletedAt: null,
    ...(departmentId ? { departmentId } : {}),
    ...(positionId ? { positionId } : {}),
    ...(status ? { status } : {}),
  };

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { code: { contains: q, mode: "insensitive" } },
      { nationalId: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const employees = await db.employee.findMany({
    where,
    include: {
      department: true,
      position: true,
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { code: "asc" },
  });

  return serializeDecimals(employees);
}

export async function getEmployeeById(id: string) {
  const employee = await db.employee.findUnique({
    where: { id },
    include: {
      department: true,
      position: true,
      user: {
        select: { id: true, name: true, email: true },
      },
      attendances: {
        orderBy: { date: "desc" },
        take: 31,
      },
      leaveRequests: {
        include: { leaveType: true },
        orderBy: { startDate: "desc" },
        take: 20,
      },
      payslips: {
        include: { payrollRun: true },
        orderBy: { createdAt: "desc" },
        take: 12,
      },
    },
  });

  return serializeDecimals(employee);
}

export async function createEmployee(data: EmployeeFormData) {
  return db.$transaction(async (tx) => {
    // Validate uniqueness of nationalId if provided
    if (data.nationalId && data.nationalId.trim()) {
      const existingNid = await tx.employee.findFirst({
        where: { nationalId: data.nationalId.trim(), deletedAt: null },
      });
      if (existingNid) {
        throw new Error("الرقم القومي / الهوية مسجل لموظف آخر بالفعل");
      }
    }

    // Validate email if provided
    if (data.email && data.email.trim()) {
      const existingEmail = await tx.employee.findFirst({
        where: { email: data.email.trim().toLowerCase(), deletedAt: null },
      });
      if (existingEmail) {
        throw new Error("البريد الإلكتروني مسجل لموظف آخر بالفعل");
      }
    }

    // Validate user link if provided
    if (data.userId && data.userId.trim()) {
      const existingUser = await tx.employee.findFirst({
        where: { userId: data.userId.trim(), deletedAt: null },
      });
      if (existingUser) {
        throw new Error("حساب المستخدم هذا مرتبط بموظف آخر بالفعل");
      }
    }

    const code = await getNextEmployeeCode(tx);

    return tx.employee.create({
      data: {
        code,
        fullName: data.fullName.trim(),
        nationalId: data.nationalId?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim().toLowerCase() || null,
        hireDate: data.hireDate,
        departmentId: data.departmentId,
        positionId: data.positionId,
        baseSalary: data.baseSalary,
        allowances: data.allowances || 0,
        status: data.status,
        userId: data.userId?.trim() || null,
        notes: data.notes || null,
        documentsNote: data.documentsNote || null,
      },
      include: {
        department: true,
        position: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
  });
}

export async function updateEmployee(id: string, data: EmployeeFormData) {
  return db.$transaction(async (tx) => {
    if (data.nationalId && data.nationalId.trim()) {
      const existingNid = await tx.employee.findFirst({
        where: {
          nationalId: data.nationalId.trim(),
          deletedAt: null,
          NOT: { id },
        },
      });
      if (existingNid) {
        throw new Error("الرقم القومي / الهوية مسجل لموظف آخر بالفعل");
      }
    }

    if (data.email && data.email.trim()) {
      const existingEmail = await tx.employee.findFirst({
        where: {
          email: data.email.trim().toLowerCase(),
          deletedAt: null,
          NOT: { id },
        },
      });
      if (existingEmail) {
        throw new Error("البريد الإلكتروني مسجل لموظف آخر بالفعل");
      }
    }

    if (data.userId && data.userId.trim()) {
      const existingUser = await tx.employee.findFirst({
        where: {
          userId: data.userId.trim(),
          deletedAt: null,
          NOT: { id },
        },
      });
      if (existingUser) {
        throw new Error("حساب المستخدم هذا مرتبط بموظف آخر بالفعل");
      }
    }

    return tx.employee.update({
      where: { id },
      data: {
        fullName: data.fullName.trim(),
        nationalId: data.nationalId?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim().toLowerCase() || null,
        hireDate: data.hireDate,
        departmentId: data.departmentId,
        positionId: data.positionId,
        baseSalary: data.baseSalary,
        allowances: data.allowances || 0,
        status: data.status,
        userId: data.userId?.trim() || null,
        notes: data.notes || null,
        documentsNote: data.documentsNote || null,
      },
      include: {
        department: true,
        position: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
  });
}

export async function deleteEmployee(id: string) {
  return db.employee.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      status: EmployeeStatus.TERMINATED,
    },
  });
}
