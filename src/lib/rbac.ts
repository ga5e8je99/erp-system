import React from "react";
import type { Session } from "next-auth";

export class ForbiddenError extends Error {
  public readonly permission: string;

  constructor(permission: string, message?: string) {
    super(message ?? `Forbidden: Missing required permission [${permission}]`);
    this.name = "ForbiddenError";
    this.permission = permission;
  }
}

export const RESERVED_ROLE_NAMES = [
  "admin",
  "super admin",
  "superuser",
  "administrator",
  "root",
];

/**
 * Checks whether a given role name is reserved for system administrative use.
 */
export function isReservedRoleName(name: string): boolean {
  const normalized = name.trim().toLowerCase().replace(/[-_]/g, " ");
  return RESERVED_ROLE_NAMES.some((reserved) => normalized === reserved);
}

export type PermissionKey =
  | "auth.user.manage"
  | "auth.role.manage"
  | "auth.audit.view"
  | "company.settings.manage"
  | "inventory.category.manage"
  | "inventory.unit.manage"
  | "inventory.product.view"
  | "inventory.product.create"
  | "inventory.product.edit"
  | "inventory.product.delete"
  | "inventory.warehouse.manage"
  | "inventory.stock.adjust"
  | "inventory.stock.transfer"
  | "sales.customer.view"
  | "sales.customer.manage"
  | "sales.quotation.view"
  | "sales.quotation.manage"
  | "sales.order.view"
  | "sales.order.manage"
  | "sales.invoice.view"
  | "sales.invoice.create"
  | "sales.invoice.post"
  | "sales.payment.create"
  | "sales.return.manage"
  | "purchasing.supplier.view"
  | "purchasing.supplier.manage"
  | "purchasing.order.view"
  | "purchasing.order.manage"
  | "purchasing.receipt.create"
  | "purchasing.invoice.create"
  | "purchasing.payment.create"
  | "accounting.account.view"
  | "accounting.account.manage"
  | "accounting.journal.view"
  | "accounting.journal.create"
  | "accounting.journal.post"
  | "accounting.period.manage"
  | "accounting.expense.manage"
  | "hr.department.manage"
  | "hr.position.manage"
  | "hr.employee.view"
  | "hr.employee.manage"
  | "hr.attendance.manage"
  | "hr.leave.manage"
  | "hr.payroll.manage"
  | "hr.salary.view"
  | "reports.sales.view"
  | "reports.purchases.view"
  | "reports.inventory.view"
  | "reports.financial.view"
  | (string & {});

interface UserLike {
  role?: string | null;
  permissions?: string[] | null;
}

interface SessionLike {
  user?: UserLike | null;
}

function isSessionLike(obj: SessionLike | UserLike): obj is SessionLike {
  return "user" in obj;
}

/**
 * Checks whether a user or session has a specific permission key.
 * Only the wildcard "*" permission bypasses specific checks.
 * Role name alone (e.g. "admin") NEVER grants permissions.
 */
export function hasPermission(
  target: SessionLike | UserLike | null | undefined,
  permission: PermissionKey
): boolean {
  if (!target) return false;

  const user: UserLike | null = isSessionLike(target)
    ? target.user ?? null
    : target;

  if (!user) return false;

  if (!user.permissions || !Array.isArray(user.permissions)) return false;
  if (user.permissions.includes("*")) return true;

  return user.permissions.includes(permission);
}

/**
 * Server-side guard for Server Actions and Route Handlers.
 * Throws an Error("UNAUTHORIZED") if not logged in, or ForbiddenError if missing permission.
 */
export async function requirePermission(permission: PermissionKey): Promise<{
  session: Session;
  user: Session["user"];
}> {
  const { auth } = await import("@/lib/auth");
  const session = await auth();

  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }

  if (!hasPermission(session, permission)) {
    throw new ForbiddenError(permission);
  }

  return { session, user: session.user };
}

/**
 * Server component that conditionally renders its children
 * if the authenticated user has the required permission.
 */
export async function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: PermissionKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (hasPermission(session, permission)) {
    return React.createElement(React.Fragment, null, children);
  }
  return React.createElement(React.Fragment, null, fallback);
}
