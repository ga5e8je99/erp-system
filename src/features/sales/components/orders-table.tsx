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
  CheckCircle,
  FileCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { SalesOrderStatus } from "@prisma/client";

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
import { OrderFormDialog } from "./order-form-dialog";
import {
  confirmOrderAction,
  cancelOrderAction,
  convertOrderToInvoiceAction,
  deleteOrderAction,
} from "../actions/orders";

export interface OrderTableRow {
  id: string;
  orderNumber: string;
  customerId: string;
  customer: { id: string; name: string; code: string };
  quotation?: { id: string; quotationNumber: string } | null;
  issueDate: Date | string;
  status: SalesOrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  _count: { items: number; invoices: number };
}

interface OrdersTableProps {
  data: OrderTableRow[];
  warehouses: { id: string; name: string; code: string }[];
  pageCount: number;
  currentPage: number;
  pageSize: number;
  totalRecords: number;
}

export function OrdersTable({
  data,
  warehouses,
  pageCount,
  totalRecords,
}: OrdersTableProps) {
  const t = useTranslations("sales.orders");
  const router = useRouter();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [confirmTarget, setConfirmTarget] = React.useState<OrderTableRow | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<OrderTableRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<OrderTableRow | null>(null);
  const [convertToInvoiceTarget, setConvertToInvoiceTarget] = React.useState<OrderTableRow | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = React.useState(
    warehouses[0]?.id || ""
  );
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleConfirmOrder = async () => {
    if (!confirmTarget) return;
    setIsProcessing(true);
    try {
      const res = await confirmOrderAction(confirmTarget.id);
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
      setConfirmTarget(null);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelTarget) return;
    setIsProcessing(true);
    try {
      const res = await cancelOrderAction(cancelTarget.id);
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
      setCancelTarget(null);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!convertToInvoiceTarget || !selectedWarehouseId) {
      toast.error("يرجى اختيار مستودع الصرف");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await convertOrderToInvoiceAction({
        orderId: convertToInvoiceTarget.id,
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
      setConvertToInvoiceTarget(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsProcessing(true);
    try {
      const res = await deleteOrderAction(deleteTarget.id);
      if (res.ok) {
        toast.success("تم حذف أمر البيع بنجاح");
        router.refresh();
      } else {
        toast.error(res.error || "فشل حذف أمر البيع");
      }
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    } finally {
      setIsProcessing(false);
      setDeleteTarget(null);
    }
  };

  const columns = React.useMemo<ColumnDef<OrderTableRow>[]>(
    () => [
      {
        accessorKey: "orderNumber",
        header: t("orderNumber"),
        cell: ({ row }) => (
          <span
            className="font-mono font-semibold text-primary cursor-pointer hover:underline"
            onClick={() => router.push(`/sales/orders/${row.original.id}`)}
          >
            {row.original.orderNumber}
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
        accessorKey: "quotation",
        header: t("quotation"),
        cell: ({ row }) => {
          const q = row.original.quotation;
          if (!q) return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <span
              className="font-mono text-xs text-primary hover:underline cursor-pointer"
              onClick={() => router.push(`/sales/quotations/${q.id}`)}
            >
              {q.quotationNumber}
            </span>
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
          const order = row.original;
          const isDraft = order.status === SalesOrderStatus.DRAFT;
          const isConfirmed = order.status === SalesOrderStatus.CONFIRMED;
          const canCancel = order.status !== SalesOrderStatus.FULFILLED && order.status !== SalesOrderStatus.CANCELLED;

          return (
            <div className="flex items-center justify-end gap-1">
              {isDraft && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmTarget(order)}
                  className="h-8 text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>{t("confirmOrder")}</span>
                </Button>
              )}

              {(isConfirmed || isDraft) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedWarehouseId(warehouses[0]?.id || "");
                    setConvertToInvoiceTarget(order);
                  }}
                  className="h-8 text-xs flex items-center gap-1 text-primary hover:bg-primary/10"
                >
                  <FileCheck className="h-3.5 w-3.5" />
                  <span>{t("convertToInvoice")}</span>
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted h-8 w-8 p-0">
                  <span className="sr-only">خيارات</span>
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => router.push(`/sales/orders/${order.id}`)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Eye className="h-4 w-4" />
                    <span>{t("details")}</span>
                  </DropdownMenuItem>

                  {canCancel && (
                    <DropdownMenuItem
                      onClick={() => setCancelTarget(order)}
                      className="flex items-center gap-2 text-amber-600 focus:text-amber-600 cursor-pointer"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>{t("cancelOrder")}</span>
                    </DropdownMenuItem>
                  )}

                  {isDraft && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget(order)}
                        className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>{t("deleteOrder")}</span>
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
            <span>{t("addOrder")}</span>
          </Button>
        }
      />

      <OrderFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => router.refresh()}
      />

      {/* Confirm Order Dialog */}
      <ConfirmDialog
        open={Boolean(confirmTarget)}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
        title={t("confirmOrder")}
        description={`تأكيد أمر البيع "${confirmTarget?.orderNumber}" لتجهيز البضاعة للشحن. هل تريد المتابعة؟`}
        onConfirm={handleConfirmOrder}
        confirmText="تأكيد الطلب"
        variant="default"
        isLoading={isProcessing}
      />

      {/* Cancel Order Dialog */}
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title={t("cancelOrder")}
        description={`هل أنت متأكد من إلغاء أمر البيع "${cancelTarget?.orderNumber}"؟`}
        onConfirm={handleCancelOrder}
        confirmText="إلغاء أمر البيع"
        variant="destructive"
        isLoading={isProcessing}
      />

      {/* Convert to Invoice Warehouse Selection Dialog */}
      <Dialog
        open={Boolean(convertToInvoiceTarget)}
        onOpenChange={(open) => !open && setConvertToInvoiceTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("convertToInvoice")}</DialogTitle>
            <DialogDescription>
              إنشاء فاتورة مبيعات جديدة مرتبطة بأمر البيع {convertToInvoiceTarget?.orderNumber}.
              يرجى اختيار مستودع الصرف:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="dispatch-warehouse">مستودع الصرف *</Label>
            <Select
              value={selectedWarehouseId}
              onValueChange={(val) => {
                if (val) setSelectedWarehouseId(val);
              }}
            >
              <SelectTrigger id="dispatch-warehouse">
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
              onClick={() => setConvertToInvoiceTarget(null)}
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

      {/* Delete Order Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("deleteOrder")}
        description={`هل أنت متأكد من حذف أمر البيع "${deleteTarget?.orderNumber}"؟`}
        onConfirm={handleDelete}
        confirmText="حذف نهائي"
        variant="destructive"
        isLoading={isProcessing}
      />
    </div>
  );
}
