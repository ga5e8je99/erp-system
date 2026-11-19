"use client";

import React from "react";
import { hasPermission, type PermissionKey } from "@/lib/rbac";

interface CanClientProps {
  permission: PermissionKey;
  userPermissions?: string[];
  userRole?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function CanClient({
  permission,
  userPermissions = [],
  userRole,
  children,
  fallback = null,
}: CanClientProps) {
  const allowed = hasPermission(
    { role: userRole, permissions: userPermissions },
    permission
  );

  if (allowed) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
