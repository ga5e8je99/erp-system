"use client";

import * as React from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowRight,
  Printer,
  Edit,
  CheckCircle,
  FileCheck,
  XCircle,
  FileText,
  Building,
} from "lucide-react";
import { SalesOrderStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
import { OrderFormDialog } from "@/features/sales/components/order-form-dialog";
import {
  confirmOrderAction,
  cancelOrderAction,
  convertOrderToInvoiceAction,
} from "@/features/sales/actions/orders";

import type { getOrderById } from "@/features/sales/queries/orders";

interface OrderDetailClientProps {
  order: NonNullable<Awaited<ReturnType<typeof getOrderById>>>;
  warehouses: { id: string; name: string; code: string }[];
}

export function OrderDetailClient({ order, warehouses }: OrderDetailClientProps) {
  const t = useTranslations("sales.orders");
  const router = useRouter();

  const [editOpen, setEditOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [convertOpen, setConvertOpen] = React.useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = React.useState(warehouses[0]?.id || "");
  const [isProcessing, setIsProcessing] = React.useState(false);

  const isDraft = order.status === SalesOrderStatus.DRAFT;
  const isConfirmed = order.status === SalesOrderStatus.CONFIRMED;
  const canCancel = order.status !== SalesOrderStatus.FULFILLED && order.status !== SalesOrderStatus.CANCELLED;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const res = await confirmOrderAction(order.id);
      if (res.ok) {
        toast.success("تم تأكيد أمر البيع بنجاح");
        router.refresh();
      } else {
        toast.error(res.error || "فشل تأكيد أمر البيع");
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsProcessing(false);
      setConfirmOpen(false);
    }
  };

  const handleCancel = async () => {
    setIsProcessing(true);
    try {
      const res = await cancelOrderAction(order.id);
      if (res.ok) {
        toast.success("تم إلغاء أمر البيع بنجاح");
        router.refresh();
      } else {
        toast.error(res.error || "فشل إلغاء أمر البيع");
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsProcessing(false);
      setCancelOpen(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!selectedWarehouseId) {
      toast.error("يرجى اختيار مستودع الصرف");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await convertOrderToInvoiceAction({
        orderId: order.id,
        warehouseId: selectedWarehouseId,
      });
      if (res.ok) {
        toast.success(`تم إنشاء فاتورة المبيعات بنجاح برقم ${res.data.invoiceNumber}`);
        router.push(`/sales/invoices/${res.data.invoiceId}`);
      } else {
        toast.error(res.error || "فشل تحويل أمر البيع إلى فاتورة");
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsProcessing(false);
      setConvertOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/sales/orders")}
          className="flex items-center gap-1.5"
        >
          <ArrowRight className="h-4 w-4" />
          <span>العودة إلى أوامر البيع</span>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="flex items-center gap-1.5"
          >
            <Printer className="h-4 w-4" />
            <span>طباعة</span>
          </Button>

          {isDraft && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Edit className="h-4 w-4" />
              <span>تعديل</span>
            </Button>
          )}

          {isDraft && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            >
              <CheckCircle className="h-4 w-4" />
              <span>{t("confirmOrder")}</span>
            </Button>
          )}

          {(isConfirmed || isDraft) && (
            <Button
              size="sm"
              onClick={() => setConvertOpen(true)}
              className="flex items-center gap-1.5"
            >
              <FileCheck className="h-4 w-4" />
              <span>{t("convertToInvoice")}</span>
            </Button>
          )}

          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelOpen(true)}
              className="flex items-center gap-1.5 text-destructive hover:bg-destructive/10"
            >
              <XCircle className="h-4 w-4" />
              <span>{t("cancelOrder")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Order Header Summary */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono text-primary">
                {order.orderNumber}
              </h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              تاريخ الأمر:{" "}
              <span className="font-mono">
                {new Date(order.issueDate).toLocaleDateString("ar-EG")}
              </span>
              {order.quotation && (
                <>
                  {" "}
                  | من عرض السعر:{" "}
                  <span
                    className="font-mono text-primary hover:underline cursor-pointer"
                    onClick={() => router.push(`/sales/quotations/${order.quotation?.id}`)}
                  >
                    {order.quotation.quotationNumber}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="text-start sm:text-end">
            <span className="text-xs text-muted-foreground block">{t("total")}</span>
            <span className="text-2xl font-bold font-mono text-foreground">
              {Number(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
            </span>
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
              onClick={() => router.push(`/sales/customers/${order.customer.id}`)}
            >
              {order.customer.name} ({order.customer.code})
            </p>
            {order.customer.address && (
              <p className="text-xs text-muted-foreground">{order.customer.address}</p>
            )}
          </div>

          <div className="space-y-1 text-xs text-muted-foreground md:text-end">
            {order.customer.phone && <p dir="ltr">الهاتف: {order.customer.phone}</p>}
            {order.customer.email && <p dir="ltr">البريد: {order.customer.email}</p>}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">بنود أمر البيع</CardTitle>
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
                  <th className="p-3 text-center w-24">الضريبة</th>
                  <th className="p-3 text-end w-32">قيمة الضريبة</th>
                  <th className="p-3 text-end w-36">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {order.items.map((item, idx) => (
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
              {order.notes && (
                <div className="rounded border p-3 bg-muted/20 space-y-1">
                  <span className="font-bold text-foreground">ملاحظات:</span>
                  <p>{order.notes}</p>
                </div>
              )}
            </div>

            <div className="w-full md:w-72 space-y-2 rounded-lg border bg-muted/20 p-4 text-sm">
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>المجموع الفرعي:</span>
                <span className="font-mono">
                  {Number(order.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>الضريبة (14%):</span>
                <span className="font-mono">
                  {Number(order.tax).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-base text-primary">
                <span>الإجمالي:</span>
                <span className="font-mono">
                  {Number(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked Invoices */}
      {order.invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>فواتير المبيعات الصادرة من هذا الأمر</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y rounded-md border">
              {order.invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 hover:bg-muted/20 cursor-pointer"
                  onClick={() => router.push(`/sales/invoices/${inv.id}`)}
                >
                  <span className="font-mono font-medium text-primary hover:underline">
                    {inv.invoiceNumber}
                  </span>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={inv.status} />
                    <span className="font-mono font-bold text-xs">
                      {Number(inv.total).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm Order Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("confirmOrder")}
        description={`هل أنت متأكد من تأكيد أمر البيع ${order.orderNumber}؟`}
        onConfirm={handleConfirm}
        confirmText="تأكيد الطلب"
        variant="default"
        isLoading={isProcessing}
      />

      {/* Cancel Order Dialog */}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("cancelOrder")}
        description={`هل أنت متأكد من إلغاء أمر البيع ${order.orderNumber}؟`}
        onConfirm={handleCancel}
        confirmText="إلغاء أمر البيع"
        variant="destructive"
        isLoading={isProcessing}
      />

      {/* Convert to Invoice Dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("convertToInvoice")}</DialogTitle>
            <DialogDescription>
              إنشاء فاتورة مبيعات جديدة مرتبطة بأمر البيع {order.orderNumber}.
              يرجى اختيار مستودع الصرف:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="order-dispatch-warehouse">مستودع الصرف *</Label>
            <Select
              value={selectedWarehouseId}
              onValueChange={(val) => {
                if (val) setSelectedWarehouseId(val);
              }}
            >
              <SelectTrigger id="order-dispatch-warehouse">
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
              onClick={() => setConvertOpen(false)}
              disabled={isProcessing}
            >
              إلغاء
            </Button>
            <Button onClick={handleConvertToInvoice} disabled={isProcessing}>
              {isProcessing ? "جاري الإنشاء..." : "إنشاء الفاتورة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <OrderFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        order={order}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
