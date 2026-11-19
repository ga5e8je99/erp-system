"use client";

import * as React from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import {
  Printer,
  Send,
  PackageCheck,
  XCircle,
  ArrowRight,
  Building2,
  Calendar,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { PurchaseOrderStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { GoodsReceiptDialog } from "@/features/purchasing/components/goods-receipt-dialog";
import {
  sendPurchaseOrderAction,
  cancelPurchaseOrderAction,
} from "@/features/purchasing/actions/orders";
import type { PurchaseOrderPayload } from "@/features/purchasing/types";

interface OrderDetailClientProps {
  order: PurchaseOrderPayload;
}

export function OrderDetailClient({ order }: OrderDetailClientProps) {
  const t = useTranslations("purchasing.orders");
  const router = useRouter();

  const [receiveOpen, setReceiveOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState(false);

  const canSend = order.status === PurchaseOrderStatus.DRAFT;
  const canReceive =
    order.status === PurchaseOrderStatus.SENT ||
    order.status === PurchaseOrderStatus.PARTIALLY_RECEIVED;
  const canCancel =
    order.status === PurchaseOrderStatus.DRAFT ||
    order.status === PurchaseOrderStatus.SENT;

  const handleSend = async () => {
    setActionLoading(true);
    try {
      const res = await sendPurchaseOrderAction(order.id);
      if (res.ok) {
        toast.success("تم إرسال أمر الشراء وتغيير حالته إلى مُرسل بنجاح");
        router.refresh();
      } else {
        toast.error(res.error || "تعذر إرسال أمر الشراء");
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      const res = await cancelPurchaseOrderAction(order.id);
      if (res.ok) {
        toast.success("تم إلغاء أمر الشراء بنجاح");
        setCancelOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || "تعذر إلغاء أمر الشراء");
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/purchasing/orders")}
            className="h-9 w-9"
          >
            <ArrowRight className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-mono text-foreground">
                {order.poNumber}
              </h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              تاريخ الأمر: {new Date(order.issueDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/purchasing/orders/${order.id}/print`)}
            className="flex items-center gap-1.5"
          >
            <Printer className="h-4 w-4" />
            <span>{t("printPO")}</span>
          </Button>

          {canSend && (
            <Button
              size="sm"
              onClick={handleSend}
              disabled={actionLoading}
              className="flex items-center gap-1.5"
            >
              <Send className="h-4 w-4" />
              <span>{t("sendOrder")}</span>
            </Button>
          )}

          {canReceive && (
            <Button
              size="sm"
              onClick={() => setReceiveOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              <PackageCheck className="h-4 w-4" />
              <span>{t("receiveGoods")}</span>
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
              {order.supplier.name}
            </div>
            <div className="text-xs font-mono text-muted-foreground">
              {order.supplier.code}
            </div>
            {order.supplier.phone && (
              <div className="text-xs text-muted-foreground" dir="ltr">
                {order.supplier.phone}
              </div>
            )}
            {order.supplier.taxNumber && (
              <div className="text-xs font-mono text-muted-foreground">
                الرقم الضريبي: {order.supplier.taxNumber}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              التواريخ والتسليم
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">تاريخ الإصدار:</span>
              <span className="font-mono text-xs">
                {new Date(order.issueDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">تاريخ التوريد:</span>
              <span className="font-mono text-xs">
                {order.expectedDate
                  ? new Date(order.expectedDate).toLocaleDateString()
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">حالة التوريد:</span>
              <span className="text-xs font-medium">{order.status}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              الإجماليات
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">المجموع الفرعي:</span>
              <span className="font-mono text-xs">
                {order.subtotal.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}{" "}
                ر.س
              </span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span className="text-xs">الخصم:</span>
                <span className="font-mono text-xs">
                  -
                  {order.discount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}{" "}
                  ر.س
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">ضريبة القيمة المضافة:</span>
              <span className="font-mono text-xs">
                {order.tax.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}{" "}
                ر.س
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t font-bold text-foreground">
              <span>الإجمالي:</span>
              <span className="font-mono text-primary">
                {order.total.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}{" "}
                ر.س
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">بنود أمر الشراء</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted/50 border-b text-xs text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-3 text-start">#</th>
                  <th className="py-2.5 px-3 text-start">الصنف</th>
                  <th className="py-2.5 px-3 text-center w-24">الكمية</th>
                  <th className="py-2.5 px-3 text-end w-28">سعر الوحدة</th>
                  <th className="py-2.5 px-3 text-end w-24">الخصم</th>
                  <th className="py-2.5 px-3 text-end w-24">الضريبة</th>
                  <th className="py-2.5 px-3 text-end w-32">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {order.items.map((item, idx) => (
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

      {/* Receipts History */}
      {order.receipts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-emerald-600" />
              إيصالات الاستلام المسجلة على هذا الأمر
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm text-start">
                <thead className="bg-muted/50 border-b text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 px-3 text-start">رقم الإيصال</th>
                    <th className="py-2 px-3 text-start">تاريخ الاستلام</th>
                    <th className="py-2 px-3 text-center">عدد الأصناف المستلمة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {order.receipts.map((gr) => (
                    <tr key={gr.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-mono font-medium">
                        {gr.receiptNumber}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {new Date(gr.receiveDate).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {gr._count?.items || 0}
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
      <GoodsReceiptDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        order={order}
        onSuccess={() => router.refresh()}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="تأكيد إلغاء أمر الشراء"
        description={`هل أنت متأكد من رغبتك في إلغاء أمر الشراء (${order.poNumber})؟`}
        confirmText="نعم، إلغاء الطلب"
        cancelText="تراجع"
        variant="destructive"
        isLoading={actionLoading}
        onConfirm={handleCancel}
      />
    </div>
  );
}
