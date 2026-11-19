"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { accountMappingSchema, AccountMappingFormValues } from "../schemas";
import { updateAccountMappingsAction } from "../actions/settings-actions";
import { AccountMappingConfig } from "../types";

interface AccountSettingsFormProps {
  initialConfig: AccountMappingConfig;
  accounts: { id: string; code: string; name: string; label: string }[];
}

export function AccountSettingsForm({ initialConfig, accounts }: AccountSettingsFormProps) {
  const t = useTranslations("accounting.settings");

  const form = useForm<AccountMappingFormValues>({
    resolver: zodResolver(accountMappingSchema),
    defaultValues: {
      arAccountId: initialConfig.arAccountId || undefined,
      apAccountId: initialConfig.apAccountId || undefined,
      salesAccountId: initialConfig.salesAccountId || undefined,
      cogsAccountId: initialConfig.cogsAccountId || undefined,
      inventoryAccountId: initialConfig.inventoryAccountId || undefined,
      taxAccountId: initialConfig.taxAccountId || undefined,
      cashAccountId: initialConfig.cashAccountId || undefined,
      bankAccountId: initialConfig.bankAccountId || undefined,
    },
  });

  const onSubmit = async (values: AccountMappingFormValues) => {
    try {
      const res = await updateAccountMappingsAction(values);
      if (res.ok) {
        toast.success(t("savedSuccessfully"));
      } else {
        toast.error(res.error || t("failedToSave"));
      }
    } catch {
      toast.error(t("unexpectedError"));
    }
  };

  const renderSelect = (
    field: keyof AccountMappingFormValues,
    label: string,
    description: string
  ) => (
    <div className="space-y-1.5 p-3 rounded-lg border bg-muted/10">
      <Label className="text-start block font-semibold text-sm">{label}</Label>
      <p className="text-xs text-muted-foreground mb-2">{description}</p>
      <Select
        value={form.watch(field) || "DEFAULT"}
        onValueChange={(val) => form.setValue(field, val === "DEFAULT" ? null : val)}
      >
        <SelectTrigger>
          <SelectValue placeholder={t("selectAccount")} />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          <SelectItem value="DEFAULT">{t("useSeedDefault")}</SelectItem>
          {accounts.map((acc) => (
            <SelectItem key={acc.id} value={acc.id}>
              {acc.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("accountMappingTitle")}</CardTitle>
          <CardDescription>{t("accountMappingDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderSelect("arAccountId", t("fields.ar"), t("fields.arDesc"))}
          {renderSelect("apAccountId", t("fields.ap"), t("fields.apDesc"))}
          {renderSelect("salesAccountId", t("fields.sales"), t("fields.salesDesc"))}
          {renderSelect("cogsAccountId", t("fields.cogs"), t("fields.cogsDesc"))}
          {renderSelect("inventoryAccountId", t("fields.inventory"), t("fields.inventoryDesc"))}
          {renderSelect("taxAccountId", t("fields.tax"), t("fields.taxDesc"))}
          {renderSelect("cashAccountId", t("fields.cash"), t("fields.cashDesc"))}
          {renderSelect("bankAccountId", t("fields.bank"), t("fields.bankDesc"))}
        </CardContent>
        <CardFooter className="border-t justify-end py-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? t("saving") : t("saveMappings")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
