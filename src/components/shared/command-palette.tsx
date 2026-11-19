"use client";

import * as React from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import {
  Search,
  LayoutDashboard,
  Users,
  Shield,
  Palette,
  Package,
  ShoppingCart,
  Truck,
  BookOpen,
  Briefcase,
  Settings,
  Sun,
  Moon,
  FileText,
  CreditCard,
  ArrowDownLeft,
  Layers,
  Receipt,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";

interface CommandPaletteProps {
  permissions?: string[];
}

export function CommandPalette({ permissions = [] }: CommandPaletteProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");
  const tSearch = useTranslations("search");
  const { setTheme, resolvedTheme } = useTheme();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const hasPerm = (key: string) => {
    return permissions.includes(key) || permissions.includes("all");
  };

  const isDev = process.env.NODE_ENV === "development";

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="relative h-9 w-full max-w-64 justify-start rounded-lg border-border/80 bg-muted/30 px-3 text-xs text-muted-foreground shadow-none hover:bg-accent hover:text-accent-foreground sm:w-64"
      >
        <Search className="me-2 h-3.5 w-3.5" />
        <span className="inline-flex truncate">{tSearch("placeholder")}</span>
        <kbd className="pointer-events-none absolute end-2 top-2 hidden h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={tSearch("openPalette")}
        description={tSearch("placeholder")}
      >
        <CommandInput placeholder={tSearch("placeholder")} />
        <CommandList>
          <CommandEmpty>{tSearch("noResults")}</CommandEmpty>

          <CommandGroup heading={tSearch("modules")}>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/dashboard"))}
            >
              <LayoutDashboard className="me-2 h-4 w-4 text-primary" />
              <span>{tNav("dashboard")}</span>
            </CommandItem>

            {hasPerm("auth.user.manage") && (
              <CommandItem
                onSelect={() => runCommand(() => router.push("/users"))}
              >
                <Users className="me-2 h-4 w-4 text-primary" />
                <span>{tNav("users")}</span>
              </CommandItem>
            )}

            {hasPerm("auth.role.manage") && (
              <CommandItem
                onSelect={() => runCommand(() => router.push("/roles"))}
              >
                <Shield className="me-2 h-4 w-4 text-primary" />
                <span>{tNav("roles")}</span>
              </CommandItem>
            )}

            {(hasPerm("inventory.product.view") || hasPerm("inventory.view")) && (
              <>
                <CommandItem
                  onSelect={() => runCommand(() => router.push("/inventory/products"))}
                >
                  <Package className="me-2 h-4 w-4 text-primary" />
                  <span>{tNav("products")}</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => runCommand(() => router.push("/inventory/stock"))}
                >
                  <Package className="me-2 h-4 w-4 text-primary" />
                  <span>{tNav("stock")}</span>
                </CommandItem>
              </>
            )}

            {(hasPerm("sales.customer.view") || hasPerm("sales.invoice.view") || hasPerm("sales.order.view")) && (
              <>
                <CommandItem
                  onSelect={() => runCommand(() => router.push("/sales/customers"))}
                >
                  <Users className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>{tNav("customers")}</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => runCommand(() => router.push("/sales/quotations"))}
                >
                  <FileText className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>{tNav("quotations")}</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => runCommand(() => router.push("/sales/orders"))}
                >
                  <ShoppingCart className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>{tNav("orders")}</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => runCommand(() => router.push("/sales/invoices"))}
                >
                  <FileText className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>{tNav("invoices")}</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => runCommand(() => router.push("/sales/payments"))}
                >
                  <CreditCard className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>{tNav("payments")}</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => runCommand(() => router.push("/sales/returns"))}
                >
                  <ArrowDownLeft className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>{tNav("returns")}</span>
                </CommandItem>
              </>
            )}

            {hasPerm("purchasing.supplier.view") && (
              <>
                <CommandItem
                  onSelect={() => runCommand(() => router.push("/purchasing/suppliers"))}
                >
                  <Truck className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>{tNav("suppliers")}</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => runCommand(() => router.push("/purchasing/orders"))}
                >
                  <FileText className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>{tNav("orders")}</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => runCommand(() => router.push("/purchasing/receipts"))}
                >
                  <Layers className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>إيصالات الاستلام</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => runCommand(() => router.push("/purchasing/invoices"))}
                >
                  <Receipt className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>فواتير المشتريات</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => runCommand(() => router.push("/purchasing/payments"))}
                >
                  <CreditCard className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>سندات صرف الموردين</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => runCommand(() => router.push("/purchasing/returns"))}
                >
                  <ArrowDownLeft className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>مرتجعات المشتريات</span>
                </CommandItem>
              </>
            )}

            {(hasPerm("accounting.account.view") || hasPerm("accounting.journal.view")) && (
              <>
                <CommandItem
                  onSelect={() => runCommand(() => router.push("/accounting/accounts"))}
                >
                  <BookOpen className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>دليل الحسابات (شجرة الحسابات)</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => runCommand(() => router.push("/accounting/journal"))}
                >
                  <FileText className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>قيود اليومية المحاسبية</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => runCommand(() => router.push("/accounting/expenses"))}
                >
                  <CreditCard className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>سجل المصروفات والنثريات</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => runCommand(() => router.push("/accounting/periods"))}
                >
                  <Layers className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>الفترات المالية والسنوات</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => runCommand(() => router.push("/accounting/reports"))}
                >
                  <Receipt className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>التقارير والقوائم المالية</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => runCommand(() => router.push("/accounting/settings"))}
                >
                  <BookOpen className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>ربط الحسابات الافتراضية</span>
                </CommandItem>
              </>
            )}

            {hasPerm("hr.view") && (
              <CommandItem
                onSelect={() => runCommand(() => router.push("/dashboard"))}
              >
                <Briefcase className="me-2 h-4 w-4 text-muted-foreground" />
                <span>{tNav("hr")}</span>
              </CommandItem>
            )}

            {isDev && (
              <CommandItem
                onSelect={() => runCommand(() => router.push("/design-system" as unknown as "/dashboard"))}
              >
                <Palette className="me-2 h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span>{tNav("designSystem")}</span>
              </CommandItem>
            )}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={tSearch("actions")}>
            <CommandItem
              onSelect={() =>
                runCommand(() =>
                  setTheme(resolvedTheme === "dark" ? "light" : "dark")
                )
              }
            >
              {resolvedTheme === "dark" ? (
                <Sun className="me-2 h-4 w-4 text-amber-500" />
              ) : (
                <Moon className="me-2 h-4 w-4 text-teal-500" />
              )}
              <span>
                {resolvedTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              </span>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => router.push("/dashboard"))}
            >
              <Settings className="me-2 h-4 w-4 text-muted-foreground" />
              <span>{tCommon("settings")}</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
