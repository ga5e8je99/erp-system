"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { employeeSchema } from "../schemas";
import { serializeDecimals } from "@/lib/serialization";
import { toSafeError } from "@/lib/safe-error";
import {
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../services/employee-service";

export async function createEmployeeAction(input: unknown) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("hr.employee.manage");

    const parsed = employeeSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "بيانات الموظف غير صالحة",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const employee = await createEmployee(parsed.data);

    await logAudit({
      action: "EMPLOYEE_CREATE",
      entity: "Employee",
      entityId: employee.id,
      after: {
        code: employee.code,
        fullName: employee.fullName,
        departmentId: employee.departmentId,
        positionId: employee.positionId,
        status: employee.status,
      },
    });

    revalidatePath("/hr/employees");
    return { ok: true, data: serializeDecimals(employee) };
  } catch (error: unknown) {
    return { ok: false, error: toSafeError(error, "فشل إنشاء الموظف") };
  }
}

export async function updateEmployeeAction(id: string, input: unknown) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("hr.employee.manage");

    const parsed = employeeSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "بيانات الموظف غير صالحة",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const employee = await updateEmployee(id, parsed.data);

    await logAudit({
      action: "EMPLOYEE_UPDATE",
      entity: "Employee",
      entityId: employee.id,
      after: {
        code: employee.code,
        fullName: employee.fullName,
        departmentId: employee.departmentId,
        positionId: employee.positionId,
        status: employee.status,
      },
    });

    revalidatePath("/hr/employees");
    revalidatePath(`/hr/employees/${id}`);
    return { ok: true, data: serializeDecimals(employee) };
  } catch (error: unknown) {
    return { ok: false, error: toSafeError(error, "فشل تحديث بيانات الموظف") };
  }
}

export async function deleteEmployeeAction(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "يجب تسجيل الدخول أولاً" };
    }

    await requirePermission("hr.employee.manage");

    const employee = await deleteEmployee(id);

    await logAudit({
      action: "EMPLOYEE_DELETE",
      entity: "Employee",
      entityId: employee.id,
      before: {
        code: employee.code,
        fullName: employee.fullName,
      },
    });

    revalidatePath("/hr/employees");
    return { ok: true, data: serializeDecimals(employee) };
  } catch (error: unknown) {
    return { ok: false, error: toSafeError(error, "فشل إنهاء خدمة الموظف") };
  }
}
