import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppHeader } from "@/components/shared/app-header";
import { KeyboardShortcuts } from "@/components/shared/keyboard-shortcuts";

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  const user = {
    name: session.user.name,
    email: session.user.email,
    role: session.user.role || "Viewer",
    permissions: session.user.permissions || [],
    locale: session.user.locale || locale,
  };

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <KeyboardShortcuts />
      <AppSidebar user={user} side={locale === "ar" ? "right" : "left"} />
      <SidebarInset className="flex flex-1 flex-col overflow-x-hidden min-h-screen bg-background">
        <AppHeader user={user} />
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
