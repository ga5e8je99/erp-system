"use client";

import * as React from "react";
import { Printer, ArrowRight, QrCode } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export interface PrintableInvoiceProps {
  invoice: {
    id: string;
    invoiceNumber: string;
    issueDate: Date | string;
    dueDate: Date | string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    paidAmount: number;
    dueAmount: number;
    notes?: string | null;
    status: string;
    customer: {
      name: string;
      code: string;
      taxNumber?: string | null;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
    };
    items: {
      id: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
      taxRate: number;
      taxAmount: number;
      total: number;
      product: {
        name: string;
        sku: string;
        unit?: { symbol: string; name?: string } | null;
      };
    }[];
  };
  companySettings?: {
    name?: string | null;
    taxNumber?: string | null;
    address?: string | null;
    phone?: string | null;
    logoUrl?: string | null;
    currency?: string | null;
  } | null;
}

export function PrintableInvoice({
  invoice,
  companySettings,
}: PrintableInvoiceProps) {
  const router = useRouter();
  const t = useTranslations("sales.invoices.printable");

  const companyName = companySettings?.name || "شركة مسار للتجارة والتوزيع ذ.م.م";
  const companyTaxNumber = companySettings?.taxNumber || "300098765400003";
  const companyAddress = companySettings?.address || "المملكة العربية السعودية - الرياض";
  const companyPhone = companySettings?.phone || "+966 11 234 5678";
  const currency = companySettings?.currency || "ر.س";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-muted/40 p-4 md:p-8 print:p-0 print:bg-white">
      {/* Top Floating Action Bar (Hidden during printing) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-1.5"
        >
          <ArrowRight className="h-4 w-4" />
          <span>الرجوع</span>
        </Button>

        <div className="flex items-center gap-3">
          <Button
            onClick={handlePrint}
            className="flex items-center gap-2 shadow-sm"
          >
            <Printer className="h-4 w-4" />
            <span>{t("printOrSavePdf")}</span>
          </Button>
        </div>
      </div>

      {/* A4 Sheet Container */}
      <div
        className="max-w-4xl mx-auto bg-white text-slate-900 border shadow-lg rounded-sm p-8 md:p-12 print:p-6 print:border-none print:shadow-none print:m-0 print:w-full print:max-w-none"
        style={{ minHeight: "297mm" }}
      >
        {/* Document Title Header */}
        <div className="border-b-2 border-slate-900 pb-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-teal-800">مسار ERP</span>
                <span className="text-xs text-slate-500 uppercase tracking-widest">
                  | Masar Trading
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-800 mt-1">{companyName}</h2>
              <div className="text-xs text-slate-600 space-y-0.5 mt-1">
                <p>الرقم الضريبي / Tax ID: <span className="font-mono font-bold">{companyTaxNumber}</span></p>
                <p>العنوان / Address: {companyAddress}</p>
                <p>الهاتف / Tel: <span dir="ltr">{companyPhone}</span></p>
              </div>
            </div>

            <div className="text-start sm:text-end space-y-1">
              <div className="inline-block bg-teal-800 text-white font-bold px-4 py-1.5 rounded text-sm tracking-wide">
                {t("taxInvoice")}
              </div>
              <div className="text-xs text-slate-500 font-mono">TAX INVOICE</div>
              <div className="pt-2 text-xs">
                <span className="text-slate-500">رقم الفاتورة / Inv #: </span>
                <span className="font-mono font-bold text-slate-900 text-base">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <div className="text-xs text-slate-600">
                <span>تاريخ الإصدار / Date: </span>
                <span className="font-mono font-medium">
                  {new Date(invoice.issueDate).toLocaleDateString("ar-EG")}
                </span>
              </div>
              <div className="text-xs text-slate-600">
                <span>تاريخ الاستحقاق / Due: </span>
                <span className="font-mono font-medium">
                  {new Date(invoice.dueDate).toLocaleDateString("ar-EG")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Information Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded border border-slate-200 p-4 mb-6 bg-slate-50/50 text-xs">
          <div className="space-y-1">
            <span className="font-bold text-slate-700 block uppercase tracking-wider text-[11px]">
              {t("billTo")}
            </span>
            <p className="text-sm font-bold text-slate-900">{invoice.customer.name}</p>
            <p className="text-slate-600">
              كود العميل / Code: <span className="font-mono font-semibold">{invoice.customer.code}</span>
            </p>
            {invoice.customer.address && (
              <p className="text-slate-600">العنوان / Address: {invoice.customer.address}</p>
            )}
          </div>

          <div className="space-y-1 sm:text-end">
            {invoice.customer.taxNumber && (
              <p className="text-slate-600">
                الرقم الضريبي للعميل / Customer VAT:{" "}
                <span className="font-mono font-bold text-slate-900">{invoice.customer.taxNumber}</span>
              </p>
            )}
            {invoice.customer.phone && (
              <p className="text-slate-600" dir="ltr">
                الهاتف / Phone: {invoice.customer.phone}
              </p>
            )}
            {invoice.customer.email && (
              <p className="text-slate-600" dir="ltr">
                البريد / Email: {invoice.customer.email}
              </p>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-6 overflow-hidden rounded border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-800 font-semibold">
              <tr>
                <th className="p-2.5 text-center w-8">#</th>
                <th className="p-2.5 text-start">{t("item")}</th>
                <th className="p-2.5 text-center w-16">{t("qty")}</th>
                <th className="p-2.5 text-end w-24">{t("unitPrice")}</th>
                <th className="p-2.5 text-end w-20">{t("itemDiscount")}</th>
                <th className="p-2.5 text-center w-16">{t("taxRate")}</th>
                <th className="p-2.5 text-end w-24">{t("taxAmount")}</th>
                <th className="p-2.5 text-end w-28">{t("lineTotal")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="p-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                  <td className="p-2.5">
                    <div className="font-semibold text-slate-900">{item.product.name}</div>
                    <div className="font-mono text-[10px] text-slate-500">
                      SKU: {item.product.sku}
                    </div>
                  </td>
                  <td className="p-2.5 text-center font-mono font-medium">
                    {Number(item.quantity)} {item.product.unit?.symbol || ""}
                  </td>
                  <td className="p-2.5 text-end font-mono">
                    {Number(item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-2.5 text-end font-mono text-slate-500">
                    {Number(item.discount || 0) > 0
                      ? Number(item.discount).toLocaleString(undefined, { minimumFractionDigits: 2 })
                      : "—"}
                  </td>
                  <td className="p-2.5 text-center font-mono">%{Number(item.taxRate)}</td>
                  <td className="p-2.5 text-end font-mono">
                    {Number(item.taxAmount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="p-2.5 text-end font-mono font-bold text-slate-900">
                    {Number(item.total).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & QR Code Section */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 mb-8 items-start">
          {/* QR Code & Notes Box */}
          <div className="sm:col-span-7 space-y-4">
            <div className="flex items-center gap-4 rounded border border-slate-200 p-3 bg-slate-50/40">
              <div className="h-20 w-20 shrink-0 bg-white border border-slate-300 rounded flex items-center justify-center p-1">
                <QrCode className="h-16 w-16 text-slate-800" />
              </div>
              <div className="text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">التحقق الضريبي الإلكتروني / E-Invoicing QR</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  هذه الفاتورة معتمدة ومطابقة لمتطلبات هيئة الزكاة والضريبة والجمارك (ZATCA) ومسجلة في النظام المحاسبي المالي.
                </p>
              </div>
            </div>

            {invoice.notes && (
              <div className="rounded border border-slate-200 p-3 text-xs bg-slate-50/20">
                <span className="font-bold text-slate-700 block mb-1">
                  {t("terms")} / ملاحظات:
                </span>
                <p className="text-slate-600 whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Financial Totals Box */}
          <div className="sm:col-span-5 rounded border border-slate-300 bg-slate-50/80 p-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>المجموع قبل الخصم / Subtotal:</span>
              <span className="font-mono font-medium">
                {Number(invoice.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                {currency}
              </span>
            </div>

            {Number(invoice.discount) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>إجمالي الخصم / Discount:</span>
                <span className="font-mono font-medium">
                  -{Number(invoice.discount).toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                  {currency}
                </span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>ضريبة القيمة المضافة / VAT (14%):</span>
              <span className="font-mono font-medium">
                {Number(invoice.tax).toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                {currency}
              </span>
            </div>

            <div className="border-t border-slate-300 pt-2 flex justify-between font-bold text-sm text-slate-900">
              <span>الإجمالي الكلي / Grand Total:</span>
              <span className="font-mono text-base text-teal-800">
                {Number(invoice.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                {currency}
              </span>
            </div>

            {Number(invoice.paidAmount) > 0 && (
              <div className="flex justify-between text-emerald-700 pt-1 border-t border-dashed border-slate-300">
                <span>المبلغ المسدد / Paid:</span>
                <span className="font-mono font-medium">
                  {Number(invoice.paidAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                  {currency}
                </span>
              </div>
            )}

            <div className="flex justify-between font-bold text-slate-800 pt-1">
              <span>المتبقي للدفع / Amount Due:</span>
              <span className="font-mono text-rose-700">
                {Number(invoice.dueAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                {currency}
              </span>
            </div>
          </div>
        </div>

        {/* Signatures & Footer */}
        <div className="border-t border-slate-200 pt-8 mt-12 grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
          <div className="space-y-12">
            <p className="font-medium">المستلم / Received By</p>
            <div className="border-b border-dashed border-slate-400 w-48 mx-auto"></div>
          </div>
          <div className="space-y-12">
            <p className="font-medium">{t("authorizedSignature")}</p>
            <div className="border-b border-dashed border-slate-400 w-48 mx-auto"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
