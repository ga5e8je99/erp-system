"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { FullCompanySettingsInput } from "../schemas";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "next-intl";

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface AccountMappingTabProps {
  form: UseFormReturn<FullCompanySettingsInput>;
  accounts: AccountOption[];
}

export function AccountMappingTab({ form, accounts }: AccountMappingTabProps) {
  const locale = useLocale();
  const isArabic = locale === "ar";

  const mappings = [
    {
      key: "arAccountId",
      labelAr: "حساب المدينين / العملاء (AR)",
      labelEn: "Accounts Receivable (AR)",
      descAr: "يقيد فيه إجمالي المبيعات الآجلة للعملاء",
      descEn: "Debited on sales invoice issuance",
      expectedType: "ASSET",
    },
    {
      key: "apAccountId",
      labelAr: "حساب الدائنين / الموردين (AP)",
      labelEn: "Accounts Payable (AP)",
      descAr: "يقيد فيه التزامات فواتير الشراء للموردين",
      descEn: "Credited on purchase invoice posting",
      expectedType: "LIABILITY",
    },
    {
      key: "salesAccountId",
      labelAr: "حساب إيرادات المبيعات",
      labelEn: "Sales Revenue Account",
      descAr: "يقيد فيه إيراد بيع المنتجات والبضائع",
      descEn: "Credited for sales revenue",
      expectedType: "REVENUE",
    },
    {
      key: "cogsAccountId",
      labelAr: "حساب تكلفة البضاعة المباعة (COGS)",
      labelEn: "Cost of Goods Sold (COGS)",
      descAr: "يقيد فيه تكلفة المخزون المنصرف للبيع",
      descEn: "Debited for cost of inventory sold",
      expectedType: "EXPENSE",
    },
    {
      key: "inventoryAccountId",
      labelAr: "حساب مخزون البضائع للبيع",
      labelEn: "Inventory Asset Account",
      descAr: "أصل المخزون يتأثر بالوارد والمنصرف والتسويات",
      descEn: "Credited on stock out, debited on stock receipt",
      expectedType: "ASSET",
    },
    {
      key: "taxAccountId",
      labelAr: "حساب ضريبة القيمة المضافة المستحقة",
      labelEn: "VAT Tax Payable Account",
      descAr: "ضريبة المخرجات والمدخلات المحصلة والمسددة",
      descEn: "VAT payable/refundable control account",
      expectedType: "LIABILITY",
    },
    {
      key: "cashAccountId",
      labelAr: "حساب الخزينة الرئيسية (النقدية)",
      labelEn: "Cash on Hand Account",
      descAr: "المقبوضات والمدفوعات النقدية الفورية",
      descEn: "Petty cash and drawer collections",
      expectedType: "ASSET",
    },
    {
      key: "bankAccountId",
      labelAr: "حساب البنك التجاري",
      labelEn: "Bank Account",
      descAr: "التحويلات البنكية والشيكات وسندات السداد",
      descEn: "Main bank operational checking account",
      expectedType: "ASSET",
    },
    {
      key: "salaryExpenseAccountId",
      labelAr: "حساب مصروف الرواتب والأجور",
      labelEn: "Salaries Expense Account",
      descAr: "يقيد فيه إجمالي استحقاق الرواتب الشهرية",
      descEn: "Debited upon monthly payroll approval",
      expectedType: "EXPENSE",
    },
    {
      key: "salaryPayableAccountId",
      labelAr: "حساب الرواتب المستحقة (أمانات)",
      labelEn: "Salaries Payable Account",
      descAr: "التزام الرواتب بانتظار الصرف البنكي أو النقدي",
      descEn: "Credited on payroll approval, debited on payment",
      expectedType: "LIABILITY",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="border-b pb-3">
        <h3 className="text-sm font-semibold">
          {isArabic ? "ربط الحسابات المحاسبية الافتراضية" : "General Ledger Account Mapping"}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isArabic
            ? "تحدد هذه الحسابات القيود المحاسبية التلقائية الناتجة عن المبيعات والمشتريات وحركات المخزون والرواتب"
            : "Mapped default chart-of-accounts for automatic double-entry journal postings across operations"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mappings.map((m) => {
          const currentValue = form.watch(m.key);
          return (
            <div key={m.key} className="space-y-1.5 p-3 rounded-lg border bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  {isArabic ? m.labelAr : m.labelEn}
                </Label>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {m.expectedType}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {isArabic ? m.descAr : m.descEn}
              </p>
              <Select
                value={currentValue || "none"}
                onValueChange={(val) =>
                  form.setValue(m.key, val === "none" ? null : val, {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger className="text-xs h-8 bg-background">
                  <SelectValue placeholder={isArabic ? "اختر الحساب..." : "Select account..."} />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="none" className="text-xs text-muted-foreground">
                    {isArabic ? "— بدون تعيين —" : "— Unassigned —"}
                  </SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id} className="text-xs">
                      <span className="font-mono font-bold me-1.5">{acc.code}</span>
                      <span>{acc.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
