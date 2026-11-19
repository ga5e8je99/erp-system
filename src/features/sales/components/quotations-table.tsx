"use client";

import * as React from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Eye,
  Trash2,
  Plus,
  ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";
import { SalesQuotationStatus } from "@prisma/client";

import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { QuotationFormDialog } from "./quotation-form-dialog";
import {
  deleteQuotationAction,
  convertQuotationToOrderAction,
} from "../actions/quotations";

export interface QuotationTableRow {
  id: string;
  quotationNumber: string;
  customerId: string;
  customer: { id: string; name: string; code: string };
  issueDate: Date | string;
  expiryDate?: Date | string | null;
  status: SalesQuotationStatus;
  subtotal: number;
  tax: number;
  total: number;
  _count: { items: number; orders: number };
}

interface QuotationsTableProps {
  data: QuotationTableRow[];
  pageCount: number;
  currentPage: number;
  pageSize: number;
  totalRecords: number;
}

export function QuotationsTable({
  data,
  pageCount,
  totalRecords,
}: QuotationsTableProps) {
  const t = useTranslations("sales.quotations");
  const router = useRouter();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [convertTarget, setConvertTarget] = React.useState<QuotationTableRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<QuotationTableRow | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleConvert = async () => {
    if (!convertTarget) return;
    setIsProcessing(true);
    try {
      const res = await convertQuotationToOrderAction(convertTarget.id);
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
      setConvertTarget(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsProcessing(true);
    try {
      const res = await deleteQuotationAction(deleteTarget.id);
      if (res.ok) {
        toast.success("تم حذف عرض السعر بنجاح");
        router.refresh();
      } else {
        toast.error(res.error || "فشل حذف عرض السعر");
      }
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    } finally {
      setIsProcessing(false);
      setDeleteTarget(null);
    }
  };

  const columns = React.useMemo<ColumnDef<QuotationTableRow>[]>(
    () => [
      {
        accessorKey: "quotationNumber",
        header: t("quotationNumber"),
        cell: ({ row }) => (
          <span
            className="font-mono font-semibold text-primary cursor-pointer hover:underline"
            onClick={() => router.push(`/sales/quotations/${row.original.id}`)}
          >
            {row.original.quotationNumber}
          </span>
        ),
      },
      {
        accessorKey: "customer",
        header: t("customer"),
        cell: ({ row }) => {
          const cust = row.original.customer;
          return (
            <div>
              <span
                className="font-medium hover:underline cursor-pointer"
                onClick={() => router.push(`/sales/customers/${cust.id}`)}
              >
                {cust.name}
              </span>
              <span className="block text-xs font-mono text-muted-foreground">
                {cust.code}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "issueDate",
        header: t("issueDate"),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {new Date(row.original.issueDate).toLocaleDateString("ar-EG")}
          </span>
        ),
      },
      {
        accessorKey: "expiryDate",
        header: t("expiryDate"),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.expiryDate
              ? new Date(row.original.expiryDate).toLocaleDateString("ar-EG")
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "total",
        header: t("total"),
        cell: ({ row }) => (
          <span className="font-mono font-bold text-foreground">
            {Number(row.original.total).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}{" "}
            ر.س
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: t("status"),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "الإجراءات",
        cell: ({ row }) => {
          const quote = row.original;
          const canConvert =
            quote.status === SalesQuotationStatus.DRAFT ||
            quote.status === SalesQuotationStatus.SENT;
          const canDelete = quote.status === SalesQuotationStatus.DRAFT && quote._count.orders === 0;

          return (
            <div className="flex items-center justify-end gap-1">
              {canConvert && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConvertTarget(quote)}
                  className="h-8 text-xs flex items-center gap-1.5 text-primary hover:text-primary hover:bg-primary/10"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>{t("convertToOrder")}</span>
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted h-8 w-8 p-0">
                  <span className="sr-only">خيارات</span>
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => router.push(`/sales/quotations/${quote.id}`)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Eye className="h-4 w-4" />
                    <span>{t("details")}</span>
                  </DropdownMenuItem>

                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget(quote)}
                        className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>{t("deleteQuotation")}</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [t, router]
  );

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={data}
        pageCount={pageCount}
        totalCount={totalRecords}
        searchPlaceholder={t("searchPlaceholder")}
        filterSlot={
          <Button
            onClick={() => setCreateOpen(true)}
            size="sm"
            className="flex items-center gap-1.5 h-9"
          >
            <Plus className="h-4 w-4" />
            <span>{t("addQuotation")}</span>
          </Button>
        }
      />

      <QuotationFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => router.refresh()}
      />

      {/* Convert Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(convertTarget)}
        onOpenChange={(open) => !open && setConvertTarget(null)}
        title={t("convertToOrder")}
        description={`هل أنت متأكد من تحويل عرض السعر "${convertTarget?.quotationNumber}" إلى أمر بيع رسمي؟ سيتم تحديث حالة العرض تلقائياً.`}
        onConfirm={handleConvert}
        confirmText="تحويل إلى أمر بيع"
        variant="default"
        isLoading={isProcessing}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("deleteQuotation")}
        description={`هل أنت متأكد من حذف عرض السعر "${deleteTarget?.quotationNumber}"؟ لا يمكن التراجع عن هذه الخطوة.`}
        onConfirm={handleDelete}
        confirmText="حذف نهائي"
        variant="destructive"
        isLoading={isProcessing}
      />
    </div>
  );
}
