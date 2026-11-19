import React from "react";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { OverdueInvoiceItem } from "../types";
import { format } from "date-fns";

interface OverdueInvoicesWidgetProps {
  invoices: OverdueInvoiceItem[];
  locale: string;
}

export function OverdueInvoicesWidget({ invoices, locale }: OverdueInvoicesWidgetProps) {
  const isArabic = locale === "ar";
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;

  return (
    <Card className="col-span-full xl:col-span-1">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold text-rose-600">
              {isArabic ? "فواتير متأخرة السداد" : "Overdue Invoices"}
            </CardTitle>
            {invoices.length > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                {invoices.length}
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs">
            {isArabic ? "فواتير تجاوزت تاريخ الاستحقاق ولم تسدد" : "Unpaid invoices past due date"}
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
                <th className="py-2 px-3 text-start font-medium">{isArabic ? "الاستحقاق" : "Due Date"}</th>
                <th className="py-2 px-3 text-center font-medium">{isArabic ? "التأخير" : "Overdue"}</th>
                <th className="py-2 px-3 text-end font-medium">{isArabic ? "المتبقي" : "Remaining"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    {isArabic ? "لا توجد فواتير متأخرة السداد" : "No overdue invoices"}
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-rose-600">
                      <Link href={`/sales/invoices/${inv.id}`} className="hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-foreground truncate max-w-[130px]">
                      {inv.customerName}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                      {format(new Date(inv.dueDate), "yyyy-MM-dd")}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant="outline" className="border-rose-500/30 text-rose-600 font-mono text-[10px]">
                        {inv.overdueDays} {isArabic ? "يوم" : "days"}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-end font-bold font-mono text-rose-600">
                      {inv.remainingAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
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
