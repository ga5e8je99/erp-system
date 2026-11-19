"use client";

import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppBreadcrumbs } from "@/components/shared/app-breadcrumbs";
import { CommandPalette } from "@/components/shared/command-palette";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { NotificationsBell } from "@/components/shared/notifications-bell";
import { UserMenu } from "@/components/shared/user-menu";
import { Separator } from "@/components/ui/separator";

interface AppHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
    permissions?: string[];
  };
}

export function AppHeader({ user }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md transition-[width,height] ease-linear sm:px-6">
      {/* Start / Left: Sidebar Trigger & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ms-1.5 h-8 w-8 text-muted-foreground hover:text-foreground" />
        <Separator orientation="vertical" className="h-4" />
        <AppBreadcrumbs />
      </div>

      {/* End / Right: Tools, Palette, Switchers, Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <div className="hidden md:block">
          <CommandPalette permissions={user.permissions} />
        </div>
        <LanguageSwitcher />
        <ThemeToggle />
        <NotificationsBell />
        <Separator orientation="vertical" className="h-4" />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
