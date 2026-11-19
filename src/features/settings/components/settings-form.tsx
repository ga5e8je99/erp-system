"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
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
  Search,
  X,
  Layers,
} from "lucide-react";

import {
  fullCompanySettingsSchema,
  FullCompanySettingsInput,
} from "../schemas";
import { saveCompanySettingsAction } from "../actions/settings-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type TabGroup = "ALL" | "GENERAL" | "FINANCIAL" | "OPERATIONS";

const TABS_CONFIG = [
  {
    id: "company",
    labelAr: "بيانات الشركة",
    labelEn: "Company Profile",
    icon: Building2,
    group: "GENERAL" as const,
    keywords: ["شركة", "شعار", "سجل", "عنوان", "هاتف", "company", "profile", "logo", "phone", "tax"],
  },
  {
    id: "currency",
    labelAr: "العملة والأرقام",
    labelEn: "Currency & Formats",
    icon: Coins,
    group: "GENERAL" as const,
    keywords: ["عملة", "أرقام", "فواصل", "عربية", "currency", "format", "decimals", "digits"],
  },
  {
    id: "taxes",
    labelAr: "الضرائب",
    labelEn: "Tax Rates",
    icon: Percent,
    group: "FINANCIAL" as const,
    keywords: ["ضريبة", "قيمة مضافة", "vat", "tax", "rate"],
  },
  {
    id: "numbering",
    labelAr: "ترقيم المستندات",
    labelEn: "Document Numbering",
    icon: Hash,
    group: "GENERAL" as const,
    keywords: ["ترقيم", "بادئة", "تسلسل", "فواتير", "prefix", "numbering", "sequence"],
  },
  {
    id: "accounts",
    labelAr: "شجرة الحسابات",
    labelEn: "Account Mapping",
    icon: Landmark,
    group: "FINANCIAL" as const,
    keywords: ["حسابات", "شجرة", "ترحيل", "عملاء", "موردين", "مخزون", "accounting", "mapping", "gl"],
  },
  {
    id: "inventory",
    labelAr: "قواعد المخزون",
    labelEn: "Inventory Rules",
    icon: Boxes,
    group: "OPERATIONS" as const,
    keywords: ["مخزون", "سالب", "تقييم", "تكلفة", "inventory", "stock", "negative", "fifo", "wac"],
  },
  {
    id: "sales",
    labelAr: "قواعد المبيعات",
    labelEn: "Sales Rules",
    icon: ShoppingCart,
    group: "FINANCIAL" as const,
    keywords: ["مبيعات", "ائتمان", "حد", "حظر", "sales", "credit", "limit"],
  },
  {
    id: "payroll",
    labelAr: "قواعد الرواتب",
    labelEn: "Payroll Rules",
    icon: Users,
    group: "OPERATIONS" as const,
    keywords: ["رواتب", "إضافي", "غياب", "تأخير", "خصم", "payroll", "overtime", "absence", "late"],
  },
  {
    id: "backup",
    labelAr: "النسخ الاحتياطي",
    labelEn: "Backup Guide",
    icon: Database,
    group: "OPERATIONS" as const,
    keywords: ["نسخ", "قاعدة", "حفظ", "استعادة", "backup", "restore", "database"],
  },
];

export function SettingsForm({ initialSettings, accounts }: SettingsFormProps) {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const tSettings = useTranslations("settings");
  const [activeTab, setActiveTab] = React.useState("company");
  const [selectedGroup, setSelectedGroup] = React.useState<TabGroup>("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");
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

  const filteredTabs = React.useMemo(() => {
    return TABS_CONFIG.filter((tab) => {
      // Group filter
      if (selectedGroup !== "ALL" && tab.group !== selectedGroup) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesAr = tab.labelAr.toLowerCase().includes(query);
        const matchesEn = tab.labelEn.toLowerCase().includes(query);
        const matchesKeyword = tab.keywords.some((k) => k.toLowerCase().includes(query));
        return matchesAr || matchesEn || matchesKeyword;
      }
      return true;
    });
  }, [selectedGroup, searchQuery]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Search and Grouping Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={tSettings("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 ps-9 pe-8 text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute end-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Group Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Button
            type="button"
            variant={selectedGroup === "ALL" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSelectedGroup("ALL")}
            className="h-8 text-xs"
          >
            <Layers className="me-1 h-3.5 w-3.5" />
            <span>{isArabic ? "الكل (9)" : "All (9)"}</span>
          </Button>
          <Button
            type="button"
            variant={selectedGroup === "GENERAL" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSelectedGroup("GENERAL")}
            className="h-8 text-xs"
          >
            <Building2 className="me-1 h-3.5 w-3.5" />
            <span>{tSettings("groupGeneral")}</span>
          </Button>
          <Button
            type="button"
            variant={selectedGroup === "FINANCIAL" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSelectedGroup("FINANCIAL")}
            className="h-8 text-xs"
          >
            <Landmark className="me-1 h-3.5 w-3.5" />
            <span>{tSettings("groupFinancial")}</span>
          </Button>
          <Button
            type="button"
            variant={selectedGroup === "OPERATIONS" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSelectedGroup("OPERATIONS")}
            className="h-8 text-xs"
          >
            <Boxes className="me-1 h-3.5 w-3.5" />
            <span>{tSettings("groupOperations")}</span>
          </Button>
        </div>
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Scrollable Tabs List */}
        <div className="overflow-x-auto pb-1 scrollbar-thin">
          <TabsList className="inline-flex h-10 w-auto min-w-full justify-start gap-1 p-1 bg-muted/60 rounded-xl border">
            {filteredTabs.map((tab) => {
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

            {/* Bottom Actions Bar inside Card */}
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

      {/* Sticky Bottom Save Bar (shows when isDirty is true) */}
      {isDirty && (
        <div className="sticky bottom-4 z-40 mx-auto flex w-full max-w-3xl items-center justify-between rounded-2xl border border-amber-500/40 bg-card/95 p-3.5 shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                {isArabic ? "لديك تعديلات غير محفوظة" : "You have unsaved changes"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isArabic
                  ? "تم تعديل بعض الإعدادات. احفظ التعديلات لتطبيقها على النظام."
                  : "Settings have been modified. Save to apply them to the system."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => form.reset(defaultValues)}
              disabled={isSaving}
              className="text-xs"
            >
              <RotateCcw className="me-1.5 h-3.5 w-3.5" />
              {isArabic ? "تراجع" : "Discard"}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="bg-primary text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              {isSaving ? (
                <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="me-1.5 h-3.5 w-3.5" />
              )}
              {isArabic ? "حفظ التعديلات" : "Save Changes"}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
