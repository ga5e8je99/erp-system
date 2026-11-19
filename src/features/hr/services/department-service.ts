import { db } from "@/lib/db";
import { DepartmentFormData, PositionFormData } from "../schemas";

export async function getDepartments() {
  return db.department.findMany({
    where: { deletedAt: null },
    include: {
      _count: {
        select: {
          employees: { where: { deletedAt: null } },
          positions: { where: { deletedAt: null } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getDepartmentById(id: string) {
  return db.department.findUnique({
    where: { id },
    include: {
      positions: { where: { deletedAt: null } },
      employees: {
        where: { deletedAt: null },
        include: { position: true },
      },
    },
  });
}

export async function createDepartment(data: DepartmentFormData) {
  const existing = await db.department.findFirst({
    where: {
      code: data.code.toUpperCase(),
      deletedAt: null,
    },
  });

  if (existing) {
    throw new Error(`رمز القسم (${data.code}) مستخدم بالفعل`);
  }

  return db.department.create({
    data: {
      name: data.name,
      code: data.code.toUpperCase(),
      description: data.description || null,
    },
  });
}

export async function updateDepartment(id: string, data: DepartmentFormData) {
  const existing = await db.department.findFirst({
    where: {
      code: data.code.toUpperCase(),
      deletedAt: null,
      NOT: { id },
    },
  });

  if (existing) {
    throw new Error(`رمز القسم (${data.code}) مستخدم بالفعل`);
  }

  return db.department.update({
    where: { id },
    data: {
      name: data.name,
      code: data.code.toUpperCase(),
      description: data.description || null,
    },
  });
}

export async function deleteDepartment(id: string) {
  const counts = await db.department.findUnique({
    where: { id },
    select: {
      _count: {
        select: {
          employees: { where: { deletedAt: null } },
          positions: { where: { deletedAt: null } },
        },
      },
    },
  });

  if (!counts) {
    throw new Error("القسم غير موجود");
  }

  if (counts._count.employees > 0) {
    throw new Error("لا يمكن حذف القسم لوجود موظفين مسجلين به");
  }

  if (counts._count.positions > 0) {
    throw new Error("لا يمكن حذف القسم لوجود مسميات وظيفية مرتبطة به");
  }

  return db.department.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function getPositions(departmentId?: string) {
  return db.position.findMany({
    where: {
      deletedAt: null,
      ...(departmentId ? { departmentId } : {}),
    },
    include: {
      department: true,
      _count: {
        select: {
          employees: { where: { deletedAt: null } },
        },
      },
    },
    orderBy: { title: "asc" },
  });
}

export async function createPosition(data: PositionFormData) {
  const existing = await db.position.findFirst({
    where: {
      code: data.code.toUpperCase(),
      deletedAt: null,
    },
  });

  if (existing) {
    throw new Error(`رمز المسمى الوظيفي (${data.code}) مستخدم بالفعل`);
  }

  return db.position.create({
    data: {
      title: data.title,
      code: data.code.toUpperCase(),
      departmentId: data.departmentId,
    },
    include: { department: true },
  });
}

export async function updatePosition(id: string, data: PositionFormData) {
  const existing = await db.position.findFirst({
    where: {
      code: data.code.toUpperCase(),
      deletedAt: null,
      NOT: { id },
    },
  });

  if (existing) {
    throw new Error(`رمز المسمى الوظيفي (${data.code}) مستخدم بالفعل`);
  }

  return db.position.update({
    where: { id },
    data: {
      title: data.title,
      code: data.code.toUpperCase(),
      departmentId: data.departmentId,
    },
    include: { department: true },
  });
}

export async function deletePosition(id: string) {
  const position = await db.position.findUnique({
    where: { id },
    select: {
      _count: {
        select: {
          employees: { where: { deletedAt: null } },
        },
      },
    },
  });

  if (!position) {
    throw new Error("المسمى الوظيفي غير موجود");
  }

  if (position._count.employees > 0) {
    throw new Error("لا يمكن حذف المسمى الوظيفي لوجود موظفين مسجلين به");
  }

  return db.position.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
