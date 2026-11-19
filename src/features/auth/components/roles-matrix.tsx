"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateRolePermissionsAction } from "@/features/auth/actions/roles";
import { Shield, Users, CheckCheck, Loader2 } from "lucide-react";

interface RoleWithPerms {
  id: string;
  name: string;
  description: string | null;
  permissions: { permissionId: string }[];
  _count: { users: number };
}

interface PermissionItem {
  id: string;
  key: string;
  module: string | null;
  description: string | null;
}

interface RolesMatrixProps {
  roles: RoleWithPerms[];
  permissions: PermissionItem[];
}

export function RolesMatrix({ roles, permissions }: RolesMatrixProps) {
  const t = useTranslations("roles");
  const tCommon = useTranslations("common");

  const [activeRole, setActiveRole] = useState<RoleWithPerms | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Group permissions by module
  const groupedPermissions = React.useMemo(() => {
    const map = new Map<string, PermissionItem[]>();
    for (const p of permissions) {
      const mod = p.module || "general";
      if (!map.has(mod)) {
        map.set(mod, []);
      }
      map.get(mod)!.push(p);
    }
    return map;
  }, [permissions]);

  const openEditModal = (role: RoleWithPerms) => {
    setActiveRole(role);
    setSelectedPerms(role.permissions.map((p) => p.permissionId));
  };

  const handleTogglePerm = (permissionId: string) => {
    setSelectedPerms((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleToggleModule = (modulePerms: PermissionItem[]) => {
    const ids = modulePerms.map((p) => p.id);
    const allSelected = ids.every((id) => selectedPerms.includes(id));

    if (allSelected) {
      setSelectedPerms((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedPerms((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  const handleSave = async () => {
    if (!activeRole) return;
    setIsSaving(true);

    try {
      const res = await updateRolePermissionsAction({
        roleId: activeRole.id,
        permissionIds: selectedPerms,
      });

      if (res.ok) {
        toast.success(t("permissionsSaved"));
        setActiveRole(null);
      } else {
        toast.error(tCommon("error"));
      }
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Roles Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.id} className="flex flex-col justify-between transition-shadow hover:shadow-md">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Shield className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="gap-1 text-xs">
                  <Users className="h-3 w-3" />
                  <span>{role._count.users} مستخدم</span>
                </Badge>
              </div>
              <CardTitle className="mt-3 text-lg font-bold">{role.name}</CardTitle>
              <CardDescription className="text-xs line-clamp-2">
                {role.description || "لا يوجد وصف محدد"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                <span>{role.permissions.length} صلاحية مفعلة</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditModal(role)}
                  className="text-xs h-7"
                >
                  {t("editPermissions")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permissions Matrix Dialog */}
      <Dialog
        open={Boolean(activeRole)}
        onOpenChange={(open) => !open && setActiveRole(null)}
      >
        <DialogContent className="max-h-[90vh] sm:max-w-3xl flex flex-col">
          <DialogHeader className="text-start">
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span>{t("editPermissions")}: {activeRole?.name}</span>
            </DialogTitle>
          </DialogHeader>

          {/* Grouped Checkbox UI */}
          <div className="flex-1 overflow-y-auto pe-2 space-y-6 py-2">
            {Array.from(groupedPermissions.entries()).map(([moduleName, modulePerms]) => {
              const ids = modulePerms.map((p) => p.id);
              const allSelected = ids.every((id) => selectedPerms.includes(id));

              return (
                <div
                  key={moduleName}
                  className="rounded-lg border bg-muted/20 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-semibold text-sm capitalize text-primary flex items-center gap-1.5">
                      <CheckCheck className="h-4 w-4" />
                      {moduleName}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => handleToggleModule(modulePerms)}
                      className="text-xs"
                    >
                      {allSelected ? "إلغاء تحديد الكل" : t("selectAll")}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {modulePerms.map((p) => {
                      const isChecked = selectedPerms.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          className="flex items-start gap-2.5 rounded-md p-1.5 hover:bg-background/80 transition-colors"
                        >
                          <Checkbox
                            id={p.id}
                            checked={isChecked}
                            onCheckedChange={() => handleTogglePerm(p.id)}
                            className="mt-0.5"
                          />
                          <div className="space-y-0.5 text-start cursor-pointer" onClick={() => handleTogglePerm(p.id)}>
                            <Label htmlFor={p.id} className="text-xs font-mono font-medium block cursor-pointer">
                              {p.key}
                            </Label>
                            {p.description && (
                              <p className="text-[11px] text-muted-foreground">
                                {p.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveRole(null)}
              disabled={isSaving}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {tCommon("loading")}
                </>
              ) : (
                t("savePermissions")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
