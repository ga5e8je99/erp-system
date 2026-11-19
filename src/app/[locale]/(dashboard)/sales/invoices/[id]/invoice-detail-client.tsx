"use client";

import * as React from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowRight,
  Printer,
  Send,
  CreditCard,
  Ban,
  Building,
  History,
  RotateCcw,
} from "lucide-react";
import { SalesInvoiceStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PaymentDialog } from "@/features/sales/components/payment-dialog";
import { VoidInvoiceDialog } from "@/features/sales/components/void-invoice-dialog";
import { issueInvoiceAction } from "@/features/sales/actions/invoices";

interface InvoiceDetailClientProps {
  invoice: {
    id: string;
    invoiceNumber: string;
    customerId: string;
    customer: {
      id: string;
      name: string;
      code: string;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      taxNumber?: string | null;
    };
    order?: { id: string; orderNumber: string } | null;
    issueDate: Date | string;
    dueDate: Date | string;
    status: SalesInvoiceStatus;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    paidAmount: number;
    dueAmount: number;
    notes?: string | null;
    items: {
      id: string;
      productId: string;
      product: { id: string; name: string; sku: string; unit?: { symbol: string } | null };
      quantity: number;
      unitPrice: number;
      discount?: number;
      taxRate: number;
      taxAmount: number;
      total: number;
    }[];
    payments: {
      id: string;
      paymentNumber: string;
      date: Date | string;
      amount: number;
      method: string;
      reference?: string | null;
    }[];
    returns: {
      id: string;
      returnNumber: string;
      createdAt: Date | string;
      total: number;
      status: string;
    }[];
  };
  warehouses: { id: string; name: string; code: string }[];
}

export function InvoiceDetailClient({ invoice, warehouses }: InvoiceDetailClientProps) {
  const t = useTranslations("sales.invoices");
  const router = useRouter();

  const [issueOpen, setIssueOpen] = React.useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = React.useState(warehouses[0]?.id || "");
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [voidOpen, setVoidOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const isDraft = invoice.status === SalesInvoiceStatus.DRAFT;
  const isIssued = invoice.status === SalesInvoiceStatus.ISSUED;
  const isPartiallyPaid = invoice.status === SalesInvoiceStatus.PARTIALLY_PAID;
  const canPay = (isIssued || isPartiallyPaid) && invoice.dueAmount > 0;
  const canVoid = (isIssued || isPartiallyPaid) && invoice.paidAmount === 0;

  const handleIssueInvoice = async () => {
    if (!selectedWarehouseId) {
      toast.error("يرجى اختيار مستودع الصرف");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await issueInvoiceAction({
        invoiceId: invoice.id,
        warehouseId: selectedWarehouseId,
      });
      if (res.ok) {
        toast.success(`تم اعتماد وترحيل الفاتورة ${invoice.invoiceNumber} بنجاح`);
        router.refresh();
      } else {
        toast.error(res.error || "فشل اعتماد الفاتورة");
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsProcessing(false);
      setIssueOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/sales/invoices")}
          className="flex items-center gap-1.5"
        >
          <ArrowRight className="h-4 w-4" />
          <span>العودة إلى فواتير المبيعات</span>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/sales/invoices/${invoice.id}/print`)}
            className="flex items-center gap-1.5"
          >
            <Printer className="h-4 w-4" />
            <span>طباعة الفاتورة (A4)</span>
          </Button>

          {isDraft && (
            <Button
              size="sm"
              onClick={() => setIssueOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Send className="h-4 w-4" />
              <span>اعتماد وترحيل الفاتورة</span>
            </Button>
          )}

          {canPay && (
            <Button
              size="sm"
              onClick={() => setPaymentOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CreditCard className="h-4 w-4" />
              <span>تسجيل سند قبض</span>
            </Button>
          )}

          {canVoid && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVoidOpen(true)}
              className="flex items-center gap-1.5 text-destructive hover:bg-destructive/10"
            >
              <Ban className="h-4 w-4" />
              <span>إلغاء الفاتورة (Void)</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Header Box */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono text-primary">
                {invoice.invoiceNumber}
              </h1>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              تاريخ الإصدار:{" "}
              <span className="font-mono">
                {new Date(invoice.issueDate).toLocaleDateString("ar-EG")}
              </span>
              {" | "}
              تاريخ الاستحقاق:{" "}
              <span className="font-mono">
                {new Date(invoice.dueDate).toLocaleDateString("ar-EG")}
              </span>
              {invoice.order && (
                <>
                  {" | "}
                  أمر البيع المرتبط:{" "}
                  <span
                    className="font-mono text-primary hover:underline cursor-pointer"
                    onClick={() => router.push(`/sales/orders/${invoice.order?.id}`)}
                  >
                    {invoice.order.orderNumber}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="text-start sm:text-end space-y-1">
            <span className="text-xs text-muted-foreground block">{t("total")}</span>
            <span className="text-2xl font-bold font-mono text-foreground">
              {Number(invoice.total).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
            </span>
            {invoice.status !== SalesInvoiceStatus.VOID && (
              <div className="text-xs">
                <span className="text-muted-foreground">المتبقي: </span>
                <span className="font-mono font-bold text-amber-600">
                  {invoice.dueAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Customer Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg bg-muted/30 p-4 text-sm">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Building className="h-3.5 w-3.5" />
              <span>بيانات العميل:</span>
            </span>
            <p
              className="font-bold text-foreground hover:underline cursor-pointer"
              onClick={() => router.push(`/sales/customers/${invoice.customer.id}`)}
            >
              {invoice.customer.name} ({invoice.customer.code})
            </p>
            {invoice.customer.taxNumber && (
              <p className="text-xs text-muted-foreground">
                الرقم الضريبي: <span className="font-mono">{invoice.customer.taxNumber}</span>
              </p>
            )}
            {invoice.customer.address && (
              <p className="text-xs text-muted-foreground">{invoice.customer.address}</p>
            )}
          </div>

          <div className="space-y-1 text-xs text-muted-foreground md:text-end">
            {invoice.customer.phone && <p dir="ltr">الهاتف: {invoice.customer.phone}</p>}
            {invoice.customer.email && <p dir="ltr">البريد: {invoice.customer.email}</p>}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">بنود الفاتورة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="p-3 text-center w-12">#</th>
                  <th className="p-3 text-start">المنتج / الصنف</th>
                  <th className="p-3 text-center w-24">الكمية</th>
                  <th className="p-3 text-end w-32">سعر الوحدة</th>
                  <th className="p-3 text-end w-28">خصم البند</th>
                  <th className="p-3 text-center w-24">الضريبة</th>
                  <th className="p-3 text-end w-32">قيمة الضريبة</th>
                  <th className="p-3 text-end w-36">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoice.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-muted/20">
                    <td className="p-3 text-center font-mono text-xs text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{item.product.name}</div>
                      <div className="text-xs font-mono text-muted-foreground">
                        SKU: {item.product.sku}
                      </div>
                    </td>
                    <td className="p-3 text-center font-mono font-medium">
                      {item.quantity} {item.product.unit?.symbol || ""}
                    </td>
                    <td className="p-3 text-end font-mono">
                      {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                    </td>
                    <td className="p-3 text-end font-mono text-xs text-muted-foreground">
                      {item.discount && item.discount > 0
                        ? `${item.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س`
                        : "—"}
                    </td>
                    <td className="p-3 text-center font-mono text-xs">%{item.taxRate}</td>
                    <td className="p-3 text-end font-mono text-xs text-muted-foreground">
                      {item.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                    </td>
                    <td className="p-3 text-end font-mono font-bold">
                      {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 pt-6">
            <div className="text-xs text-muted-foreground max-w-md">
              {invoice.notes && (
                <div className="rounded border p-3 bg-muted/20 space-y-1">
                  <span className="font-bold text-foreground">شروط وملاحظات:</span>
                  <p>{invoice.notes}</p>
                </div>
              )}
            </div>

            <div className="w-full md:w-80 space-y-2 rounded-lg border bg-muted/20 p-4 text-sm">
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>المجموع قبل الخصم:</span>
                <span className="font-mono">
                  {Number(invoice.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                </span>
              </div>

              {Number(invoice.discount) > 0 && (
                <div className="flex justify-between text-destructive text-xs">
                  <span>الخصم الإجمالي:</span>
                  <span className="font-mono">
                    -{Number(invoice.discount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                  </span>
                </div>
              )}

              <div className="flex justify-between text-muted-foreground text-xs">
                <span>ضريبة القيمة المضافة (14%):</span>
                <span className="font-mono">
                  {Number(invoice.tax).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                </span>
              </div>

              <div className="border-t pt-2 flex justify-between font-bold text-base text-primary">
                <span>إجمالي الفاتورة:</span>
                <span className="font-mono">
                  {Number(invoice.total).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                </span>
              </div>

              {Number(invoice.paidAmount) > 0 && (
                <div className="flex justify-between text-emerald-600 text-xs pt-1 border-t border-dashed">
                  <span>المبلغ المسدد:</span>
                  <span className="font-mono font-bold">
                    {Number(invoice.paidAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                  </span>
                </div>
              )}

              {invoice.status !== SalesInvoiceStatus.VOID && (
                <div className="flex justify-between text-amber-600 text-xs font-bold pt-1">
                  <span>المبلغ المتبقي:</span>
                  <span className="font-mono">
                    {invoice.dueAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applied Payments */}
      {invoice.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              <span>سندات القبض المسددة لهذه الفاتورة</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="border-b bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="p-2.5 text-start">رقم السند</th>
                    <th className="p-2.5 text-start">تاريخ القبض</th>
                    <th className="p-2.5 text-start">طريقة الدفع</th>
                    <th className="p-2.5 text-start">المرجع</th>
                    <th className="p-2.5 text-end">المبلغ المسدد</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoice.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="p-2.5 font-mono font-semibold text-primary">
                        {p.paymentNumber}
                      </td>
                      <td className="p-2.5 font-mono">
                        {new Date(p.date).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="p-2.5">{p.method}</td>
                      <td className="p-2.5 text-muted-foreground font-mono">
                        {p.reference || "—"}
                      </td>
                      <td className="p-2.5 text-end font-mono font-bold text-emerald-600">
                        {p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Applied Returns */}
      {invoice.returns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              <span>إشعارات دائنة / مرتجعات مبيعات مرتبطة</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y rounded-md border">
              {invoice.returns.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 text-xs">
                  <span className="font-mono font-bold text-primary">{r.returnNumber}</span>
                  <span className="text-muted-foreground font-mono">
                    {new Date(r.createdAt).toLocaleDateString("ar-EG")}
                  </span>
                  <span className="font-mono font-bold text-destructive">
                    -{r.total.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issue Invoice Dialog */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("issueInvoice")}</DialogTitle>
            <DialogDescription>
              اعتماد الفاتورة {invoice.invoiceNumber}. سيتم خصم الكميات من المخزون وترحيل قيد اليومية تلقائياً.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="detail-issue-warehouse">مستودع الصرف *</Label>
            <Select
              value={selectedWarehouseId}
              onValueChange={(val) => {
                if (val) setSelectedWarehouseId(val);
              }}
            >
              <SelectTrigger id="detail-issue-warehouse">
                <SelectValue placeholder="اختر مستودع الصرف..." />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIssueOpen(false)}
              disabled={isProcessing}
            >
              إلغاء
            </Button>
            <Button onClick={handleIssueInvoice} disabled={isProcessing}>
              {isProcessing ? "جاري الاعتماد..." : "اعتماد وترحيل الفاتورة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        invoice={invoice}
        onSuccess={() => router.refresh()}
      />

      {/* Void Invoice Dialog */}
      <VoidInvoiceDialog
        open={voidOpen}
        onOpenChange={setVoidOpen}
        invoice={invoice}
        warehouses={warehouses}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
