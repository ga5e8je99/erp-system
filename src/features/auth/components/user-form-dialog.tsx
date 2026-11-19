"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";

const userDialogSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().optional(),
  roleId: z.string().min(1, "يرجى اختيار الدور الوظيفي"),
  locale: z.enum(["ar", "en"]),
});

type UserDialogInput = z.infer<typeof userDialogSchema>;
import { createUserAction, updateUserAction } from "@/features/auth/actions/users";
import { Loader2 } from "lucide-react";

interface RoleOption {
  id: string;
  name: string;
}

export interface UserToEdit {
  id: string;
  name: string;
  email: string;
  roleId: string;
  locale: "ar" | "en";
  isActive: boolean;
}

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userToEdit?: UserToEdit | null;
  roles: RoleOption[];
}

export function UserFormDialog({
  open,
  onOpenChange,
  userToEdit,
  roles,
}: UserFormDialogProps) {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const isEditing = Boolean(userToEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UserDialogInput>({
    resolver: zodResolver(userDialogSchema),
    values: userToEdit
      ? {
          name: userToEdit.name,
          email: userToEdit.email,
          roleId: userToEdit.roleId,
          locale: userToEdit.locale,
          password: "",
        }
      : {
          name: "",
          email: "",
          password: "",
          roleId: roles[0]?.id || "",
          locale: "ar",
        },
  });

  const selectedRoleId = watch("roleId");
  const selectedLocale = watch("locale");

  const onSubmit = async (data: UserDialogInput) => {
    setIsSubmitting(true);
    try {
      if (isEditing && userToEdit) {
        const res = await updateUserAction({
          id: userToEdit.id,
          name: data.name,
          email: data.email,
          roleId: data.roleId,
          locale: data.locale,
          isActive: userToEdit.isActive,
        });

        if (res.ok) {
          toast.success(t("userUpdated"));
          onOpenChange(false);
          reset();
        } else {
          toast.error(res.error === "DUPLICATE_EMAIL" ? "البريد الإلكتروني مستخدم بالفعل" : tCommon("error"));
        }
      } else {
        if (!data.password || data.password.length < 6) {
          toast.error("كلمة المرور يجب ألا تقل عن 6 أحرف");
          setIsSubmitting(false);
          return;
        }

        const res = await createUserAction({
          name: data.name,
          email: data.email,
          password: data.password,
          roleId: data.roleId,
          locale: data.locale,
        });
        if (res.ok) {
          toast.success(t("userCreated"));
          onOpenChange(false);
          reset();
        } else {
          toast.error(res.error === "DUPLICATE_EMAIL" ? "البريد الإلكتروني مسجل بالفعل" : tCommon("error"));
        }
      }
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-start">
          <DialogTitle>{isEditing ? t("editUser") : t("addUser")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2 text-start">
            <Label htmlFor="name">{t("name")}</Label>
            <Input id="name" placeholder="محمد أحمد" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2 text-start">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@masar.local"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          {!isEditing && (
            <div className="space-y-2 text-start">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2 text-start">
            <Label>{t("role")}</Label>
            <Select
              value={selectedRoleId}
              onValueChange={(val) => val && setValue("roleId", val, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الدور" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.roleId && (
              <p className="text-xs text-destructive">{errors.roleId.message}</p>
            )}
          </div>

          <div className="space-y-2 text-start">
            <Label>{t("locale")}</Label>
            <Select
              value={selectedLocale}
              onValueChange={(val) =>
                val && setValue("locale", val as "ar" | "en", { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">العربية (Arabic)</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {tCommon("loading")}
                </>
              ) : (
                tCommon("save")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
