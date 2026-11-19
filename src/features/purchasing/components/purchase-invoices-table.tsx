"use client";

import * as React from "react";
import { useRouter, Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Eye,
  Plus,
  Send,
  CreditCard,
  Trash2,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import { PurchaseInvoiceStatus } from "@prisma/client";

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
import { PurchaseInvoiceFormDialog } from "./purchase-invoice-form-dialog";
import { SupplierPaymentDialog } from "./supplier-payment-dialog";
import {
  postPurchaseInvoiceAction,
  deletePurchaseInvoiceAction,
} from "../actions/invoices";
import type { PurchaseInvoicePayload } from "../types";

interface PurchaseInvoicesTableProps {
  data: PurchaseInvoicePayload[];
  pageCount: number;
  totalRecords: number;
}

export function PurchaseInvoicesTable({
  data,
  pageCount,
  totalRecords,
}: PurchaseInvoicesTableProps) {
  const t = useTranslations("purchasing.invoices");
  const router = useRouter();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editInvoice, setEditInvoice] =
    React.useState<PurchaseInvoicePayload | null>(null);
  const [postTarget, setPostTarget] =
    React.useState<PurchaseInvoicePayload | null>(null);
  const [payTarget, setPayTarget] =
    React.useState<PurchaseInvoicePayload | null>(null);
  const [deleteTarget, setDeleteTarget] =
    React.useState<PurchaseInvoicePayload | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  const handlePost = async () => {
    if (!postTarget) return;
    setActionLoading(true);
    try {
      const res = await postPurchaseInvoiceAction(postTarget.id);
      if (res.ok) {
        toast.success(
          "تم ترحيل الفاتورة بنجاح وتوليد قيد الاستحقاق اليومي وزيادة رصيد المورد!"
        );
        setPostTarget(null);
        router.refresh();
      } else {
        toast.error(res.error || "تعذر ترحيل الفاتورة");
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
      const res = await deletePurchaseInvoiceAction(deleteTarget.id);
      if (res.ok) {
        toast.success("تم حذف مسودة الفاتورة بنجاح");
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(res.error || "تعذر حذف الفاتورة");
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = React.useMemo<ColumnDef<PurchaseInvoicePayload>[]>(
    () => [
      {
        accessorKey: "invoiceNumber",
        header: t("invoiceNumber"),
        cell: ({ row }) => (
          <Link
            href={`/purchasing/invoices/${row.original.id}`}
            className="font-mono font-medium hover:underline text-foreground block"
          >
            {row.original.invoiceNumber}
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
        accessorKey: "dueDate",
        header: t("dueDate"),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {new Date(row.original.dueDate).toLocaleDateString()}
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
        accessorKey: "paidAmount",
        header: t("paidAmount"),
        cell: ({ row }) => (
          <div className="font-mono text-end text-emerald-600">
            {row.original.paidAmount.toLocaleString(undefined, {
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
          const inv = row.original;
          const isDraft = inv.status === PurchaseInvoiceStatus.DRAFT;
          const canPay =
            inv.status === PurchaseInvoiceStatus.ISSUED ||
            inv.status === PurchaseInvoiceStatus.PARTIALLY_PAID;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted h-8 w-8 p-0">
                <span className="sr-only">خيارات</span>
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => router.push(`/purchasing/invoices/${inv.id}`)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Eye className="h-4 w-4" />
                  <span>{t("details")}</span>
                </DropdownMenuItem>

                {isDraft && (
                  <DropdownMenuItem
                    onClick={() => setPostTarget(inv)}
                    className="flex items-center gap-2 cursor-pointer text-primary font-medium"
                  >
                    <Send className="h-4 w-4" />
                    <span>{t("postInvoice")}</span>
                  </DropdownMenuItem>
                )}

                {canPay && (
                  <DropdownMenuItem
                    onClick={() => setPayTarget(inv)}
                    className="flex items-center gap-2 cursor-pointer text-emerald-600 focus:text-emerald-600 font-medium"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>{t("recordPayment")}</span>
                  </DropdownMenuItem>
                )}

                {isDraft && (
                  <DropdownMenuItem
                    onClick={() => setEditInvoice(inv)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Edit className="h-4 w-4" />
                    <span>{t("editInvoice")}</span>
                  </DropdownMenuItem>
                )}

                {isDraft && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteTarget(inv)}
                      className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>{t("deleteInvoice")}</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
            <span>{t("addInvoice")}</span>
          </Button>
        }
      />

      <PurchaseInvoiceFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => router.refresh()}
      />

      {editInvoice && (
        <PurchaseInvoiceFormDialog
          open={Boolean(editInvoice)}
          onOpenChange={(open) => !open && setEditInvoice(null)}
          invoice={editInvoice}
          onSuccess={() => {
            setEditInvoice(null);
            router.refresh();
          }}
        />
      )}

      {payTarget && (
        <SupplierPaymentDialog
          open={Boolean(payTarget)}
          onOpenChange={(open) => !open && setPayTarget(null)}
          invoice={payTarget}
          onSuccess={() => {
            setPayTarget(null);
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(postTarget)}
        onOpenChange={(open) => !open && setPostTarget(null)}
        title="تأكيد ترحيل فاتورة المشتريات"
        description={`هل أنت متأكد من رغبتك في ترحيل الفاتورة رقم (${postTarget?.invoiceNumber}) بمبلغ إجمالي ${postTarget?.total.toLocaleString()} ر.س؟ سيتم إقفال الفاتورة وتوليد قيد اليومية تلقائياً وإضافة المبلغ لرصيد المورد.`}
        confirmText="نعم، ترحيل الفاتورة"
        cancelText="إلغاء"
        variant="default"
        isLoading={actionLoading}
        onConfirm={handlePost}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="تأكيد حذف الفاتورة"
        description={`هل أنت متأكد من حذف مسودة الفاتورة (${deleteTarget?.invoiceNumber})؟`}
        confirmText="نعم، حذف"
        cancelText="إلغاء"
        variant="destructive"
        isLoading={actionLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
