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
  Send,
  CreditCard,
  Ban,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { SalesInvoiceStatus } from "@prisma/client";

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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { InvoiceFormDialog } from "./invoice-form-dialog";
import { PaymentDialog } from "./payment-dialog";
import { VoidInvoiceDialog } from "./void-invoice-dialog";
import {
  deleteInvoiceAction,
  issueInvoiceAction,
} from "../actions/invoices";

export interface InvoiceTableRow {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer: { id: string; name: string; code: string; taxNumber?: string | null };
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
  _count: { items: number; payments: number; returns: number };
}

interface InvoicesTableProps {
  data: InvoiceTableRow[];
  warehouses: { id: string; name: string; code: string }[];
  pageCount: number;
  currentPage: number;
  pageSize: number;
  totalRecords: number;
}

export function InvoicesTable({
  data,
  warehouses,
  pageCount,
  totalRecords,
}: InvoicesTableProps) {
  const t = useTranslations("sales.invoices");
  const router = useRouter();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [issueTarget, setIssueTarget] = React.useState<InvoiceTableRow | null>(null);
  const [issueWarehouseId, setIssueWarehouseId] = React.useState(warehouses[0]?.id || "");
  const [paymentTarget, setPaymentTarget] = React.useState<InvoiceTableRow | null>(null);
  const [voidTarget, setVoidTarget] = React.useState<InvoiceTableRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<InvoiceTableRow | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleIssueInvoice = async () => {
    if (!issueTarget || !issueWarehouseId) {
      toast.error("يرجى اختيار مستودع الصرف");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await issueInvoiceAction({
        invoiceId: issueTarget.id,
        warehouseId: issueWarehouseId,
      });
      if (res.ok) {
        toast.success(`تم اعتماد وترحيل الفاتورة ${issueTarget.invoiceNumber} بنجاح`);
        router.refresh();
      } else {
        toast.error(res.error || "فشل اعتماد الفاتورة");
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsProcessing(false);
      setIssueTarget(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsProcessing(true);
    try {
      const res = await deleteInvoiceAction(deleteTarget.id);
      if (res.ok) {
        toast.success("تم حذف مسودة الفاتورة بنجاح");
        router.refresh();
      } else {
        toast.error(res.error || "فشل حذف الفاتورة");
      }
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    } finally {
      setIsProcessing(false);
      setDeleteTarget(null);
    }
  };

  const columns = React.useMemo<ColumnDef<InvoiceTableRow>[]>(
    () => [
      {
        accessorKey: "invoiceNumber",
        header: t("invoiceNumber"),
        cell: ({ row }) => (
          <span
            className="font-mono font-semibold text-primary cursor-pointer hover:underline"
            onClick={() => router.push(`/sales/invoices/${row.original.id}`)}
          >
            {row.original.invoiceNumber}
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
        accessorKey: "dueDate",
        header: t("dueDate"),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {new Date(row.original.dueDate).toLocaleDateString("ar-EG")}
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
        accessorKey: "paidAmount",
        header: t("paidAmount"),
        cell: ({ row }) => {
          const paid = Number(row.original.paidAmount);
          return (
            <span className="font-mono text-xs text-emerald-600 font-semibold">
              {paid > 0
                ? `${paid.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س`
                : "—"}
            </span>
          );
        },
      },
      {
        accessorKey: "dueAmount",
        header: t("dueAmount"),
        cell: ({ row }) => {
          const due = Number(row.original.dueAmount);
          const isVoid = row.original.status === SalesInvoiceStatus.VOID;
          if (isVoid) return <span className="text-xs text-muted-foreground">—</span>;

          return (
            <span
              className={`font-mono text-xs font-bold ${
                due > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
              }`}
            >
              {due.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
            </span>
          );
        },
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
          const inv = row.original;
          const isDraft = inv.status === SalesInvoiceStatus.DRAFT;
          const isIssued = inv.status === SalesInvoiceStatus.ISSUED;
          const isPartiallyPaid = inv.status === SalesInvoiceStatus.PARTIALLY_PAID;
          const canPay = (isIssued || isPartiallyPaid) && inv.dueAmount > 0;
          const canVoid = (isIssued || isPartiallyPaid) && inv.paidAmount === 0;

          return (
            <div className="flex items-center justify-end gap-1">
              {isDraft && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIssueWarehouseId(warehouses[0]?.id || "");
                    setIssueTarget(inv);
                  }}
                  className="h-8 text-xs flex items-center gap-1 text-primary hover:bg-primary/10"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>اعتماد الفاتورة</span>
                </Button>
              )}

              {canPay && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentTarget(inv)}
                  className="h-8 text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>سند قبض</span>
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted h-8 w-8 p-0">
                  <span className="sr-only">خيارات</span>
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => router.push(`/sales/invoices/${inv.id}`)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Eye className="h-4 w-4" />
                    <span>{t("details")}</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => router.push(`/sales/invoices/${inv.id}/print`)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="h-4 w-4" />
                    <span>{t("printInvoice")}</span>
                  </DropdownMenuItem>

                  {canVoid && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setVoidTarget(inv)}
                        className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                      >
                        <Ban className="h-4 w-4" />
                        <span>{t("voidInvoice")}</span>
                      </DropdownMenuItem>
                    </>
                  )}

                  {isDraft && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget(inv)}
                        className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>{t("deleteInvoice")}</span>
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
    [t, router, warehouses]
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
            <span>{t("addInvoice")}</span>
          </Button>
        }
      />

      <InvoiceFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        warehouses={warehouses}
        onSuccess={() => router.refresh()}
      />

      {/* Issue Invoice Warehouse Selection Dialog */}
      <Dialog
        open={Boolean(issueTarget)}
        onOpenChange={(open) => !open && setIssueTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("issueInvoice")}</DialogTitle>
            <DialogDescription>
              اعتماد الفاتورة {issueTarget?.invoiceNumber} للعميل {issueTarget?.customer.name} (
              {Number(issueTarget?.total || 0).toLocaleString()} ر.س).
              سيتم خصم الكميات من المستودع وترحيل قيد اليومية تلقائياً.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="issue-warehouse-select">مستودع الصرف *</Label>
            <Select
              value={issueWarehouseId}
              onValueChange={(val) => {
                if (val) setIssueWarehouseId(val);
              }}
            >
              <SelectTrigger id="issue-warehouse-select">
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
              onClick={() => setIssueTarget(null)}
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
      {paymentTarget && (
        <PaymentDialog
          open={Boolean(paymentTarget)}
          onOpenChange={(open) => !open && setPaymentTarget(null)}
          invoice={paymentTarget}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Void Invoice Dialog */}
      {voidTarget && (
        <VoidInvoiceDialog
          open={Boolean(voidTarget)}
          onOpenChange={(open) => !open && setVoidTarget(null)}
          invoice={voidTarget}
          warehouses={warehouses}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Delete Invoice Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("deleteInvoice")}
        description={`هل أنت متأكد من حذف مسودة الفاتورة "${deleteTarget?.invoiceNumber}"؟`}
        onConfirm={handleDelete}
        confirmText="حذف نهائي"
        variant="destructive"
        isLoading={isProcessing}
      />
    </div>
  );
}
