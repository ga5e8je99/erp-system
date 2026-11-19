"use client";

import * as React from "react";
import { signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { User, LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/routing";

interface UserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");
  const locale = useLocale();

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const handleSignOut = async () => {
    await signOut({ callbackUrl: `/${locale}/login` });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            data-testid="user-menu-trigger"
            className="flex items-center gap-2 rounded-full p-0.5 outline-hidden transition-all hover:ring-2 hover:ring-primary/20 focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={user.name || "User account"}
          >
            <Avatar size="default" className="border border-border">
              <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-56 p-1">
        <div className="p-2 font-normal">
          <div className="flex flex-col space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold leading-none text-foreground">
                {user.name || "User"}
              </p>
              <Badge variant="secondary" className="text-[10px] font-medium">
                {user.role || "Viewer"}
              </Badge>
            </div>
            {user.email && (
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          render={
            <Link
              href="/dashboard"
              className="flex w-full items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            />
          }
        >
          <User className="h-4 w-4" />
          <span>{tNav("profile")}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          render={
            <Link
              href="/dashboard"
              className="flex w-full items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            />
          }
        >
          <Settings className="h-4 w-4" />
          <span>{tNav("settings")}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          onClick={handleSignOut}
          className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs font-medium text-destructive focus:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          <span>{tCommon("logout")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
