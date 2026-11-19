"use client";

import * as React from "react";
import { useRouter, Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Eye,
  Plus,
  Printer,
  Send,
  PackageCheck,
  XCircle,
  Trash2,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import { PurchaseOrderStatus } from "@prisma/client";

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
import { PurchaseOrderFormDialog } from "./purchase-order-form-dialog";
import { GoodsReceiptDialog } from "./goods-receipt-dialog";
import {
  sendPurchaseOrderAction,
  cancelPurchaseOrderAction,
  deletePurchaseOrderAction,
} from "../actions/orders";
import type { PurchaseOrderPayload } from "../types";

interface PurchaseOrdersTableProps {
  data: PurchaseOrderPayload[];
  pageCount: number;
  totalRecords: number;
}

export function PurchaseOrdersTable({
  data,
  pageCount,
  totalRecords,
}: PurchaseOrdersTableProps) {
  const t = useTranslations("purchasing.orders");
  const router = useRouter();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOrder, setEditOrder] = React.useState<PurchaseOrderPayload | null>(
    null
  );
  const [receiveTarget, setReceiveTarget] =
    React.useState<PurchaseOrderPayload | null>(null);
  const [cancelTarget, setCancelTarget] =
    React.useState<PurchaseOrderPayload | null>(null);
  const [deleteTarget, setDeleteTarget] =
    React.useState<PurchaseOrderPayload | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  const handleSend = React.useCallback(
    async (id: string) => {
      try {
        const res = await sendPurchaseOrderAction(id);
        if (res.ok) {
          toast.success("تم إرسال أمر الشراء وتغيير حالته إلى مُرسل بنجاح");
          router.refresh();
        } else {
          toast.error(res.error || "تعذر إرسال أمر الشراء");
        }
      } catch {
        toast.error("حدث خطأ غير متوقع");
      }
    },
    [router]
  );

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setActionLoading(true);
    try {
      const res = await cancelPurchaseOrderAction(cancelTarget.id);
      if (res.ok) {
        toast.success("تم إلغاء أمر الشراء بنجاح");
        setCancelTarget(null);
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      const res = await deletePurchaseOrderAction(deleteTarget.id);
      if (res.ok) {
        toast.success("تم حذف أمر الشراء بنجاح");
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(res.error || "تعذر حذف أمر الشراء");
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = React.useMemo<ColumnDef<PurchaseOrderPayload>[]>(
    () => [
      {
        accessorKey: "poNumber",
        header: t("orderNumber"),
        cell: ({ row }) => (
          <Link
            href={`/purchasing/orders/${row.original.id}`}
            className="font-mono font-medium hover:underline text-foreground block"
          >
            {row.original.poNumber}
          </Link>
        ),
      },
      {
        accessorKey: "supplier",
        header: t("supplier"),
        cell: ({ row }) => {
          const supp = row.original.supplier;
          return (
            <div>
              <Link
                href={`/purchasing/suppliers/${supp.id}`}
                className="font-medium hover:underline text-foreground"
              >
                {supp.name}
              </Link>
              <div className="text-xs text-muted-foreground font-mono">
                {supp.code}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "issueDate",
        header: t("issueDate"),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {new Date(row.original.issueDate).toLocaleDateString()}
          </span>
        ),
      },
      {
        accessorKey: "expectedDate",
        header: t("expectedDate"),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.expectedDate
              ? new Date(row.original.expectedDate).toLocaleDateString()
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: t("status"),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "total",
        header: t("grandTotal"),
        cell: ({ row }) => (
          <div className="font-mono font-bold text-end">
            {row.original.total.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}{" "}
            ر.س
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const order = row.original;
          const canEdit = order.status === PurchaseOrderStatus.DRAFT;
          const canSend = order.status === PurchaseOrderStatus.DRAFT;
          const canReceive =
            order.status === PurchaseOrderStatus.SENT ||
            order.status === PurchaseOrderStatus.PARTIALLY_RECEIVED;
          const canCancel =
            order.status === PurchaseOrderStatus.DRAFT ||
            order.status === PurchaseOrderStatus.SENT;
          const canDelete = order.status === PurchaseOrderStatus.DRAFT;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted h-8 w-8 p-0">
                <span className="sr-only">خيارات</span>
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => router.push(`/purchasing/orders/${order.id}`)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Eye className="h-4 w-4" />
                  <span>{t("details")}</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/purchasing/orders/${order.id}/print`)
                  }
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>{t("printPO")}</span>
                </DropdownMenuItem>

                {canSend && (
                  <DropdownMenuItem
                    onClick={() => handleSend(order.id)}
                    className="flex items-center gap-2 cursor-pointer text-primary"
                  >
                    <Send className="h-4 w-4" />
                    <span>{t("sendOrder")}</span>
                  </DropdownMenuItem>
                )}

                {canReceive && (
                  <DropdownMenuItem
                    onClick={() => setReceiveTarget(order)}
                    className="flex items-center gap-2 cursor-pointer text-emerald-600 focus:text-emerald-600 font-medium"
                  >
                    <PackageCheck className="h-4 w-4" />
                    <span>{t("receiveGoods")}</span>
                  </DropdownMenuItem>
                )}

                {canEdit && (
                  <DropdownMenuItem
                    onClick={() => setEditOrder(order)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Edit className="h-4 w-4" />
                    <span>{t("editOrder")}</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {canCancel && (
                  <DropdownMenuItem
                    onClick={() => setCancelTarget(order)}
                    className="flex items-center gap-2 cursor-pointer text-amber-600"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>{t("cancelOrder")}</span>
                  </DropdownMenuItem>
                )}

                {canDelete && (
                  <DropdownMenuItem
                    onClick={() => setDeleteTarget(order)}
                    className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{t("deleteOrder")}</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [t, router, handleSend]
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

      <PurchaseOrderFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => router.refresh()}
      />

      {editOrder && (
        <PurchaseOrderFormDialog
          open={Boolean(editOrder)}
          onOpenChange={(open) => !open && setEditOrder(null)}
          order={editOrder}
          onSuccess={() => {
            setEditOrder(null);
            router.refresh();
          }}
        />
      )}

      {receiveTarget && (
        <GoodsReceiptDialog
          open={Boolean(receiveTarget)}
          onOpenChange={(open) => !open && setReceiveTarget(null)}
          order={receiveTarget}
          onSuccess={() => {
            setReceiveTarget(null);
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="تأكيد إلغاء أمر الشراء"
        description={`هل أنت متأكد من رغبتك في إلغاء أمر الشراء رقم (${cancelTarget?.poNumber})؟`}
        confirmText="نعم، إلغاء الطلب"
        cancelText="تراجع"
        variant="destructive"
        isLoading={actionLoading}
        onConfirm={handleCancel}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="تأكيد حذف أمر الشراء"
        description={`هل أنت متأكد من حذف مسودة أمر الشراء (${deleteTarget?.poNumber})؟`}
        confirmText="نعم، حذف"
        cancelText="إلغاء"
        variant="destructive"
        isLoading={actionLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
