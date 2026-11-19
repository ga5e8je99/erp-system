"use client";

import * as React from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowRight,
  Printer,
  ArrowRightLeft,
  Edit,
  ShoppingCart,
  Building,
} from "lucide-react";
import { SalesQuotationStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { QuotationFormDialog } from "@/features/sales/components/quotation-form-dialog";
import { convertQuotationToOrderAction } from "@/features/sales/actions/quotations";
import type { getQuotationById } from "@/features/sales/queries/quotations";

interface QuotationDetailClientProps {
  quotation: NonNullable<Awaited<ReturnType<typeof getQuotationById>>>;
}

export function QuotationDetailClient({ quotation }: QuotationDetailClientProps) {
  const t = useTranslations("sales.quotations");
  const router = useRouter();

  const [editOpen, setEditOpen] = React.useState(false);
  const [convertOpen, setConvertOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const canConvert =
    quotation.status === SalesQuotationStatus.DRAFT ||
    quotation.status === SalesQuotationStatus.SENT;

  const canEdit =
    quotation.status === SalesQuotationStatus.DRAFT ||
    quotation.status === SalesQuotationStatus.SENT;

  const handleConvert = async () => {
    setIsProcessing(true);
    try {
      const res = await convertQuotationToOrderAction(quotation.id);
      if (res.ok) {
        toast.success(`تم إنشاء أمر البيع بنجاح برقم ${res.data.orderNumber}`);
        router.push(`/sales/orders/${res.data.orderId}`);
      } else {
        toast.error(res.error || "فشل تحويل عرض السعر إلى أمر بيع");
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
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/sales/quotations")}
          className="flex items-center gap-1.5"
        >
          <ArrowRight className="h-4 w-4" />
          <span>العودة إلى عروض الأسعار</span>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="flex items-center gap-1.5"
          >
            <Printer className="h-4 w-4" />
            <span>طباعة</span>
          </Button>

          {canEdit && (
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

          {canConvert && (
            <Button
              size="sm"
              onClick={() => setConvertOpen(true)}
              className="flex items-center gap-1.5"
            >
              <ArrowRightLeft className="h-4 w-4" />
              <span>{t("convertToOrder")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Quotation Summary Card */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono text-primary">
                {quotation.quotationNumber}
              </h1>
              <StatusBadge status={quotation.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              تاريخ الإصدار:{" "}
              <span className="font-mono">
                {new Date(quotation.issueDate).toLocaleDateString("ar-EG")}
              </span>
              {quotation.expiryDate && (
                <>
                  {" "}
                  | تاريخ الانتهاء:{" "}
                  <span className="font-mono">
                    {new Date(quotation.expiryDate).toLocaleDateString("ar-EG")}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="text-start sm:text-end">
            <span className="text-xs text-muted-foreground block">{t("total")}</span>
            <span className="text-2xl font-bold font-mono text-foreground">
              {Number(quotation.total).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
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
              onClick={() => router.push(`/sales/customers/${quotation.customer.id}`)}
            >
              {quotation.customer.name} ({quotation.customer.code})
            </p>
            {quotation.customer.address && (
              <p className="text-xs text-muted-foreground">{quotation.customer.address}</p>
            )}
          </div>

          <div className="space-y-1 text-xs text-muted-foreground md:text-end">
            {quotation.customer.phone && <p dir="ltr">الهاتف: {quotation.customer.phone}</p>}
            {quotation.customer.email && <p dir="ltr">البريد: {quotation.customer.email}</p>}
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">بنود عرض السعر</CardTitle>
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
                {quotation.items.map((item, idx) => (
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
              {quotation.notes && (
                <div className="rounded border p-3 bg-muted/20 space-y-1">
                  <span className="font-bold text-foreground">شروط وملاحظات:</span>
                  <p>{quotation.notes}</p>
                </div>
              )}
            </div>

            <div className="w-full md:w-72 space-y-2 rounded-lg border bg-muted/20 p-4 text-sm">
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>المجموع الفرعي:</span>
                <span className="font-mono">
                  {Number(quotation.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>الضريبة (14%):</span>
                <span className="font-mono">
                  {Number(quotation.tax).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-base text-primary">
                <span>الإجمالي:</span>
                <span className="font-mono">
                  {Number(quotation.total).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked Orders Section */}
      {quotation.orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span>أوامر البيع المنشأة من هذا العرض</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y rounded-md border">
              {quotation.orders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between p-3 hover:bg-muted/20 cursor-pointer"
                  onClick={() => router.push(`/sales/orders/${o.id}`)}
                >
                  <span className="font-mono font-medium text-primary hover:underline">
                    {o.orderNumber}
                  </span>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={o.status} />
                    <span className="font-mono font-bold text-xs">
                      {Number(o.total).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Convert Confirm Dialog */}
      <ConfirmDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        title={t("convertToOrder")}
        description={`هل أنت متأكد من رغبتك في تحويل عرض السعر ${quotation.quotationNumber} إلى أمر بيع رسمي؟`}
        onConfirm={handleConvert}
        confirmText="تحويل إلى أمر بيع"
        variant="default"
        isLoading={isProcessing}
      />

      {/* Edit Quotation Dialog */}
      <QuotationFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        quotation={quotation}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
