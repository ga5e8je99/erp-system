"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const switchLocale = (newLocale: "ar" | "en") => {
    if (newLocale === locale) return;
    const query = searchParams.toString();
    const targetUrl = query ? `${pathname}?${query}` : pathname;
    router.replace(targetUrl, { locale: newLocale });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="flex h-9 items-center gap-1.5 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Globe className="h-4 w-4" />
            <span>{locale === "ar" ? "العربية" : "English"}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => switchLocale("ar")}
          className={locale === "ar" ? "bg-accent font-semibold text-accent-foreground" : ""}
        >
          <span className="me-2 text-base">🇸🇦</span>
          <span>العربية (Arabic)</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => switchLocale("en")}
          className={locale === "en" ? "bg-accent font-semibold text-accent-foreground" : ""}
        >
          <span className="me-2 text-base">🇺🇸</span>
          <span>English (الإنجليزية)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
