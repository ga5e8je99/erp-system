"use client";

import React from "react";
import { Link, usePathname } from "@/i18n/routing";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  Truck,
  Calculator,
  Users2,
  BarChart3,
  UserCog,
  Shield,
  Settings,
  LogOut,
  Building2,
  Languages,
} from "lucide-react";

interface NavItem {
  key: string;
  label: string;
  href: React.ComponentProps<typeof Link>["href"];
  icon: React.ElementType;
  visible: boolean;
}

interface DashboardNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    role: string;
    permissions: string[];
    locale: string;
  };
  currentLocale: string;
}

export function DashboardNav({ user, currentLocale }: DashboardNavProps) {
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();

  const isArabic = currentLocale === "ar";
  const otherLocale = isArabic ? "en" : "ar";

  const hasPerm = (perm: string) => {
    if (user.role.toLowerCase() === "admin") return true;
    if (user.permissions.includes("*") || user.permissions.includes("admin")) return true;
    return user.permissions.includes(perm);
  };

  const navItems: NavItem[] = [
    {
      key: "dashboard",
      label: tNav("dashboard"),
      href: "/dashboard",
      icon: LayoutDashboard,
      visible: true,
    },
    {
      key: "inventory",
      label: tNav("inventory"),
      href: "/inventory",
      icon: Boxes,
      visible: hasPerm("inventory.product.view"),
    },
    {
      key: "sales",
      label: tNav("sales"),
      href: "/sales",
      icon: ShoppingCart,
      visible: hasPerm("sales.invoice.view") || hasPerm("sales.order.view"),
    },
    {
      key: "purchasing",
      label: tNav("purchasing"),
      href: "/purchasing",
      icon: Truck,
      visible: hasPerm("purchasing.order.view") || hasPerm("purchasing.supplier.view"),
    },
    {
      key: "accounting",
      label: tNav("accounting"),
      href: "/accounting",
      icon: Calculator,
      visible: hasPerm("accounting.account.view") || hasPerm("accounting.journal.view"),
    },
    {
      key: "hr",
      label: tNav("hr"),
      href: "/hr",
      icon: Users2,
      visible: hasPerm("hr.employee.view"),
    },
    {
      key: "reports",
      label: tNav("reports"),
      href: "/reports",
      icon: BarChart3,
      visible: hasPerm("reports.sales.view") || hasPerm("reports.financial.view"),
    },
    {
      key: "users",
      label: tNav("users"),
      href: "/users",
      icon: UserCog,
      visible: hasPerm("auth.user.manage"),
    },
    {
      key: "roles",
      label: tNav("roles"),
      href: "/roles",
      icon: Shield,
      visible: hasPerm("auth.role.manage"),
    },
    {
      key: "settings",
      label: tNav("settings"),
      href: "/settings",
      icon: Settings,
      visible: hasPerm("company.settings.manage"),
    },
  ];

  const visibleItems = navItems.filter((i) => i.visible);

  return (
    <aside className="flex h-screen w-64 flex-col border-e bg-card">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm tracking-tight">{tCommon("appName")}</span>
          <span className="text-[10px] text-muted-foreground">ERP Platform</span>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Language Switcher & User Profile Box */}
      <div className="border-t p-3 space-y-2">
        <div className="flex items-center justify-between px-2">
          <Button asChild variant="ghost" size="xs" className="gap-1.5 text-xs text-muted-foreground">
            <Link href={pathname as React.ComponentProps<typeof Link>["href"]} locale={otherLocale}>
              <Languages className="h-3.5 w-3.5" />
              <span>{isArabic ? tCommon("switchToEn") : tCommon("switchToAr")}</span>
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="xs"
            onClick={() => signOut({ callbackUrl: `/${currentLocale}/login` })}
            className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{tCommon("logout")}</span>
          </Button>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
            {user.name?.substring(0, 2).toUpperCase() || "US"}
          </div>
          <div className="flex flex-col min-w-0 flex-1 text-start">
            <span className="truncate text-xs font-semibold">{user.name}</span>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-normal">
                {user.role}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
