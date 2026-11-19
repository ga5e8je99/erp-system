"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserFormDialog, type UserToEdit } from "./user-form-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { toggleUserStatusAction } from "@/features/auth/actions/users";
import {
  MoreHorizontal,
  UserPlus,
  Search,
  KeyRound,
  Edit2,
  UserX,
  UserCheck,
  Shield,
} from "lucide-react";

interface RoleItem {
  id: string;
  name: string;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  roleId: string;
  role: { id: string; name: string };
  locale: string;
  isActive: boolean;
  lastLoginAt: Date | string | null;
  createdAt: Date | string;
}

interface UsersTableProps {
  users: UserItem[];
  roles: RoleItem[];
  total: number;
  currentUserId?: string;
}

export function UsersTable({ users, roles, total, currentUserId }: UsersTableProps) {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserToEdit | null>(null);

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<{ id: string; name: string } | null>(null);
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, boolean>>({});

  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");
  const [roleFilter, setRoleFilter] = useState(searchParams.get("roleId") || "ALL");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchValue) {
      params.set("search", searchValue);
    } else {
      params.delete("search");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleRoleChange = (val: string) => {
    setRoleFilter(val);
    const params = new URLSearchParams(searchParams.toString());
    if (val && val !== "ALL") {
      params.set("roleId", val);
    } else {
      params.delete("roleId");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleToggleStatus = async (user: UserItem) => {
    const nextState = !(optimisticStatus[user.id] !== undefined ? optimisticStatus[user.id] : user.isActive);
    // Optimistic immediate update
    setOptimisticStatus((prev) => ({ ...prev, [user.id]: nextState }));

    try {
      const res = await toggleUserStatusAction(user.id, nextState);
      if (res.ok) {
        toast.success(t("statusUpdated"));
      } else {
        // Revert on failure
        setOptimisticStatus((prev) => {
          const next = { ...prev };
          delete next[user.id];
          return next;
        });
        if (res.error === "CANNOT_DEACTIVATE_SELF") {
          toast.error("لا يمكنك تعطيل حسابك الحالي");
        } else {
          toast.error(tCommon("error"));
        }
      }
    } catch {
      setOptimisticStatus((prev) => {
        const next = { ...prev };
        delete next[user.id];
        return next;
      });
      toast.error(tCommon("error"));
    }
  };

  const openCreateDialog = () => {
    setUserToEdit(null);
    setFormDialogOpen(true);
  };

  const openEditDialog = (u: UserItem) => {
    setUserToEdit({
      id: u.id,
      name: u.name,
      email: u.email,
      roleId: u.roleId,
      locale: (u.locale === "en" ? "en" : "ar") as "ar" | "en",
      isActive: u.isActive,
    });
    setFormDialogOpen(true);
  };

  const openResetDialog = (u: UserItem) => {
    setUserToReset({ id: u.id, name: u.name });
    setResetDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={tCommon("search")}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="ps-9"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            {tCommon("search")}
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <Select value={roleFilter} onValueChange={(val) => val && handleRoleChange(val)}>
            <SelectTrigger className="w-[160px] text-xs">
              <SelectValue placeholder="تصفية بالدور" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">جميع الأدوار</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={openCreateDialog} size="sm" className="gap-2" data-hotkey-new="true">
            <UserPlus className="h-4 w-4" />
            <span>{t("addUser")}</span>
          </Button>
        </div>
      </div>

      {/* Users Data Grid */}
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("email")}</TableHead>
              <TableHead>{t("role")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("lastLogin")}</TableHead>
              <TableHead className="w-[80px] text-end">{tCommon("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                  لا توجد حسابات مستخدمين مطابقة للبحث
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {u.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span>{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1 font-normal">
                      <Shield className="h-3 w-3 text-primary" />
                      {u.role.name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(optimisticStatus[u.id] !== undefined ? optimisticStatus[u.id] : u.isActive) ? (
                      <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-xs">
                        {tCommon("active")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        {tCommon("inactive")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : t("never")}
                  </TableCell>
                  <TableCell className="text-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground outline-none">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => openEditDialog(u)} className="gap-2">
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>{tCommon("edit")}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openResetDialog(u)} className="gap-2">
                          <KeyRound className="h-3.5 w-3.5" />
                          <span>{t("resetPassword")}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(u)}
                          disabled={currentUserId === u.id && u.isActive}
                          className={u.isActive ? "text-destructive gap-2" : "text-emerald-600 gap-2"}
                        >
                          {u.isActive ? (
                            <>
                              <UserX className="h-3.5 w-3.5" />
                              <span>{t("deactivate")}</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>{t("activate")}</span>
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
          <span>{t("totalUsers")}: {total}</span>
        </div>
      </div>

      {/* Form & Reset Dialogs */}
      <UserFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        userToEdit={userToEdit}
        roles={roles}
      />

      <ResetPasswordDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        user={userToReset}
      />
    </div>
  );
}
