"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { FullCompanySettingsInput } from "../schemas";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useLocale } from "next-intl";

interface DocumentNumberingTabProps {
  form: UseFormReturn<FullCompanySettingsInput>;
}

export function DocumentNumberingTab({ form }: DocumentNumberingTabProps) {
  const locale = useLocale();
  const isArabic = locale === "ar";

  const fields = [
    { key: "invoicePrefix", labelAr: "بادئة فواتير المبيعات", labelEn: "Sales Invoice Prefix", defaultVal: "INV" },
    { key: "orderPrefix", labelAr: "بادئة أوامر البيع", labelEn: "Sales Order Prefix", defaultVal: "SO" },
    { key: "quotationPrefix", labelAr: "بادئة عروض الأسعار", labelEn: "Quotation Prefix", defaultVal: "QUO" },
    { key: "poPrefix", labelAr: "بادئة أوامر الشراء", labelEn: "Purchase Order Prefix", defaultVal: "PO" },
    { key: "receiptPrefix", labelAr: "بادئة إيصالات الاستلام المخزني", labelEn: "Goods Receipt Prefix", defaultVal: "GR" },
    { key: "paymentPrefix", labelAr: "بادئة سندات القبض والدفع", labelEn: "Payment Voucher Prefix", defaultVal: "PAY" },
    { key: "journalPrefix", labelAr: "بادئة قيود اليومية العامة", labelEn: "Journal Entry Prefix", defaultVal: "JRN" },
    { key: "expensePrefix", labelAr: "بادئة سندات المصروفات", labelEn: "Expense Voucher Prefix", defaultVal: "EXP" },
    { key: "returnPrefix", labelAr: "بادئة مرتجعات المبيعات", labelEn: "Sales Return Prefix", defaultVal: "RTN" },
    { key: "purchaseReturnPrefix", labelAr: "بادئة مرتجعات المشتريات", labelEn: "Purchase Return Prefix", defaultVal: "PRTN" },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="border-b pb-3">
        <h3 className="text-sm font-semibold">
          {isArabic ? "تخصيص البادئات الرقمية للمستندات" : "Document Number Prefixes"}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isArabic
            ? "يتم توليد أرقام المستندات تلقائياً بنمط متسلسل [البادئة]-[السنة]-[الرقم] مثل: INV-2026-00001"
            : "Document numbers are generated automatically as [PREFIX]-[YEAR]-[SEQUENCE], e.g. INV-2026-00001"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {fields.map((f) => (
          <div key={f.key} className="space-y-1.5 p-3 rounded-lg border bg-muted/20">
            <Label className="text-xs font-medium">
              {isArabic ? f.labelAr : f.labelEn}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                {...form.register(f.key)}
                className="text-xs h-8 font-mono font-bold uppercase"
              />
              <span className="text-[11px] text-muted-foreground font-mono">
                -{new Date().getFullYear()}-00001
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
