"use client";

import * as React from "react";
import { usePathname, Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Users,
  Shield,
  Palette,
  Package,
  ShoppingCart,
  Truck,
  BookOpen,
  Briefcase,
  Layers,
  ChevronRight,
  BarChart3,
  Settings,
  History,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
    permissions?: string[];
  };
}

interface NavItem {
  titleKey: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  badge?: string;
  items?: {
    titleKey: string;
    href: string;
    permission?: string;
  }[];
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");

  const hasPerm = (permission?: string): boolean => {
    if (!permission) return true;
    if (user.role === "Admin" || user.role?.toLowerCase() === "admin") return true;
    if (user.permissions?.includes("*") || user.permissions?.includes("admin")) return true;

    if (permission === "reports.view") {
      return (
        hasPerm("reports.sales.view") ||
        hasPerm("reports.purchases.view") ||
        hasPerm("reports.inventory.view") ||
        hasPerm("reports.financial.view") ||
        hasPerm("hr.employee.view")
      );
    }

    if (permission === "auth.audit.view") {
      return (
        hasPerm("auth.user.manage") ||
        Boolean(user.permissions?.includes("auth.audit.view")) ||
        Boolean(user.permissions?.includes("all"))
      );
    }

    return (
      user.permissions?.includes(permission) ||
      user.permissions?.includes("all") ||
      false
    );
  };

  const isDev = process.env.NODE_ENV === "development";

  // Navigation structure grouped logically
  const mainNav: NavItem[] = [
    {
      titleKey: "dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      titleKey: "reports",
      href: "/reports",
      icon: BarChart3,
      permission: "reports.view",
    },
  ];

  const businessNav: NavItem[] = [
    {
      titleKey: "inventory",
      icon: Package,
      permission: "inventory.product.view",
      items: [
        { titleKey: "products", href: "/inventory/products", permission: "inventory.product.view" },
        { titleKey: "categories", href: "/inventory/categories", permission: "inventory.category.manage" },
        { titleKey: "units", href: "/inventory/units", permission: "inventory.unit.manage" },
        { titleKey: "warehouses", href: "/inventory/warehouses", permission: "inventory.warehouse.manage" },
        { titleKey: "stock", href: "/inventory/stock", permission: "inventory.product.view" },
        { titleKey: "adjustments", href: "/inventory/adjustments", permission: "inventory.stock.adjust" },
        { titleKey: "transfers", href: "/inventory/transfers", permission: "inventory.stock.transfer" },
        { titleKey: "movements", href: "/inventory/movements", permission: "inventory.product.view" },
      ],
    },
    {
      titleKey: "sales",
      icon: ShoppingCart,
      permission: "sales.customer.view",
      items: [
        { titleKey: "customers", href: "/sales/customers", permission: "sales.customer.view" },
        { titleKey: "quotations", href: "/sales/quotations", permission: "sales.quotation.view" },
        { titleKey: "orders", href: "/sales/orders", permission: "sales.order.view" },
        { titleKey: "invoices", href: "/sales/invoices", permission: "sales.invoice.view" },
        { titleKey: "payments", href: "/sales/payments", permission: "sales.payment.create" },
        { titleKey: "returns", href: "/sales/returns", permission: "sales.return.manage" },
      ],
    },
    {
      titleKey: "purchasing",
      icon: Truck,
      permission: "purchasing.supplier.view",
      items: [
        { titleKey: "suppliers", href: "/purchasing/suppliers", permission: "purchasing.supplier.view" },
        { titleKey: "orders", href: "/purchasing/orders", permission: "purchasing.order.view" },
        { titleKey: "receipts", href: "/purchasing/receipts", permission: "purchasing.receipt.create" },
        { titleKey: "invoices", href: "/purchasing/invoices", permission: "purchasing.invoice.view" },
        { titleKey: "payments", href: "/purchasing/payments", permission: "purchasing.payment.view" },
        { titleKey: "returns", href: "/purchasing/returns", permission: "purchasing.return.manage" },
      ],
    },
    {
      titleKey: "accounting",
      icon: BookOpen,
      permission: "accounting.account.view",
      items: [
        { titleKey: "accounts", href: "/accounting/accounts", permission: "accounting.account.view" },
        { titleKey: "journal", href: "/accounting/journal", permission: "accounting.journal.view" },
        { titleKey: "expenses", href: "/accounting/expenses", permission: "accounting.expense.manage" },
        { titleKey: "periods", href: "/accounting/periods", permission: "accounting.period.manage" },
        { titleKey: "reports", href: "/accounting/reports", permission: "reports.financial.view" },
        { titleKey: "settings", href: "/accounting/settings", permission: "accounting.account.manage" },
      ],
    },
    {
      titleKey: "hr",
      icon: Briefcase,
      permission: "hr.employee.view",
      items: [
        { titleKey: "employees", href: "/hr/employees", permission: "hr.employee.view" },
        { titleKey: "departments", href: "/hr/departments", permission: "hr.department.manage" },
        { titleKey: "attendance", href: "/hr/attendance", permission: "hr.attendance.manage" },
        { titleKey: "leave", href: "/hr/leave", permission: "hr.leave.manage" },
        { titleKey: "payroll", href: "/hr/payroll", permission: "hr.payroll.manage" },
      ],
    },
  ];

  const adminNav: NavItem[] = [
    {
      titleKey: "users",
      href: "/users",
      icon: Users,
      permission: "auth.user.manage",
    },
    {
      titleKey: "roles",
      href: "/roles",
      icon: Shield,
      permission: "auth.role.manage",
    },
    {
      titleKey: "settings",
      href: "/settings",
      icon: Settings,
      permission: "company.settings.manage",
    },
    {
      titleKey: "auditLogs",
      href: "/audit-logs",
      icon: History,
      permission: "auth.audit.view",
    },
  ];

  if (isDev) {
    adminNav.push({
      titleKey: "designSystem",
      href: "/design-system",
      icon: Palette,
      badge: "Dev",
    });
  }

  const renderSingleItem = (item: NavItem) => {
    if (!hasPerm(item.permission)) return null;
    const Icon = item.icon;
    const isActive = item.href ? pathname === item.href : false;

    return (
      <SidebarMenuItem key={item.titleKey}>
        <SidebarMenuButton
          isActive={isActive}
          tooltip={tNav.has(item.titleKey) ? tNav(item.titleKey) : item.titleKey}
          render={
            <Link
              href={(item.href || "/dashboard") as unknown as "/dashboard"}
              className={`flex items-center gap-2.5 font-medium transition-colors ${isActive
                ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
            />
          }
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {tNav.has(item.titleKey) ? tNav(item.titleKey) : item.titleKey}
          </span>
          {item.badge && (
            <Badge
              variant="outline"
              className="ms-auto h-4 px-1 text-[10px] border-primary/40 text-primary font-mono"
            >
              {item.badge}
            </Badge>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  function SidebarCollapsibleItem({
    item,
    pathname,
    tNav,
    hasPerm,
  }: {
    item: NavItem;
    pathname: string;
    tNav: { (key: string): string; has: (key: string) => boolean };
    hasPerm: (perm?: string) => boolean;
  }) {
    const isChildActive =
      item.items?.some((sub) => sub.href && pathname.startsWith(sub.href)) || false;
    const [isOpen, setIsOpen] = React.useState(isChildActive);
    const Icon = item.icon;
    const itemLabel = tNav.has(item.titleKey) ? tNav(item.titleKey) : item.titleKey;

    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => setIsOpen((prev) => !prev)}
          tooltip={itemLabel}
          className="w-full justify-between font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <div className="flex items-center gap-2.5">
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{itemLabel}</span>
          </div>
          <ChevronRight
            className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-90" : "rtl:rotate-180"
              }`}
          />
        </SidebarMenuButton>

        {isOpen && (
          <SidebarMenuSub>
            {item.items?.map((sub) => {
              if (!hasPerm(sub.permission)) return null;
              const isSubActive = pathname === sub.href;
              const subLabel = tNav.has(sub.titleKey) ? tNav(sub.titleKey) : sub.titleKey;
              return (
                <SidebarMenuSubItem key={sub.titleKey}>
                  <SidebarMenuSubButton
                    isActive={isSubActive}
                    render={
                      <Link
                        href={sub.href as unknown as "/dashboard"}
                        className={`flex items-center text-xs transition-colors ${isSubActive
                          ? "font-semibold text-primary"
                          : "text-muted-foreground hover:text-foreground"
                          }`}
                      />
                    }
                  >
                    <span>{subLabel}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    );
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Brand Header */}
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <Layers className="h-4 w-4" />
          </div>
          <div className="flex flex-col truncate group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
              {tCommon("appName")}
            </span>
            <span className="text-[10px] text-muted-foreground">
              v1.0 • Enterprise
            </span>
          </div>
        </Link>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent className="px-2 py-2">
        <SidebarGroup>
          <SidebarMenu>
            {mainNav.map(renderSingleItem)}
          </SidebarMenu>
        </SidebarGroup>

        {businessNav.some((item) => hasPerm(item.permission)) && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-sidebar-foreground uppercase">
              {tCommon("inventory")} &amp; {tCommon("sales")}
            </SidebarGroupLabel>
            <SidebarMenu>
              {businessNav.map((item) =>
                item.items ? (
                  <SidebarCollapsibleItem
                    key={item.titleKey}
                    item={item}
                    pathname={pathname}
                    tNav={tNav}
                    hasPerm={hasPerm}
                  />
                ) : (
                  renderSingleItem(item)
                )
              )}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {adminNav.some((item) => hasPerm(item.permission)) && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-sidebar-foreground uppercase">
              {tCommon("settings")}
            </SidebarGroupLabel>
            <SidebarMenu>
              {adminNav.map(renderSingleItem)}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Sidebar Footer */}
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/50 p-2 group-data-[collapsible=icon]:hidden">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {user.role?.[0] || "U"}
          </div>
          <div className="flex flex-col truncate">
            <span className="text-xs font-medium text-sidebar-foreground truncate">
              {user.name || "User"}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {user.role || "Viewer"}
            </span>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
