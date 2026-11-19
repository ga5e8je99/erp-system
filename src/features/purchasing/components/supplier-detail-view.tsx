"use client";

import * as React from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import {
  Building2,
  Phone,
  Mail,
  FileText,
  Printer,
  Package,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import type { SupplierDetailPayload } from "../types";

interface SupplierDetailViewProps {
  supplier: SupplierDetailPayload;
}

export function SupplierDetailView({ supplier }: SupplierDetailViewProps) {
  const t = useTranslations("purchasing.suppliers");
  const tStatement = useTranslations("purchasing.statement");
  const router = useRouter();

  const handlePrintStatement = () => {
    window.print();
  };

  const balance = Number(supplier.balance);

  return (
    <div className="space-y-6">
      {/* Header Profile Card */}
      <Card className="border-t-4 border-t-primary">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 text-primary rounded-xl">
                <Building2 className="h-8 w-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">
                    {supplier.name}
                  </h1>
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                    {supplier.code}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
                  {supplier.phone && (
                    <span className="flex items-center gap-1.5" dir="ltr">
                      <Phone className="h-4 w-4" />
                      {supplier.phone}
                    </span>
                  )}
                  {supplier.email && (
                    <span className="flex items-center gap-1.5" dir="ltr">
                      <Mail className="h-4 w-4" />
                      {supplier.email}
                    </span>
                  )}
                  {supplier.taxNumber && (
                    <span className="flex items-center gap-1.5 font-mono">
                      <FileText className="h-4 w-4" />
                      {supplier.taxNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Overview Stats */}
            <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-lg border w-full md:w-auto justify-between md:justify-end">
              <div>
                <div className="text-xs text-muted-foreground">
                  {t("currentBalance")} (مستحقات)
                </div>
                <div
                  className={`text-xl font-bold font-mono ${
                    balance > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"
                  }`}
                >
                  {balance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}{" "}
                  ر.س
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="statement" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full h-auto p-1">
          <TabsTrigger value="statement" className="py-2">
            {t("statement")}
          </TabsTrigger>
          <TabsTrigger value="orders" className="py-2">
            {t("orders")} ({supplier.orders.length})
          </TabsTrigger>
          <TabsTrigger value="receipts" className="py-2">
            {t("receipts")} ({supplier.receipts.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="py-2">
            {t("invoices")} ({supplier.invoices.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="py-2">
            {t("payments")} ({supplier.payments.length})
          </TabsTrigger>
          <TabsTrigger value="overview" className="py-2">
            {t("overview")}
          </TabsTrigger>
        </TabsList>

        {/* 1. Statement of Account Tab */}
        <TabsContent value="statement" className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">{tStatement("title")}</h3>
              <p className="text-sm text-muted-foreground">
                {tStatement("subtitle")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintStatement}
              className="flex items-center gap-1.5"
            >
              <Printer className="h-4 w-4" />
              <span>{tStatement("printStatement")}</span>
            </Button>
          </div>

          <div className="rounded-md border bg-card overflow-x-auto print:border-none">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted/50 border-b text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-3 text-start">{tStatement("date")}</th>
                  <th className="py-2.5 px-3 text-start">{tStatement("type")}</th>
                  <th className="py-2.5 px-3 text-start">
                    {tStatement("reference")}
                  </th>
                  <th className="py-2.5 px-3 text-start">
                    {tStatement("description")}
                  </th>
                  <th className="py-2.5 px-3 text-end">{tStatement("debit")}</th>
                  <th className="py-2.5 px-3 text-end">{tStatement("credit")}</th>
                  <th className="py-2.5 px-3 text-end">
                    {tStatement("runningBalance")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {supplier.statementOfAccount.entries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      {tStatement("noTransactions")}
                    </td>
                  </tr>
                ) : (
                  supplier.statementOfAccount.entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono text-xs">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            entry.type === "INVOICE"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                              : entry.type === "PAYMENT"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                        >
                          {entry.type === "INVOICE"
                            ? "فاتورة مشتريات"
                            : entry.type === "PAYMENT"
                            ? "سند صرف"
                            : "مرتجع مشتريات"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs font-medium">
                        {entry.referenceNumber}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground text-xs max-w-xs truncate">
                        {entry.description}
                      </td>
                      <td className="py-2.5 px-3 text-end font-mono">
                        {entry.debit > 0
                          ? entry.debit.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })
                          : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-end font-mono">
                        {entry.credit > 0
                          ? entry.credit.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })
                          : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-end font-mono font-bold">
                        {entry.runningBalance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}{" "}
                        ر.س
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-muted/30 font-semibold border-t">
                <tr>
                  <td colSpan={4} className="py-3 px-3 text-start">
                    {tStatement("summary")}
                  </td>
                  <td className="py-3 px-3 text-end font-mono text-emerald-600">
                    {supplier.statementOfAccount.totalDebits.toLocaleString(
                      undefined,
                      { minimumFractionDigits: 2 }
                    )}
                  </td>
                  <td className="py-3 px-3 text-end font-mono text-rose-600">
                    {supplier.statementOfAccount.totalCredits.toLocaleString(
                      undefined,
                      { minimumFractionDigits: 2 }
                    )}
                  </td>
                  <td className="py-3 px-3 text-end font-mono text-primary font-bold">
                    {supplier.statementOfAccount.closingBalance.toLocaleString(
                      undefined,
                      { minimumFractionDigits: 2 }
                    )}{" "}
                    ر.س
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </TabsContent>

        {/* 2. Purchase Orders Tab */}
        <TabsContent value="orders" className="space-y-4 pt-4">
          <div className="rounded-md border bg-card overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted/50 border-b text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-3 text-start">رقم أمر الشراء</th>
                  <th className="py-2.5 px-3 text-start">تاريخ الإصدار</th>
                  <th className="py-2.5 px-3 text-start">تاريخ التوريد المتوقع</th>
                  <th className="py-2.5 px-3 text-start">الحالة</th>
                  <th className="py-2.5 px-3 text-end">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {supplier.orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      لا توجد أوامر شراء مسجلة لهذا المورد
                    </td>
                  </tr>
                ) : (
                  supplier.orders.map((po) => (
                    <tr
                      key={po.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/purchasing/orders/${po.id}`)}
                    >
                      <td className="py-2.5 px-3 font-mono font-medium hover:underline">
                        {po.poNumber}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs">
                        {new Date(po.issueDate).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs">
                        {po.expectedDate
                          ? new Date(po.expectedDate).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={po.status} />
                      </td>
                      <td className="py-2.5 px-3 text-end font-mono font-medium">
                        {po.total.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}{" "}
                        ر.س
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 3. Goods Receipts Tab */}
        <TabsContent value="receipts" className="space-y-4 pt-4">
          <div className="rounded-md border bg-card overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted/50 border-b text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-3 text-start">رقم إيصال الاستلام</th>
                  <th className="py-2.5 px-3 text-start">المستودع</th>
                  <th className="py-2.5 px-3 text-start">تاريخ الاستلام</th>
                  <th className="py-2.5 px-3 text-center">عدد الأصناف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {supplier.receipts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      لا توجد إيصالات استلام مسجلة لهذا المورد
                    </td>
                  </tr>
                ) : (
                  supplier.receipts.map((gr) => (
                    <tr key={gr.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium">
                        {gr.receiptNumber}
                      </td>
                      <td className="py-2.5 px-3">{gr.warehouse.name}</td>
                      <td className="py-2.5 px-3 font-mono text-xs">
                        {new Date(gr.receiveDate).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {gr._count?.items || 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 4. Purchase Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4 pt-4">
          <div className="rounded-md border bg-card overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted/50 border-b text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-3 text-start">رقم الفاتورة</th>
                  <th className="py-2.5 px-3 text-start">تاريخ الإصدار</th>
                  <th className="py-2.5 px-3 text-start">تاريخ الاستحقاق</th>
                  <th className="py-2.5 px-3 text-start">الحالة</th>
                  <th className="py-2.5 px-3 text-end">الإجمالي</th>
                  <th className="py-2.5 px-3 text-end">المدفوع</th>
                  <th className="py-2.5 px-3 text-end">المتبقي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {supplier.invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      لا توجد فواتير مشتريات مسجلة لهذا المورد
                    </td>
                  </tr>
                ) : (
                  supplier.invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/purchasing/invoices/${inv.id}`)}
                    >
                      <td className="py-2.5 px-3 font-mono font-medium hover:underline">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs">
                        {new Date(inv.issueDate).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs">
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="py-2.5 px-3 text-end font-mono font-medium">
                        {inv.total.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-end font-mono text-emerald-600">
                        {inv.paidAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-end font-mono font-bold text-rose-600">
                        {(inv.total - inv.paidAmount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}{" "}
                        ر.س
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 5. Payments Tab */}
        <TabsContent value="payments" className="space-y-4 pt-4">
          <div className="rounded-md border bg-card overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted/50 border-b text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-3 text-start">رقم سند الصرف</th>
                  <th className="py-2.5 px-3 text-start">تاريخ السداد</th>
                  <th className="py-2.5 px-3 text-start">طريقة الدفع</th>
                  <th className="py-2.5 px-3 text-start">المرجع</th>
                  <th className="py-2.5 px-3 text-end">المبلغ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {supplier.payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      لا توجد سندات صرف مسجلة لهذا المورد
                    </td>
                  </tr>
                ) : (
                  supplier.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium">
                        {p.paymentNumber}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs">
                        {new Date(p.date).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 text-xs">
                        <span className="bg-muted px-2 py-0.5 rounded font-medium">
                          {p.method}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">
                        {p.reference || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-end font-mono font-bold text-emerald-600">
                        {p.amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}{" "}
                        ر.س
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 6. Overview Tab */}
        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  معلومات الشركة والاتصال
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">اسم المورد</span>
                  <span className="font-medium">{supplier.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">كود المورد</span>
                  <span className="font-mono">{supplier.code}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">الرقم الضريبي</span>
                  <span className="font-mono">{supplier.taxNumber || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">الهاتف</span>
                  <span className="font-mono" dir="ltr">
                    {supplier.phone || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">البريد الإلكتروني</span>
                  <span dir="ltr">{supplier.email || "—"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">العنوان</span>
                  <span>{supplier.address || "—"}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  ملخص التعاملات التجارية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">عدد أوامر الشراء</span>
                  <span className="font-mono font-medium">
                    {supplier._count.orders}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">عدد إيصالات الاستلام</span>
                  <span className="font-mono font-medium">
                    {supplier._count.receipts}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">عدد الفواتير المسجلة</span>
                  <span className="font-mono font-medium">
                    {supplier._count.invoices}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">عدد سندات الصرف</span>
                  <span className="font-mono font-medium">
                    {supplier._count.payments}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">عدد المرتجعات</span>
                  <span className="font-mono font-medium">
                    {supplier._count.returns}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
