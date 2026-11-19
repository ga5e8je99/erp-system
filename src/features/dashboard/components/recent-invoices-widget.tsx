import React from "react";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { RecentInvoiceItem } from "../types";
import { format } from "date-fns";

interface RecentInvoicesWidgetProps {
  invoices: RecentInvoiceItem[];
  locale: string;
}

export function RecentInvoicesWidget({ invoices, locale }: RecentInvoicesWidgetProps) {
  const isArabic = locale === "ar";
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">{isArabic ? "مدفوعة" : "Paid"}</Badge>;
      case "PARTIALLY_PAID":
        return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0">{isArabic ? "سداد جزئي" : "Partial"}</Badge>;
      case "ISSUED":
        return <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-400 border-0">{isArabic ? "صادرة" : "Issued"}</Badge>;
      case "DRAFT":
        return <Badge variant="secondary">{isArabic ? "مسودة" : "Draft"}</Badge>;
      case "VOID":
        return <Badge variant="destructive">{isArabic ? "ملغاة" : "Void"}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="col-span-full xl:col-span-1">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-sm font-semibold">
            {isArabic ? "أحدث فواتير المبيعات" : "Recent Invoices"}
          </CardTitle>
          <CardDescription className="text-xs">
            {isArabic ? "آخر الفواتير الصادرة للعملاء" : "Latest customer issued invoices"}
          </CardDescription>
        </div>
        <Button asChild variant="ghost" size="xs" className="h-7 text-xs text-primary gap-1">
          <Link href="/sales/invoices">
            <span>{isArabic ? "عرض الكل" : "View all"}</span>
            <ArrowIcon className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground">
                <th className="py-2 px-3 text-start font-medium">{isArabic ? "رقم الفاتورة" : "Invoice #"}</th>
                <th className="py-2 px-3 text-start font-medium">{isArabic ? "العميل" : "Customer"}</th>
                <th className="py-2 px-3 text-start font-medium">{isArabic ? "التاريخ" : "Date"}</th>
                <th className="py-2 px-3 text-end font-medium">{isArabic ? "الإجمالي" : "Total"}</th>
                <th className="py-2 px-3 text-center font-medium">{isArabic ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    {isArabic ? "لا توجد فواتير صادرة" : "No invoices found"}
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-primary">
                      <Link href={`/sales/invoices/${inv.id}`} className="hover:underline flex items-center gap-1">
                        <span>{inv.invoiceNumber}</span>
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-foreground truncate max-w-[130px]">
                      {inv.customerName}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                      {format(new Date(inv.issueDate), "yyyy-MM-dd")}
                    </td>
                    <td className="py-2.5 px-3 text-end font-bold font-mono">
                      {inv.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {getStatusBadge(inv.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
