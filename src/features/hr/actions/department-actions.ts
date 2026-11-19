"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { departmentSchema, positionSchema } from "../schemas";
import { toSafeError } from "@/lib/safe-error";
import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
  createPosition,
  updatePosition,
  deletePosition,
} from "../services/department-service";

export async function createDepartmentAction(input: unknown) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("hr.department.manage");

    const parsed = departmentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "بيانات القسم غير صالحة",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const dept = await createDepartment(parsed.data);

    await logAudit({
      action: "DEPARTMENT_CREATE",
      entity: "Department",
      entityId: dept.id,
      after: { name: dept.name, code: dept.code },
    });

    revalidatePath("/hr/departments");
    revalidatePath("/hr/employees");
    return { ok: true, data: dept };
  } catch (error: unknown) {
    return { ok: false, error: toSafeError(error, "فشل إنشاء القسم") };
  }
}

export async function updateDepartmentAction(id: string, input: unknown) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("hr.department.manage");

    const parsed = departmentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "بيانات القسم غير صالحة",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const dept = await updateDepartment(id, parsed.data);

    await logAudit({
      action: "DEPARTMENT_UPDATE",
      entity: "Department",
      entityId: dept.id,
      after: { name: dept.name, code: dept.code },
    });

    revalidatePath("/hr/departments");
    revalidatePath("/hr/employees");
    return { ok: true, data: dept };
  } catch (error: unknown) {
    return { ok: false, error: toSafeError(error, "فشل تحديث القسم") };
  }
}

export async function deleteDepartmentAction(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("hr.department.manage");

    const dept = await deleteDepartment(id);

    await logAudit({
      action: "DEPARTMENT_DELETE",
      entity: "Department",
      entityId: dept.id,
      before: { name: dept.name, code: dept.code },
    });

    revalidatePath("/hr/departments");
    revalidatePath("/hr/employees");
    return { ok: true, data: dept };
  } catch (error: unknown) {
    return { ok: false, error: toSafeError(error, "فشل حذف القسم") };
  }
}

export async function createPositionAction(input: unknown) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("hr.position.manage");

    const parsed = positionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "بيانات المسمى الوظيفي غير صالحة",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const pos = await createPosition(parsed.data);

    await logAudit({
      action: "POSITION_CREATE",
      entity: "Position",
      entityId: pos.id,
      after: { title: pos.title, code: pos.code },
    });

    revalidatePath("/hr/departments");
    revalidatePath("/hr/employees");
    return { ok: true, data: pos };
  } catch (error: unknown) {
    return { ok: false, error: toSafeError(error, "فشل إنشاء المسمى الوظيفي") };
  }
}

export async function updatePositionAction(id: string, input: unknown) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("hr.position.manage");

    const parsed = positionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "بيانات المسمى الوظيفي غير صالحة",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const pos = await updatePosition(id, parsed.data);

    await logAudit({
      action: "POSITION_UPDATE",
      entity: "Position",
      entityId: pos.id,
      after: { title: pos.title, code: pos.code },
    });

    revalidatePath("/hr/departments");
    revalidatePath("/hr/employees");
    return { ok: true, data: pos };
  } catch (error: unknown) {
    return { ok: false, error: toSafeError(error, "فشل تحديث المسمى الوظيفي") };
  }
}

export async function deletePositionAction(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("hr.position.manage");

    const pos = await deletePosition(id);

    await logAudit({
      action: "POSITION_DELETE",
      entity: "Position",
      entityId: pos.id,
      before: { title: pos.title, code: pos.code },
    });

    revalidatePath("/hr/departments");
    revalidatePath("/hr/employees");
    return { ok: true, data: pos };
  } catch (error: unknown) {
    return { ok: false, error: toSafeError(error, "فشل حذف المسمى الوظيفي") };
  }
}
