"use client";

import * as React from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowRight,
  Send,
  CreditCard,
  Building2,
  Calendar,
  FileText,
} from "lucide-react";
import { PurchaseInvoiceStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SupplierPaymentDialog } from "@/features/purchasing/components/supplier-payment-dialog";
import { postPurchaseInvoiceAction } from "@/features/purchasing/actions/invoices";
import type { PurchaseInvoicePayload } from "@/features/purchasing/types";

interface InvoiceDetailClientProps {
  invoice: PurchaseInvoicePayload;
}

export function InvoiceDetailClient({ invoice }: InvoiceDetailClientProps) {
  const t = useTranslations("purchasing.invoices");
  const router = useRouter();

  const [payOpen, setPayOpen] = React.useState(false);
  const [postOpen, setPostOpen] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState(false);

  const isDraft = invoice.status === PurchaseInvoiceStatus.DRAFT;
  const canPay =
    invoice.status === PurchaseInvoiceStatus.ISSUED ||
    invoice.status === PurchaseInvoiceStatus.PARTIALLY_PAID;

  const handlePost = async () => {
    setActionLoading(true);
    try {
      const res = await postPurchaseInvoiceAction(invoice.id);
      if (res.ok) {
        toast.success(
          "تم ترحيل الفاتورة بنجاح وتوليد قيد الاستحقاق اليومي وزيادة رصيد المورد!"
        );
        setPostOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || "تعذر ترحيل الفاتورة");
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setActionLoading(false);
    }
  };

  const remaining = Math.max(0, invoice.total - invoice.paidAmount);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/purchasing/invoices")}
            className="h-9 w-9"
          >
            <ArrowRight className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-mono text-foreground">
                {invoice.invoiceNumber}
              </h1>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              تاريخ الفاتورة: {new Date(invoice.issueDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDraft && (
            <Button
              size="sm"
              onClick={() => setPostOpen(true)}
              disabled={actionLoading}
              className="flex items-center gap-1.5"
            >
              <Send className="h-4 w-4" />
              <span>{t("postInvoice")}</span>
            </Button>
          )}

          {canPay && (
            <Button
              size="sm"
              onClick={() => setPayOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              <CreditCard className="h-4 w-4" />
              <span>{t("recordPayment")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              المورد
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="font-bold text-foreground">
              {invoice.supplier.name}
            </div>
            <div className="text-xs font-mono text-muted-foreground">
              {invoice.supplier.code}
            </div>
            {invoice.supplier.phone && (
              <div className="text-xs text-muted-foreground" dir="ltr">
                {invoice.supplier.phone}
              </div>
            )}
            {invoice.supplier.taxNumber && (
              <div className="text-xs font-mono text-muted-foreground">
                الرقم الضريبي: {invoice.supplier.taxNumber}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              التواريخ والربط
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">تاريخ الإصدار:</span>
              <span className="font-mono text-xs">
                {new Date(invoice.issueDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">تاريخ الاستحقاق:</span>
              <span className="font-mono text-xs">
                {new Date(invoice.dueDate).toLocaleDateString()}
              </span>
            </div>
            {invoice.po && (
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">أمر الشراء:</span>
                <span className="font-mono text-xs font-medium">
                  {invoice.po.poNumber}
                </span>
              </div>
            )}
            {invoice.receipt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">إيصال الاستلام:</span>
                <span className="font-mono text-xs font-medium">
                  {invoice.receipt.receiptNumber}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              الإجماليات والسداد
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">الإجمالي المطلوب:</span>
              <span className="font-mono text-xs font-bold">
                {invoice.total.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}{" "}
                ر.س
              </span>
            </div>
            <div className="flex justify-between text-emerald-600">
              <span className="text-xs">المبلغ المسدد:</span>
              <span className="font-mono text-xs">
                {invoice.paidAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}{" "}
                ر.س
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t font-bold text-rose-600">
              <span>المتبقي:</span>
              <span className="font-mono">
                {remaining.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}{" "}
                ر.س
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">بنود الفاتورة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted/50 border-b text-xs text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-3 text-start">#</th>
                  <th className="py-2.5 px-3 text-start">الصنف</th>
                  <th className="py-2.5 px-3 text-center w-24">الكمية</th>
                  <th className="py-2.5 px-3 text-end w-28">السعر</th>
                  <th className="py-2.5 px-3 text-end w-24">الخصم</th>
                  <th className="py-2.5 px-3 text-end w-24">الضريبة</th>
                  <th className="py-2.5 px-3 text-end w-32">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {invoice.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-foreground">
                        {item.product.name}
                      </div>
                      <div className="font-mono text-muted-foreground text-[11px]">
                        {item.product.sku}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-medium">
                      {item.quantity} {item.product.unit?.symbol}
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono">
                      {item.unitPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono text-muted-foreground">
                      {item.discount > 0
                        ? item.discount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })
                        : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono text-muted-foreground">
                      {item.taxAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono font-bold">
                      {item.total.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}{" "}
                      ر.س
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      {invoice.payments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              سجل سداد الفاتورة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm text-start">
                <thead className="bg-muted/50 border-b text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 px-3 text-start">رقم السند</th>
                    <th className="py-2 px-3 text-start">تاريخ السداد</th>
                    <th className="py-2 px-3 text-start">طريقة الدفع</th>
                    <th className="py-2 px-3 text-end">المبلغ المسدد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {invoice.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="py-2 px-3 font-mono font-medium">
                        {p.paymentNumber}
                      </td>
                      <td className="py-2 px-3 font-mono">
                        {new Date(p.date).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-3">{p.method}</td>
                      <td className="py-2 px-3 text-end font-mono font-bold text-emerald-600">
                        {p.amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}{" "}
                        ر.س
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <SupplierPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        invoice={invoice}
        onSuccess={() => router.refresh()}
      />

      <ConfirmDialog
        open={postOpen}
        onOpenChange={setPostOpen}
        title="تأكيد ترحيل فاتورة المشتريات"
        description={`هل أنت متأكد من ترحيل الفاتورة رقم (${invoice.invoiceNumber}) بمبلغ ${invoice.total.toLocaleString()} ر.س؟`}
        confirmText="نعم، ترحيل الفاتورة"
        cancelText="إلغاء"
        variant="default"
        isLoading={actionLoading}
        onConfirm={handlePost}
      />
    </div>
  );
}
