"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AccountType } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { accountSchema, AccountFormValues } from "../schemas";
import { createAccountAction, updateAccountAction } from "../actions/account-actions";

interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: {
    id: string;
    code: string;
    name: string;
    type: AccountType;
    parentId?: string | null;
    isPostable: boolean;
  } | null;
  parentOptions: { id: string; code: string; name: string; type: AccountType }[];
  defaultParentId?: string | null;
  defaultType?: AccountType;
  onSuccess?: () => void;
}

export function AccountFormDialog({
  open,
  onOpenChange,
  account,
  parentOptions,
  defaultParentId,
  defaultType,
  onSuccess,
}: AccountFormDialogProps) {
  const t = useTranslations("accounting.accounts");
  const isEditing = Boolean(account);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      code: account?.code || "",
      name: account?.name || "",
      type: account?.type || defaultType || AccountType.ASSET,
      parentId: account?.parentId || defaultParentId || null,
      isPostable: account ? account.isPostable : true,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        code: account?.code || "",
        name: account?.name || "",
        type: account?.type || defaultType || AccountType.ASSET,
        parentId: account?.parentId || defaultParentId || null,
        isPostable: account ? account.isPostable : true,
      });
    }
  }, [open, account, defaultParentId, defaultType, form]);

  const onSubmit = async (values: AccountFormValues) => {
    try {
      if (isEditing && account) {
        const res = await updateAccountAction(account.id, values);
        if (res.ok) {
          toast.success(t("updatedSuccessfully"));
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(res.error || t("failedToSave"));
        }
      } else {
        const res = await createAccountAction(values);
        if (res.ok) {
          toast.success(t("createdSuccessfully"));
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(res.error || t("failedToSave"));
        }
      }
    } catch {
      toast.error(t("unexpectedError"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("editAccount") : t("addNewAccount")}</DialogTitle>
          <DialogDescription>
            {isEditing ? t("editAccountDesc") : t("addNewAccountDesc")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Code */}
          <div className="space-y-1.5">
            <Label htmlFor="code" className="text-start block font-medium">
              {t("accountCode")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="code"
              placeholder="e.g. 1115"
              {...form.register("code")}
              className="font-mono text-start"
              dir="ltr"
            />
            {form.formState.errors.code && (
              <p className="text-xs text-destructive">
                {form.formState.errors.code.message}
              </p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-start block font-medium">
              {t("accountName")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder={t("accountNamePlaceholder")}
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label htmlFor="type" className="text-start block font-medium">
              {t("accountType")} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.watch("type")}
              onValueChange={(val) => form.setValue("type", val as AccountType)}
              disabled={isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AccountType.ASSET}>{t("types.ASSET")}</SelectItem>
                <SelectItem value={AccountType.LIABILITY}>{t("types.LIABILITY")}</SelectItem>
                <SelectItem value={AccountType.EQUITY}>{t("types.EQUITY")}</SelectItem>
                <SelectItem value={AccountType.REVENUE}>{t("types.REVENUE")}</SelectItem>
                <SelectItem value={AccountType.EXPENSE}>{t("types.EXPENSE")}</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.type && (
              <p className="text-xs text-destructive">
                {form.formState.errors.type.message}
              </p>
            )}
          </div>

          {/* Parent Account */}
          <div className="space-y-1.5">
            <Label htmlFor="parentId" className="text-start block font-medium">
              {t("parentAccount")} ({t("optional")})
            </Label>
            <Select
              value={form.watch("parentId") || "NONE"}
              onValueChange={(val) => form.setValue("parentId", val === "NONE" ? null : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("noneRootAccount")} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="NONE">{t("noneRootAccount")}</SelectItem>
                {parentOptions
                  .filter((p) => !account || p.id !== account.id)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* isPostable Switch */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">{t("isPostable")}</Label>
              <p className="text-xs text-muted-foreground">{t("isPostableDesc")}</p>
            </div>
            <Switch
              checked={form.watch("isPostable")}
              onCheckedChange={(checked) => form.setValue("isPostable", checked)}
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
