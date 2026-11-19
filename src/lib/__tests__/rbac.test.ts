import { describe, it, expect } from "vitest";
import { hasPermission, ForbiddenError } from "../rbac";

describe("RBAC Permissions Engine", () => {
  it("grants access to any permission for Admin role", () => {
    const adminUser = {
      role: "Admin",
      permissions: [],
    };

    expect(hasPermission(adminUser, "inventory.product.create")).toBe(true);
    expect(hasPermission(adminUser, "accounting.account.manage")).toBe(true);
    expect(hasPermission(adminUser, "sales.invoice.post")).toBe(true);
  });

  it("grants access if user permissions array contains '*'", () => {
    const superUser = {
      role: "CustomRole",
      permissions: ["*"],
    };

    expect(hasPermission(superUser, "inventory.product.create")).toBe(true);
    expect(hasPermission(superUser, "hr.payroll.manage")).toBe(true);
  });

  it("grants access when exact permission is present", () => {
    const salesUser = {
      role: "Sales",
      permissions: [
        "sales.customer.view",
        "sales.order.create",
        "sales.invoice.create",
      ],
    };

    expect(hasPermission(salesUser, "sales.order.create")).toBe(true);
    expect(hasPermission(salesUser, "sales.invoice.create")).toBe(true);
    expect(hasPermission(salesUser, "sales.customer.view")).toBe(true);
  });

  it("denies access when permission is missing", () => {
    const salesUser = {
      role: "Sales",
      permissions: ["sales.customer.view", "sales.order.create"],
    };

    expect(hasPermission(salesUser, "accounting.account.manage")).toBe(false);
    expect(hasPermission(salesUser, "inventory.product.delete")).toBe(false);
    expect(hasPermission(salesUser, "auth.user.manage")).toBe(false);
  });

  it("denies access safely when user or session is null or undefined", () => {
    expect(hasPermission(null, "sales.order.create")).toBe(false);
    expect(hasPermission(undefined, "sales.order.create")).toBe(false);
    expect(hasPermission({ user: null }, "sales.order.create")).toBe(false);
  });

  it("constructs ForbiddenError with the target permission", () => {
    const err = new ForbiddenError("inventory.stock.adjust");
    expect(err.name).toBe("ForbiddenError");
    expect(err.permission).toBe("inventory.stock.adjust");
    expect(err.message).toContain("inventory.stock.adjust");
  });
});
