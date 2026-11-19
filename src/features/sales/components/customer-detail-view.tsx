"use client";

import * as React from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import {
  FileText,
  CreditCard,
  History,
  Phone,
  Mail,
  MapPin,
  Building,
  Printer,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { CustomerFormDialog } from "./customer-form-dialog";
import type { CustomerDetailPayload } from "../types";

interface CustomerDetailViewProps {
  customer: CustomerDetailPayload;
}

export function CustomerDetailView({ customer }: CustomerDetailViewProps) {
  const t = useTranslations("sales.customers");
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);

  const balance = Number(customer.balance);
  const creditLimit = Number(customer.creditLimit);
  const totalSales = customer.invoices
    .filter((i) => i.status !== "VOID")
    .reduce((sum, i) => sum + Number(i.total), 0);
  const invoicesCount = customer.invoices.length;
  const paymentsCount = customer.payments.length;
  const isOverLimit = creditLimit > 0 && balance > creditLimit;

  // Print Statement of Account handler
  const handlePrintStatement = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Customer Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-xl border bg-card p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm px-2.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
              {customer.code}
            </span>
            <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
            {customer.phone && (
              <span className="flex items-center gap-1.5" dir="ltr">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {customer.phone}
              </span>
            )}
            {customer.email && (
              <span className="flex items-center gap-1.5" dir="ltr">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                {customer.email}
              </span>
            )}
            {customer.taxNumber && (
              <span className="flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-muted-foreground" />
                الرقم الضريبي: <span className="font-mono font-medium text-foreground">{customer.taxNumber}</span>
              </span>
            )}
            {customer.address && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {customer.address}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            تعديل البيانات
          </Button>
          <Button
            size="sm"
            onClick={() => router.push(`/sales/invoices`)}
            className="flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>فاتورة جديدة</span>
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t("balance")}
          value={`${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س`}
          description={
            isOverLimit ? "تجاوز الحد الائتماني المسموح" : "الرصيد المستحق في الذمة"
          }
          icon={AlertTriangle}
          className={isOverLimit ? "border-destructive/50 bg-destructive/5" : ""}
        />
        <StatCard
          title={t("creditLimit")}
          value={
            creditLimit > 0
              ? `${creditLimit.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س`
              : "غير محدد"
          }
          description="أقصى مديونية مسموحة"
          icon={CreditCard}
        />
        <StatCard
          title={t("totalSales")}
          value={`${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س`}
          description={`${invoicesCount} فاتورة مبيعات`}
          icon={FileText}
        />
        <StatCard
          title="سندات التحصيل"
          value={`${paymentsCount} سند`}
          description="إجمالي المقبوضات المسجلة"
          icon={History}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="statement" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[480px]">
          <TabsTrigger value="statement">{t("tabs.statement")}</TabsTrigger>
          <TabsTrigger value="invoices">{t("tabs.invoices")}</TabsTrigger>
          <TabsTrigger value="payments">{t("tabs.payments")}</TabsTrigger>
          <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
        </TabsList>

        {/* Tab 1: Statement of Account (كشف الحساب التفصيلي) */}
        <TabsContent value="statement" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">{t("statement.title")}</CardTitle>
                <CardDescription>
                  سجل تفصيلي بكافة الحركات والقيود المدينة والدائنة مع احتساب الرصيد التراكمي
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintStatement}
                className="flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" />
                <span>{t("statement.printStatement")}</span>
              </Button>
            </CardHeader>
            <CardContent>
              {customer.statementOfAccount.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {t("statement.noTransactions")}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground">
                      <tr>
                        <th className="p-3 text-start">{t("statement.date")}</th>
                        <th className="p-3 text-start">{t("statement.type")}</th>
                        <th className="p-3 text-start">{t("statement.reference")}</th>
                        <th className="p-3 text-start min-w-[200px]">{t("statement.description")}</th>
                        <th className="p-3 text-end">{t("statement.debit")}</th>
                        <th className="p-3 text-end">{t("statement.credit")}</th>
                        <th className="p-3 text-end">{t("statement.balance")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {customer.statementOfAccount.map((entry) => (
                        <tr key={entry.id} className="hover:bg-muted/20">
                          <td className="p-3 font-mono text-xs">
                            {new Date(entry.date).toLocaleDateString("ar-EG")}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={
                                entry.type === "INVOICE"
                                  ? "default"
                                  : entry.type === "PAYMENT"
                                  ? "outline"
                                  : "secondary"
                              }
                              className="text-[11px]"
                            >
                              {entry.type === "INVOICE"
                                ? "فاتورة مبيعات"
                                : entry.type === "PAYMENT"
                                ? "سند قبض"
                                : "مرتجع مبيعات"}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono font-medium text-xs">
                            {entry.referenceNumber}
                          </td>
                          <td className="p-3 text-muted-foreground text-xs">
                            {entry.description}
                          </td>
                          <td className="p-3 text-end font-mono">
                            {entry.debit > 0 ? (
                              <span className="text-amber-600 font-semibold flex items-center justify-end gap-1">
                                <ArrowUpRight className="h-3 w-3" />
                                {entry.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="p-3 text-end font-mono">
                            {entry.credit > 0 ? (
                              <span className="text-emerald-600 font-semibold flex items-center justify-end gap-1">
                                <ArrowDownLeft className="h-3 w-3" />
                                {entry.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="p-3 text-end font-mono font-bold">
                            <span
                              className={
                                entry.runningBalance > 0
                                  ? "text-amber-600"
                                  : entry.runningBalance < 0
                                  ? "text-emerald-600"
                                  : "text-muted-foreground"
                              }
                            >
                              {entry.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t bg-muted/40 font-bold text-xs">
                      <tr>
                        <td colSpan={4} className="p-3 text-start">
                          {t("statement.currentBalance")}
                        </td>
                        <td colSpan={3} className="p-3 text-end font-mono text-base text-primary">
                          {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Invoices (الفواتير) */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">{t("tabs.invoices")}</CardTitle>
                <CardDescription>فواتير المبيعات الصادرة والمسودات الخاصة بالعميل</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {customer.invoices.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  لا توجد فواتير مبيعات مسجلة لهذا العميل.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground">
                      <tr>
                        <th className="p-3 text-start">رقم الفاتورة</th>
                        <th className="p-3 text-start">تاريخ الإصدار</th>
                        <th className="p-3 text-start">تاريخ الاستحقاق</th>
                        <th className="p-3 text-end">الإجمالي</th>
                        <th className="p-3 text-end">المسدد</th>
                        <th className="p-3 text-end">المتبقي</th>
                        <th className="p-3 text-center">الحالة</th>
                        <th className="p-3 text-end"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {customer.invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-muted/20">
                          <td className="p-3 font-mono font-medium text-primary">
                            {inv.invoiceNumber}
                          </td>
                          <td className="p-3 font-mono text-xs">
                            {new Date(inv.issueDate).toLocaleDateString("ar-EG")}
                          </td>
                          <td className="p-3 font-mono text-xs text-muted-foreground">
                            {new Date(inv.dueDate).toLocaleDateString("ar-EG")}
                          </td>
                          <td className="p-3 text-end font-mono font-bold">
                            {Number(inv.total).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                          </td>
                          <td className="p-3 text-end font-mono text-emerald-600">
                            {Number(inv.paidAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                          </td>
                          <td className="p-3 text-end font-mono text-amber-600">
                            {(Number(inv.total) - Number(inv.paidAmount)).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                          </td>
                          <td className="p-3 text-center">
                            <StatusBadge status={inv.status} />
                          </td>
                          <td className="p-3 text-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/sales/invoices/${inv.id}`)}
                            >
                              عرض
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Payments (سندات القبض) */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">{t("tabs.payments")}</CardTitle>
                <CardDescription>المقبوضات المسددة من العميل نقدياً أو بنكياً</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {customer.payments.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  لا توجد سندات قبض مسجلة لهذا العميل.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground">
                      <tr>
                        <th className="p-3 text-start">رقم السند</th>
                        <th className="p-3 text-start">التاريخ</th>
                        <th className="p-3 text-start">طريقة الدفع</th>
                        <th className="p-3 text-start">الفاتورة المسددة</th>
                        <th className="p-3 text-start">المرجع</th>
                        <th className="p-3 text-end">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {customer.payments.map((pmt) => (
                        <tr key={pmt.id} className="hover:bg-muted/20">
                          <td className="p-3 font-mono font-medium text-primary">
                            {pmt.paymentNumber}
                          </td>
                          <td className="p-3 font-mono text-xs">
                            {new Date(pmt.date).toLocaleDateString("ar-EG")}
                          </td>
                          <td className="p-3 text-xs">
                            <Badge variant="outline">{pmt.method}</Badge>
                          </td>
                          <td className="p-3 font-mono text-xs">
                            {pmt.invoice ? pmt.invoice.invoiceNumber : "على الحساب"}
                          </td>
                          <td className="p-3 font-mono text-xs text-muted-foreground">
                            {pmt.reference || "—"}
                          </td>
                          <td className="p-3 text-end font-mono font-bold text-emerald-600">
                            {Number(pmt.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Overview & Notes */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">بيانات الاتصال والتراخيص</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">الاسم التجاري:</span>
                <p className="font-semibold">{customer.name}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">كود العميل:</span>
                <p className="font-mono">{customer.code}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">رقم الهاتف:</span>
                <p className="font-mono">{customer.phone || "غير مسجل"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">البريد الإلكتروني:</span>
                <p className="font-mono">{customer.email || "غير مسجل"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">الرقم الضريبي:</span>
                <p className="font-mono">{customer.taxNumber || "غير مسجل"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">العنوان:</span>
                <p>{customer.address || "غير مسجل"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Customer Dialog */}
      <CustomerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={{
          id: customer.id,
          code: customer.code,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          taxNumber: customer.taxNumber,
          creditLimit: Number(customer.creditLimit),
        }}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
