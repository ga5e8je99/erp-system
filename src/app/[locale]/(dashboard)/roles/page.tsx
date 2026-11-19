import React from "react";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getRolesWithPermissions } from "@/features/auth/queries/users";
import { RolesMatrix } from "@/features/auth/components/roles-matrix";

interface RolesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function RolesPage({ params }: RolesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Permission Gate
  if (!hasPermission(session, "auth.role.manage")) {
    redirect(`/${locale}/forbidden`);
  }

  const t = await getTranslations("roles");
  const { roles, permissions } = await getRolesWithPermissions();

  return (
    <div className="space-y-6">
      <div className="border-b pb-4 text-start">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <RolesMatrix roles={roles} permissions={permissions} />
    </div>
  );
}
