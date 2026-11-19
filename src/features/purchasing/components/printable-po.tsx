"use client";

import * as React from "react";
import { Printer, ArrowRight } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import type { PurchaseOrderPayload } from "../types";

interface PrintablePoProps {
  order: PurchaseOrderPayload;
}

export function PrintablePO({ order }: PrintablePoProps) {
  const router = useRouter();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top action bar - Hidden when printing */}
      <div className="flex items-center justify-between print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/purchasing/orders/${order.id}`)}
          className="flex items-center gap-1.5"
        >
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          <span>العودة لتفاصيل أمر الشراء</span>
        </Button>
        <Button
          onClick={handlePrint}
          size="sm"
          className="flex items-center gap-1.5"
        >
          <Printer className="h-4 w-4" />
          <span>طباعة أمر الشراء / PDF</span>
        </Button>
      </div>

      {/* A4 Document Container */}
      <div className="mx-auto max-w-[210mm] bg-card p-8 md:p-12 shadow-sm rounded-lg border print:border-none print:shadow-none print:p-0 print:m-0 text-foreground">
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-6">
          <div>
            <h1 className="text-2xl font-bold text-primary">
              شركة مسار للتجارة والتوزيع
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Masar Trading & Distribution Co.
            </p>
            <div className="text-xs text-muted-foreground mt-2 space-y-0.5 font-mono">
              <p>الرقم الضريبي: 310123456700003</p>
              <p>الرياض - المملكة العربية السعودية</p>
              <p>هاتف: +966 11 000 0000</p>
            </div>
          </div>

          <div className="text-end">
            <span className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-wider inline-block">
              أمر شراء / PURCHASE ORDER
            </span>
            <div className="text-xl font-bold font-mono text-foreground mt-2">
              {order.poNumber}
            </div>
            <div className="text-xs text-muted-foreground mt-1 space-y-0.5 font-mono">
              <p>تاريخ الأمر: {new Date(order.issueDate).toLocaleDateString("ar-SA")}</p>
              {order.expectedDate && (
                <p>
                  تاريخ التوريد المتوقع:{" "}
                  {new Date(order.expectedDate).toLocaleDateString("ar-SA")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Supplier & Order Info */}
        <div className="grid grid-cols-2 gap-8 py-6 text-sm border-b">
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
              المورد المطلوب منه / SUPPLIER
            </span>
            <div className="font-bold text-base text-foreground">
              {order.supplier.name}
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5 mt-1 font-mono">
              <p>كود المورد: {order.supplier.code}</p>
              {order.supplier.taxNumber && (
                <p>الرقم الضريبي: {order.supplier.taxNumber}</p>
              )}
              {order.supplier.phone && (
                <p dir="ltr" className="text-start">
                  الهاتف: {order.supplier.phone}
                </p>
              )}
              {order.supplier.address && <p>{order.supplier.address}</p>}
            </div>
          </div>

          <div className="text-end">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
              موقع التسليم / DELIVERY DESTINATION
            </span>
            <div className="font-bold text-base text-foreground">
              المستودع الرئيسي - الرياض
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              شارع المستودعات، المنطقة الصناعية
            </p>
            <p className="text-xs font-mono text-muted-foreground mt-2">
              حالة الطلب: {order.status}
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="py-6">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground">
              <tr>
                <th className="py-2.5 px-3 text-start w-10">#</th>
                <th className="py-2.5 px-3 text-start">الصنف / الوصف</th>
                <th className="py-2.5 px-3 text-center w-24">الكمية</th>
                <th className="py-2.5 px-3 text-end w-28">سعر الوحدة</th>
                <th className="py-2.5 px-3 text-end w-24">الخصم</th>
                <th className="py-2.5 px-3 text-end w-24">الضريبة</th>
                <th className="py-2.5 px-3 text-end w-32">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {order.items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="py-3 px-3 text-start font-mono text-muted-foreground">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-foreground">
                      {item.product.name}
                    </div>
                    <div className="font-mono text-muted-foreground text-[11px]">
                      SKU: {item.product.sku}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-medium">
                    {item.quantity} {item.product.unit?.symbol}
                  </td>
                  <td className="py-3 px-3 text-end font-mono">
                    {item.unitPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-3 px-3 text-end font-mono text-muted-foreground">
                    {item.discount > 0
                      ? item.discount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })
                      : "—"}
                  </td>
                  <td className="py-3 px-3 text-end font-mono text-muted-foreground">
                    {item.taxAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-3 px-3 text-end font-mono font-bold">
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

        {/* Totals Summary */}
        <div className="flex justify-end border-t pt-4">
          <div className="w-64 space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>المجموع الفرعي:</span>
              <span className="font-mono font-medium">
                {order.subtotal.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}{" "}
                ر.س
              </span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-rose-600 font-medium">
                <span>إجمالي الخصم:</span>
                <span className="font-mono">
                  -
                  {order.discount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}{" "}
                  ر.س
                </span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>ضريبة القيمة المضافة:</span>
              <span className="font-mono font-medium">
                {order.tax.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}{" "}
                ر.س
              </span>
            </div>
            <div className="flex justify-between font-bold text-sm text-foreground pt-2 border-t">
              <span>الإجمالي الصافي:</span>
              <span className="font-mono text-primary">
                {order.total.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}{" "}
                ر.س
              </span>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="mt-8 border-t pt-4 text-xs text-muted-foreground space-y-2">
          {order.notes && (
            <div>
              <span className="font-bold text-foreground">ملاحظات: </span>
              {order.notes}
            </div>
          )}
          <div className="text-[11px] leading-relaxed">
            <p>
              * يرجى إرفاق نسخة من أمر الشراء هذا مع إرسالية وفاتورة البضائع الموردة.
            </p>
            <p>
              * تخضع البضائع للفحص والاستلام في مستودعاتنا ومطابقتها للمواصفات قبل اعتماد الفاتورة.
            </p>
          </div>
        </div>

        {/* Signature Blocks */}
        <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t text-xs">
          <div className="text-start">
            <p className="font-semibold text-foreground">
              توقيع مسؤول المشتريات:
            </p>
            <div className="h-14 border-b border-dashed w-48 mt-2"></div>
          </div>
          <div className="text-end">
            <p className="font-semibold text-foreground">
              الاعتماد / الختم الرسمي:
            </p>
            <div className="h-14 border-b border-dashed w-48 ms-auto mt-2"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
