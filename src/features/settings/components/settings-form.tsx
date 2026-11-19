"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import {
  Building2,
  Coins,
  Percent,
  Hash,
  Landmark,
  Boxes,
  ShoppingCart,
  Users,
  Database,
  Save,
  RotateCcw,
  AlertCircle,
  Loader2,
} from "lucide-react";

import {
  fullCompanySettingsSchema,
  FullCompanySettingsInput,
} from "../schemas";
import { saveCompanySettingsAction } from "../actions/settings-actions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

import { CompanyProfileTab } from "./company-profile-tab";
import { CurrencyNumbersTab } from "./currency-numbers-tab";
import { TaxRatesTab } from "./tax-rates-tab";
import { DocumentNumberingTab } from "./document-numbering-tab";
import { AccountMappingTab } from "./account-mapping-tab";
import { InventoryRulesTab } from "./inventory-rules-tab";
import { SalesRulesTab } from "./sales-rules-tab";
import { PayrollRulesTab } from "./payroll-rules-tab";
import { BackupTab } from "./backup-tab";

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface SettingsFormProps {
  initialSettings: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  accounts: AccountOption[];
}

export function SettingsForm({ initialSettings, accounts }: SettingsFormProps) {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const [activeTab, setActiveTab] = React.useState("company");
  const [isSaving, setIsSaving] = React.useState(false);

  const defaultValues: FullCompanySettingsInput = {
    name: initialSettings.name || "",
    commercialRegister: initialSettings.commercialRegister || "",
    taxNumber: initialSettings.taxNumber || "",
    phone: initialSettings.phone || "",
    email: initialSettings.email || "",
    address: initialSettings.address || "",
    website: initialSettings.website || "",
    logoUrl: initialSettings.logoUrl || "",
    currency: initialSettings.currency || "EGP",
    currencySymbol: initialSettings.currencySymbol || "ج.م",
    decimalPlaces: Number(initialSettings.decimalPlaces ?? 2),
    useArabicIndicDigits: Boolean(initialSettings.useArabicIndicDigits),
    defaultTaxRate: Number(initialSettings.defaultTaxRate ?? 14),
    invoicePrefix: initialSettings.invoicePrefix || "INV",
    orderPrefix: initialSettings.orderPrefix || "SO",
    quotationPrefix: initialSettings.quotationPrefix || "QUO",
    poPrefix: initialSettings.poPrefix || "PO",
    receiptPrefix: initialSettings.receiptPrefix || "GR",
    returnPrefix: initialSettings.returnPrefix || "RTN",
    paymentPrefix: initialSettings.paymentPrefix || "PAY",
    journalPrefix: initialSettings.journalPrefix || "JRN",
    expensePrefix: initialSettings.expensePrefix || "EXP",
    purchaseInvoicePrefix: initialSettings.purchaseInvoicePrefix || "PINV",
    purchaseReturnPrefix: initialSettings.purchaseReturnPrefix || "PRTN",
    allowNegativeStock: Boolean(initialSettings.allowNegativeStock),
    costingMethod: (initialSettings.costingMethod || "WAC") as "WAC" | "FIFO" | "LIFO",
    blockOnCreditLimit: Boolean(initialSettings.blockOnCreditLimit),
    creditLimitBehavior: (initialSettings.creditLimitBehavior || "STRICT_BLOCK") as "STRICT_BLOCK" | "WARN_ONLY" | "IGNORE",
    arAccountId: initialSettings.arAccountId || undefined,
    apAccountId: initialSettings.apAccountId || undefined,
    salesAccountId: initialSettings.salesAccountId || undefined,
    cogsAccountId: initialSettings.cogsAccountId || undefined,
    inventoryAccountId: initialSettings.inventoryAccountId || undefined,
    taxAccountId: initialSettings.taxAccountId || undefined,
    cashAccountId: initialSettings.cashAccountId || undefined,
    bankAccountId: initialSettings.bankAccountId || undefined,
    salaryExpenseAccountId: initialSettings.salaryExpenseAccountId || undefined,
    salaryPayableAccountId: initialSettings.salaryPayableAccountId || undefined,
    absenceDeductionRate: Number(initialSettings.absenceDeductionRate ?? 1.0),
    lateDeductionRate: Number(initialSettings.lateDeductionRate ?? 0.25),
    overtimeMultiplier: Number(initialSettings.overtimeMultiplier ?? 1.5),
  };

  const form = useForm<FullCompanySettingsInput>({
    resolver: zodResolver(fullCompanySettingsSchema),
    defaultValues,
  });

  const { isDirty } = form.formState;

  // Unsaved changes warning on tab close/refresh
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const onSubmit = async (values: FullCompanySettingsInput) => {
    setIsSaving(true);
    try {
      const res = await saveCompanySettingsAction(values);
      if (res.ok) {
        toast.success(
          isArabic ? "تم حفظ إعدادات النظام بنجاح" : "System settings saved successfully"
        );
        form.reset(values);
      } else {
        toast.error(
          res.error ||
            (isArabic ? "حدث خطأ أثناء حفظ الإعدادات" : "Failed to save settings")
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unexpected error";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const tabsConfig = [
    { id: "company", labelAr: "بيانات الشركة", labelEn: "Company Profile", icon: Building2 },
    { id: "currency", labelAr: "العملة والأرقام", labelEn: "Currency & Formats", icon: Coins },
    { id: "taxes", labelAr: "الضرائب", labelEn: "Tax Rates", icon: Percent },
    { id: "numbering", labelAr: "ترقيم المستندات", labelEn: "Document Numbering", icon: Hash },
    { id: "accounts", labelAr: "شجرة الحسابات", labelEn: "Account Mapping", icon: Landmark },
    { id: "inventory", labelAr: "قواعد المخزون", labelEn: "Inventory Rules", icon: Boxes },
    { id: "sales", labelAr: "قواعد المبيعات", labelEn: "Sales Rules", icon: ShoppingCart },
    { id: "payroll", labelAr: "قواعد الرواتب", labelEn: "Payroll Rules", icon: Users },
    { id: "backup", labelAr: "النسخ الاحتياطي", labelEn: "Backup Guide", icon: Database },
  ];

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Unsaved changes alert banner */}
      {isDirty && (
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-xs font-medium">
            <AlertCircle className="size-4 text-amber-600 shrink-0" />
            <span>
              {isArabic
                ? "لديك تعديلات غير محفوظة. لا تنسَ الضغط على 'حفظ التعديلات' قبل مغادرة الصفحة."
                : "You have unsaved changes. Remember to click 'Save Changes' before leaving."}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-amber-900 dark:text-amber-200 hover:bg-amber-500/20"
              onClick={() => form.reset(defaultValues)}
            >
              <RotateCcw className="size-3.5 me-1" />
              {isArabic ? "تراجع" : "Discard"}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium"
            >
              {isSaving ? (
                <Loader2 className="size-3.5 animate-spin me-1" />
              ) : (
                <Save className="size-3.5 me-1" />
              )}
              {isArabic ? "حفظ الآن" : "Save Now"}
            </Button>
          </div>
        </div>
      )}

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Scrollable Tabs List */}
        <div className="overflow-x-auto pb-1">
          <TabsList className="inline-flex h-10 w-auto min-w-full justify-start gap-1 p-1 bg-muted/60 rounded-xl border">
            {tabsConfig.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="gap-2 text-xs font-medium px-3.5 py-1.5 rounded-lg whitespace-nowrap data-active:bg-background data-active:text-foreground data-active:shadow-sm"
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span>{isArabic ? tab.labelAr : tab.labelEn}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Tab Panels */}
        <Card className="mt-4 border rounded-xl shadow-xs">
          <CardContent className="p-6">
            <TabsContent value="company">
              <CompanyProfileTab form={form} />
            </TabsContent>

            <TabsContent value="currency">
              <CurrencyNumbersTab form={form} />
            </TabsContent>

            <TabsContent value="taxes">
              <TaxRatesTab form={form} />
            </TabsContent>

            <TabsContent value="numbering">
              <DocumentNumberingTab form={form} />
            </TabsContent>

            <TabsContent value="accounts">
              <AccountMappingTab form={form} accounts={accounts} />
            </TabsContent>

            <TabsContent value="inventory">
              <InventoryRulesTab form={form} />
            </TabsContent>

            <TabsContent value="sales">
              <SalesRulesTab form={form} />
            </TabsContent>

            <TabsContent value="payroll">
              <PayrollRulesTab form={form} />
            </TabsContent>

            <TabsContent value="backup">
              <BackupTab />
            </TabsContent>

            {/* Bottom Actions Bar */}
            {activeTab !== "backup" && (
              <div className="mt-8 pt-5 border-t flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!isDirty || isSaving}
                  onClick={() => form.reset(defaultValues)}
                  className="text-xs"
                >
                  <RotateCcw className="size-3.5 me-1.5" />
                  {isArabic ? "إلغاء التغييرات" : "Discard Changes"}
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={isSaving}
                  className="text-xs min-w-28"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin me-1.5" />
                      <span>{isArabic ? "جاري الحفظ..." : "Saving..."}</span>
                    </>
                  ) : (
                    <>
                      <Save className="size-3.5 me-1.5" />
                      <span>{isArabic ? "حفظ التعديلات" : "Save Changes"}</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </form>
  );
}
