import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getUsersList, getRolesForSelect } from "@/features/auth/queries/users";
import { UsersTable } from "@/features/auth/components/users-table";

interface UsersPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    search?: string;
    roleId?: string;
    page?: string;
  }>;
}

export default async function UsersPage({
  params,
  searchParams,
}: UsersPageProps) {
  const { locale } = await params;
  const sParams = await searchParams;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Permission Gate
  if (!hasPermission(session, "auth.user.manage")) {
    redirect(`/${locale}/forbidden`);
  }

  const t = await getTranslations("users");

  const [usersData, roles] = await Promise.all([
    getUsersList({
      search: sParams.search,
      roleId: sParams.roleId,
      page: sParams.page ? parseInt(sParams.page, 10) : 1,
    }),
    getRolesForSelect(),
  ]);

  return (
    <div className="space-y-6">
      <div className="border-b pb-4 text-start">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Suspense fallback={<div className="h-64 w-full animate-pulse rounded-lg bg-card" />}>
        <UsersTable
          users={usersData.users}
          roles={roles}
          total={usersData.total}
          currentUserId={session.user.id}
        />
      </Suspense>
    </div>
  );
}
