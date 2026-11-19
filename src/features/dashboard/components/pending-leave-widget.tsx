import React from "react";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PendingLeaveItem } from "../types";
import { format } from "date-fns";

interface PendingLeaveWidgetProps {
  leaves: PendingLeaveItem[];
  locale: string;
}

export function PendingLeaveWidget({ leaves, locale }: PendingLeaveWidgetProps) {
  const isArabic = locale === "ar";
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;

  return (
    <Card className="col-span-full xl:col-span-1">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold text-sky-800 dark:text-sky-300">
              {isArabic ? "طلبات الإجازات المعلقة" : "Pending Leave Requests"}
            </CardTitle>
            {leaves.length > 0 && (
              <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800 h-5 px-1.5 text-[10px]">
                {leaves.length}
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs">
            {isArabic ? "طلبات إجازة الموظفين بانتظار الاعتماد" : "Employee leave awaiting manager approval"}
          </CardDescription>
        </div>
        <Button asChild variant="ghost" size="xs" className="h-7 text-xs text-primary gap-1">
          <Link href="/hr/leave">
            <span>{isArabic ? "إدارة الإجازات" : "Manage leave"}</span>
            <ArrowIcon className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground">
                <th className="py-2 px-3 text-start font-medium">{isArabic ? "الموظف" : "Employee"}</th>
                <th className="py-2 px-3 text-start font-medium">{isArabic ? "القسم" : "Department"}</th>
                <th className="py-2 px-3 text-start font-medium">{isArabic ? "نوع الإجازة" : "Type"}</th>
                <th className="py-2 px-3 text-start font-medium">{isArabic ? "الفترة" : "Period"}</th>
                <th className="py-2 px-3 text-center font-medium">{isArabic ? "المدة" : "Days"}</th>
                <th className="py-2 px-3 text-center font-medium">{isArabic ? "إجراء" : "Action"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    {isArabic ? "لا توجد طلبات إجازة معلقة حالياً" : "No pending leave requests"}
                  </td>
                </tr>
              ) : (
                leaves.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-foreground truncate max-w-[130px]">
                      {l.employeeName}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {l.departmentName}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant="outline" className="text-[10px]">
                        {l.leaveTypeName}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                      {format(new Date(l.startDate), "MM/dd")} ~ {format(new Date(l.endDate), "MM/dd")}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold font-mono">
                      {l.days} {isArabic ? "يوم" : "d"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Button asChild variant="outline" size="xs" className="h-6 text-[10px] px-2 text-primary">
                        <Link href="/hr/leave">
                          {isArabic ? "مراجعة" : "Review"}
                        </Link>
                      </Button>
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
