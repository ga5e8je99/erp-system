import { describe, it, expect } from "vitest";
import { hasPermission, ForbiddenError, isReservedRoleName, RESERVED_ROLE_NAMES } from "../rbac";

describe("RBAC Permissions Engine", () => {
  it("denies access to role named 'Admin' if it lacks permissions (no role-name bypass)", () => {
    const adminUserWithoutPerms = {
      role: "Admin",
      permissions: [],
    };

    expect(hasPermission(adminUserWithoutPerms, "inventory.product.create")).toBe(false);
    expect(hasPermission(adminUserWithoutPerms, "accounting.account.manage")).toBe(false);
    expect(hasPermission(adminUserWithoutPerms, "sales.invoice.post")).toBe(false);
  });

  it("grants access to all permissions when permissions array contains wildcard '*'", () => {
    const superAdminUser = {
      role: "Super Admin",
      permissions: ["*"],
    };

    expect(hasPermission(superAdminUser, "inventory.product.create")).toBe(true);
    expect(hasPermission(superAdminUser, "accounting.account.manage")).toBe(true);
    expect(hasPermission(superAdminUser, "sales.invoice.post")).toBe(true);
    expect(hasPermission(superAdminUser, "hr.payroll.manage")).toBe(true);
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

  it("denies access to users even if their name, username or email contains 'admin'", () => {
    const imposterUser = {
      name: "Admin User",
      email: "admin@masar.local",
      role: "Viewer",
      permissions: [],
    };

    // User's name, username, or email must never grant administrative bypass
    expect(hasPermission(imposterUser, "inventory.product.delete")).toBe(false);
    expect(hasPermission(imposterUser, "accounting.account.manage")).toBe(false);
    expect(hasPermission(imposterUser, "auth.user.manage")).toBe(false);
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

  describe("Reserved Role Names Protection", () => {
    it("identifies reserved role names case-insensitively and with hyphens/underscores", () => {
      for (const name of RESERVED_ROLE_NAMES) {
        expect(isReservedRoleName(name)).toBe(true);
        expect(isReservedRoleName(name.toUpperCase())).toBe(true);
        expect(isReservedRoleName(` ${name} `)).toBe(true);
      }

      expect(isReservedRoleName("super-admin")).toBe(true);
      expect(isReservedRoleName("super_admin")).toBe(true);
      expect(isReservedRoleName("ADMIN")).toBe(true);
      expect(isReservedRoleName("Administrator")).toBe(true);
      expect(isReservedRoleName("root")).toBe(true);
    });

    it("allows non-reserved custom role names", () => {
      expect(isReservedRoleName("Accountant")).toBe(false);
      expect(isReservedRoleName("Sales Representative")).toBe(false);
      expect(isReservedRoleName("Warehouse Manager")).toBe(false);
      expect(isReservedRoleName("HR Officer")).toBe(false);
    });
  });
});
