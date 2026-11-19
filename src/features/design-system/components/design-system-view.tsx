"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  DollarSign,
  TrendingUp,
  Package,
  Users,
  CheckCircle2,
  AlertTriangle,
  Info,
  Trash2,
  Sparkles,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { DateRange } from "react-day-picker";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge, type EntityStatus } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Form } from "@/components/ui/form";
import {
  FormInputField,
  FormCurrencyField,
  FormDatePickerField,
  FormSwitchField,
  FormCheckboxField,
  FormTextareaField,
} from "@/components/shared/form-fields";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { ComboboxAsync, type ComboboxOption } from "@/components/shared/combobox-async";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTable } from "@/components/shared/data-table";
import { LineItemsEditor, type LineItem } from "@/components/shared/line-items-editor";
import { formatMoney } from "@/lib/money";

interface DemoOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  date: string;
  amount: number; // in minor units
  status: EntityStatus;
}

const DEMO_ORDERS: DemoOrder[] = [
  {
    id: "ord-1",
    orderNumber: "SO-2026-0001",
    customerName: "شركة الفنار للمقاولات",
    date: "2026-03-15",
    amount: 1450000,
    status: "PAID",
  },
  {
    id: "ord-2",
    orderNumber: "SO-2026-0002",
    customerName: "مؤسسة النور لمواد البناء",
    date: "2026-03-14",
    amount: 820000,
    status: "ISSUED",
  },
  {
    id: "ord-3",
    orderNumber: "SO-2026-0003",
    customerName: "شركة اليمامة للتجارة",
    date: "2026-03-12",
    amount: 3200000,
    status: "CONFIRMED",
  },
  {
    id: "ord-4",
    orderNumber: "SO-2026-0004",
    customerName: "مؤسسة الرياض الهندسية",
    date: "2026-03-10",
    amount: 450000,
    status: "DRAFT",
  },
  {
    id: "ord-5",
    orderNumber: "SO-2026-0005",
    customerName: "شركة الخليج للتوريدات",
    date: "2026-03-08",
    amount: 980000,
    status: "CANCELLED",
  },
];

export function DesignSystemView() {
  const t = useTranslations("designSystem");

  // Form Demo State
  interface DemoFormValues {
    customerName: string;
    creditLimit: number;
    startDate?: Date;
    taxExempt: boolean;
    notificationsEnabled: boolean;
    notes: string;
  }

  const form = useForm<DemoFormValues>({
    defaultValues: {
      customerName: "شركة المسار التجاري",
      creditLimit: 5000000, // 50,000.00 SAR
      startDate: new Date(),
      taxExempt: false,
      notificationsEnabled: true,
      notes: "عميل تجاري معتمد بحساب آجل 30 يوماً.",
    },
  });

  // Date Range Demo State
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: new Date(2026, 2, 1),
    to: new Date(2026, 2, 31),
  });

  // Combobox Async Demo State
  const [selectedProduct, setSelectedProduct] = React.useState("prod-1");
  const loadProductOptions = React.useCallback(
    async (query: string): Promise<ComboboxOption[]> => {
      // Simulate network latency
      await new Promise((res) => setTimeout(res, 250));
      const allProducts: ComboboxOption[] = [
        { value: "prod-1", label: "كابل كهربائي 3×4 مم", description: "SKU: CAB-001 • متوفر: 450 م" },
        { value: "prod-2", label: "مفتاح إضاءة ذكي مزدوج", description: "SKU: SW-002 • متوفر: 80 حبة" },
        { value: "prod-3", label: "قاطع دائرة أوتوماتيكي 32A", description: "SKU: BRK-003 • متوفر: 120 حبة" },
        { value: "prod-4", label: "محبس نحاسي إيطالي 1 بوصة", description: "SKU: VLV-004 • متوفر: 35 حبة" },
      ];
      if (!query) return allProducts;
      return allProducts.filter((p) =>
        p.label.toLowerCase().includes(query.toLowerCase()) ||
        p.description?.toLowerCase().includes(query.toLowerCase())
      );
    },
    []
  );

  // Confirm Dialog State
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmLoading, setConfirmLoading] = React.useState(false);

  // Line Items Demo State
  const [lineItems, setLineItems] = React.useState<LineItem[]>([
    {
      id: "li-1",
      description: "كابل نحاسي معزول 4 مم - لفة 100م",
      quantity: 10,
      unitPrice: 35000, // 350.00 SAR
      taxRate: 15,
      discount: 10000, // 100.00 SAR
    },
    {
      id: "li-2",
      description: "لوحة توزيع كهربائية 12 خط",
      quantity: 2,
      unitPrice: 120000, // 1200.00 SAR
      taxRate: 15,
      discount: 0,
    },
  ]);

  const handleLineItemsChange = (newItems: LineItem[]) => {
    setLineItems(newItems);
  };

  // DataTable Columns Definition
  const columns = React.useMemo<ColumnDef<DemoOrder, unknown>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            className="rounded border-border"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="rounded border-border"
            checked={row.getIsSelected()}
            onChange={(e) => row.toggleSelected(!!e.target.checked)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "orderNumber",
        header: "رقم الأمر",
        cell: ({ row }) => (
          <span className="font-mono font-medium text-foreground">
            {row.original.orderNumber}
          </span>
        ),
      },
      {
        accessorKey: "customerName",
        header: "العميل",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.original.customerName}
          </span>
        ),
      },
      {
        accessorKey: "date",
        header: "التاريخ",
        cell: ({ row }) => (
          <span className="font-mono text-muted-foreground">
            {row.original.date}
          </span>
        ),
      },
      {
        accessorKey: "amount",
        header: "المبلغ الإجمالي",
        cell: ({ row }) => (
          <span className="font-mono font-semibold tabular-nums text-foreground">
            {formatMoney(row.original.amount, { currency: "SAR", locale: "ar-SA" })}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "الحالة",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    []
  );

  return (
    <div className="space-y-10 pb-16">
      {/* 1. Page Header */}
      <PageHeader
        title={t("title")}
        description={t("description")}
        badge={
          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
            <Sparkles className="me-1 h-3.5 w-3.5" />
            {t("devOnlyBadge")}
          </Badge>
        }
      >
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          تحديث الصفحة
        </Button>
        <Button
          size="sm"
          onClick={() =>
            toast.success("تم تشغيل الإجراء الرئيسي بنجاح!", {
              description: "إشعار تفاعلي فوري من منظومة Sonner.",
            })
          }
        >
          إجراء تجريبي
        </Button>
      </PageHeader>

      {/* 2. Visual Language & Color Tokens */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            {t("visualLanguage")}
          </h2>
          <p className="text-xs text-muted-foreground">
            الألوان المعتمدة: اللون الرئيسي الأخضر المائل للزرقة (Deep Teal #0F766E) مع خلفيات رمادية هادئة (Slate) وتدرجات دلالية معتمدة.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
          <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
            <div className="h-10 w-full rounded-lg bg-primary shadow-xs" />
            <p className="mt-2 text-xs font-semibold text-foreground">Primary Accent</p>
            <p className="font-mono text-[10px] text-muted-foreground">#0F766E (Teal)</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
            <div className="h-10 w-full rounded-lg bg-emerald-600 shadow-xs" />
            <p className="mt-2 text-xs font-semibold text-foreground">Success</p>
            <p className="font-mono text-[10px] text-muted-foreground">Emerald 600</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
            <div className="h-10 w-full rounded-lg bg-amber-500 shadow-xs" />
            <p className="mt-2 text-xs font-semibold text-foreground">Warning</p>
            <p className="font-mono text-[10px] text-muted-foreground">Amber 500</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
            <div className="h-10 w-full rounded-lg bg-rose-600 shadow-xs" />
            <p className="mt-2 text-xs font-semibold text-foreground">Destructive</p>
            <p className="font-mono text-[10px] text-muted-foreground">Rose 600</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
            <div className="h-10 w-full rounded-lg bg-sky-500 shadow-xs" />
            <p className="mt-2 text-xs font-semibold text-foreground">Info</p>
            <p className="font-mono text-[10px] text-muted-foreground">Sky 500</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
            <div className="h-10 w-full rounded-lg bg-muted border border-border shadow-xs" />
            <p className="mt-2 text-xs font-semibold text-foreground">Muted Slate</p>
            <p className="font-mono text-[10px] text-muted-foreground">Slate Surface</p>
          </div>
        </div>
      </section>

      <Separator />

      {/* 3. Stat Cards */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            {t("stats")}
          </h2>
          <p className="text-xs text-muted-foreground">
            بطاقات المؤشرات الرقمية مع دعم الأرقام الجدلية (tabular-nums) وشارات التغيير الشهرية.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="إجمالي المبيعات"
            value="142,850 ر.س"
            change={14.8}
            changePeriod="مقارنة بالشهر السابق"
            icon={DollarSign}
          />
          <StatCard
            title="أوامر البيع النشطة"
            value="128"
            change={-3.2}
            changePeriod="مقارنة بالشهر السابق"
            icon={TrendingUp}
          />
          <StatCard
            title="الأصناف في المخزون"
            value="1,420"
            change={0}
            changePeriod="مستقر"
            icon={Package}
          />
          <StatCard
            title="المستخدمين النشطين"
            value="18"
            description="3 متصلين الآن"
            icon={Users}
            loading={false}
          />
        </div>
      </section>

      <Separator />

      {/* 4. Status Badges */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            {t("statusBadges")}
          </h2>
          <p className="text-xs text-muted-foreground">
            شارات الحالة الدلالية المستخدمة في جداول الفواتير، الأوامر، الحسابات، وسندات القبض.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <StatusBadge status="PAID" />
          <StatusBadge status="APPROVED" />
          <StatusBadge status="ACTIVE" />
          <StatusBadge status="CONFIRMED" />
          <StatusBadge status="ISSUED" />
          <StatusBadge status="PARTIALLY_PAID" />
          <StatusBadge status="PENDING" />
          <StatusBadge status="DRAFT" />
          <StatusBadge status="VOID" />
          <StatusBadge status="CANCELLED" />
          <StatusBadge status="REJECTED" />
          <StatusBadge status="INACTIVE" />
        </div>
      </section>

      <Separator />

      {/* 5. Button Variants & Feedback Toasts */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            {t("buttons")} &amp; الإشعارات (Toasts)
          </h2>
          <p className="text-xs text-muted-foreground">
            كافة أنماط الأزرار وإشعارات Sonner بمختلف الحالات.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="default">Primary Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link Style</Button>
          <Button disabled>Disabled</Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
            onClick={() => toast.success("تم الحفظ بنجاح!", { description: "سجلت البيانات في قاعدة البيانات." })}
          >
            <CheckCircle2 className="me-1.5 h-3.5 w-3.5" />
            Toast Success
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300"
            onClick={() => toast.warning("تنبيه: اقتراب الحد الائتماني", { description: "تبقى 500 ر.س على تجاوز الحد." })}
          >
            <AlertTriangle className="me-1.5 h-3.5 w-3.5" />
            Toast Warning
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300"
            onClick={() => toast.error("فشلت العملية", { description: "يرجى التحقق من صحة المدخلات." })}
          >
            <Trash2 className="me-1.5 h-3.5 w-3.5" />
            Toast Error
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.info("تحديث جديد متوفر", { description: "تم تحديث أسعار الصرف لليوم." })}
          >
            <Info className="me-1.5 h-3.5 w-3.5" />
            Toast Info
          </Button>
        </div>
      </section>

      <Separator />

      {/* 6. Form Controls & Pickers */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            {t("formControls")}
          </h2>
          <p className="text-xs text-muted-foreground">
            مغلفات الحقول المتوافقة مع React Hook Form و Zod: إدخال العملات بالوحدات الصغرى، اختيار التواريخ، ومربعات البحث الحي.
          </p>
        </div>

        <Card className="border-border/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">نموذج تجريبي تفاعلي</CardTitle>
            <CardDescription className="text-xs">
              جميع الحقول متصلة بـ React Hook Form مع التحقق والتنسيق الفوري.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((vals) => {
                  toast.success("تم تسليم النموذج!", {
                    description: `العميل: ${vals.customerName} • الحد: ${vals.creditLimit / 100} ر.س`,
                  });
                })}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormInputField
                    control={form.control}
                    name="customerName"
                    label="اسم العميل"
                    required
                  />

                  <FormCurrencyField
                    control={form.control}
                    name="creditLimit"
                    label="الحد الائتماني"
                    currency="ر.س"
                    required
                  />

                  <FormDatePickerField
                    control={form.control}
                    name="startDate"
                    label="تاريخ التعاقد"
                    required
                  />

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      فترة التقارير (DateRangePicker)
                    </label>
                    <DateRangePicker
                      value={dateRange}
                      onChange={setDateRange}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    اختيار صنف بالبحث غير المتزامن (ComboboxAsync)
                  </label>
                  <ComboboxAsync
                    value={selectedProduct}
                    onChange={(val) => setSelectedProduct(val)}
                    loadOptions={loadProductOptions}
                    placeholder="ابحث عن منتج بالاسم أو الرمز..."
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormSwitchField
                    control={form.control}
                    name="taxExempt"
                    label="إعفاء ضريبي"
                    description="العميل معفى من ضريبة القيمة المضافة بموجب شهادة رسمية"
                  />

                  <FormCheckboxField
                    control={form.control}
                    name="notificationsEnabled"
                    label="إرسال إشعارات الفواتير عبر البريد والرسائل"
                    description="سيتم إرسال إشعار فوري عند إصدار أي فاتورة جديدة"
                  />
                </div>

                <FormTextareaField
                  control={form.control}
                  name="notes"
                  label="ملاحظات الحساب"
                  rows={2}
                />

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => form.reset()}>
                    إعادة ضبط
                  </Button>
                  <Button type="submit" size="sm">
                    حفظ النموذج التجريبي
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* 7. Dialogs & Confirmations */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            {t("dialogs")}
          </h2>
          <p className="text-xs text-muted-foreground">
            نوافذ التأكيد التفاعلية للعمليات الحساسة (الحذف، الإلغاء، التعطيل) مع دعم حالة الانتظار (Loading).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="me-1.5 h-3.5 w-3.5" />
            فتح نافذة تأكيد الحذف
          </Button>

          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="تأكيد حذف الفاتورة"
            description="هل أنت متأكد من رغبتك في حذف الفاتورة رقم INV-2026-0004؟ سيتم إلغاء أثرها في دفتر الأستاذ العام."
            confirmText="نعم، قم بالحذف"
            cancelText="تراجع"
            variant="destructive"
            isLoading={confirmLoading}
            onConfirm={async () => {
              setConfirmLoading(true);
              await new Promise((res) => setTimeout(res, 1200));
              setConfirmLoading(false);
              toast.success("تم الحذف بنجاح");
            }}
          />
        </div>
      </section>

      <Separator />

      {/* 8. Interactive DataTable */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            {t("dataTable")}
          </h2>
          <p className="text-xs text-muted-foreground">
            جدول بيانات متكامل بـ TanStack Table: تصفية، ترتيب، اختيار صفوف، إظهار وإخفاء الأعمدة، وتصدير CSV مع دعم كامل للغة العربية (UTF-8 BOM).
          </p>
        </div>

        <DataTable
          columns={columns}
          data={DEMO_ORDERS}
          totalCount={DEMO_ORDERS.length}
          exportFilename="masar-demo-orders"
          searchPlaceholder="بحث في رقم الأمر أو اسم العميل..."
          bulkActions={(selected) => (
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                toast.success(`تم تنفيذ الإجراء الجماعي على ${selected.length} صف(وف)`);
              }}
            >
              حذف المحدد ({selected.length})
            </Button>
          )}
        />
      </section>

      <Separator />

      {/* 9. Financial Line Items Editor */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            {t("lineItems")}
          </h2>
          <p className="text-xs text-muted-foreground">
            محرر بنود الفواتير وعروض الأسعار التفاعلي مع حساب فوري للخصومات، الضرائب، والمجموع الكلي بدون أخطاء النقطة العائمة (Minor Units).
          </p>
        </div>

        <LineItemsEditor
          items={lineItems}
          onChange={handleLineItemsChange}
          currency="ر.س"
        />
      </section>

      <Separator />

      {/* 10. Empty & Error States */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            {t("emptyError")}
          </h2>
          <p className="text-xs text-muted-foreground">
            مكونات الحالة الافتراضية عند عدم توفر سجلات أو عند حدوث خطأ غير متوقع.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <EmptyState
            title="لا توجد عروض أسعار نشطة"
            description="لم يتم إنشاء أي عروض أسعار لهذا العميل بعد. يمكنك إنشاء عرض سعر جديد بنقرة واحدة."
            action={
              <Button size="sm" variant="outline">
                إنشاء عرض سعر جديد
              </Button>
            }
          />

          <ErrorState
            title="فشل تحميل بيانات المخزون"
            description="تعذر الاتصال بقاعدة البيانات لجلب كميات المستودع. يرجى إعادة المحاولة."
            onRetry={() => toast.info("جاري إعادة المحاولة...")}
          />
        </div>
      </section>
    </div>
  );
}
