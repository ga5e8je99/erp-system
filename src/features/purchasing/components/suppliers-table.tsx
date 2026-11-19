"use client";

import * as React from "react";
import { useRouter, Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Plus,
  Phone,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SupplierFormDialog } from "./supplier-form-dialog";
import { deleteSupplierAction } from "../actions/suppliers";
import type { SupplierWithCounts } from "../types";

interface SuppliersTableProps {
  data: SupplierWithCounts[];
  pageCount: number;
  totalRecords: number;
}

export function SuppliersTable({
  data,
  pageCount,
  totalRecords,
}: SuppliersTableProps) {
  const t = useTranslations("purchasing.suppliers");
  const router = useRouter();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editSupplier, setEditSupplier] =
    React.useState<SupplierWithCounts | null>(null);
  const [deleteTarget, setDeleteTarget] =
    React.useState<SupplierWithCounts | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteSupplierAction(deleteTarget.id);
      if (res.ok) {
        toast.success("تم حذف المورد بنجاح");
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(res.error || "تعذر حذف المورد");
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = React.useMemo<ColumnDef<SupplierWithCounts>[]>(
    () => [
      {
        accessorKey: "code",
        header: t("code"),
        cell: ({ row }) => (
          <span className="font-mono font-medium text-xs bg-muted px-2 py-1 rounded">
            {row.original.code}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: t("name"),
        cell: ({ row }) => {
          const supp = row.original;
          return (
            <div>
              <Link
                href={`/purchasing/suppliers/${supp.id}`}
                className="font-medium hover:underline text-foreground block"
              >
                {supp.name}
              </Link>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                {supp.phone && (
                  <span className="flex items-center gap-1" dir="ltr">
                    <Phone className="h-3 w-3" />
                    {supp.phone}
                  </span>
                )}
                {supp.email && (
                  <span className="flex items-center gap-1" dir="ltr">
                    <Mail className="h-3 w-3" />
                    {supp.email}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "taxNumber",
        header: t("taxNumber"),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.taxNumber || "—"}
          </span>
        ),
      },
      {
        accessorKey: "balance",
        header: t("currentBalance"),
        cell: ({ row }) => {
          const balance = Number(row.original.balance);
          return (
            <div
              className={`font-mono font-bold ${
                balance > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-muted-foreground"
              }`}
            >
              {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
              ر.س
            </div>
          );
        },
      },
      {
        id: "ordersCount",
        header: t("ordersCount"),
        cell: ({ row }) => (
          <span className="font-mono text-center block">
            {row.original._count.orders}
          </span>
        ),
      },
      {
        id: "invoicesCount",
        header: t("invoicesCount"),
        cell: ({ row }) => (
          <span className="font-mono text-center block">
            {row.original._count.invoices}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const supp = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted h-8 w-8 p-0">
                <span className="sr-only">خيارات</span>
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => router.push(`/purchasing/suppliers/${supp.id}`)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Eye className="h-4 w-4" />
                  <span>{t("details")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setEditSupplier(supp)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Edit className="h-4 w-4" />
                  <span>تعديل البيانات</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteTarget(supp)}
                  className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>حذف المورد</span>
                </DropdownMenuItem>
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
            <span>{t("addSupplier")}</span>
          </Button>
        }
      />

      <SupplierFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => router.refresh()}
      />

      {editSupplier && (
        <SupplierFormDialog
          open={Boolean(editSupplier)}
          onOpenChange={(open) => !open && setEditSupplier(null)}
          supplier={editSupplier}
          onSuccess={() => {
            setEditSupplier(null);
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="تأكيد حذف المورد"
        description={`هل أنت متأكد من رغبتك في حذف المورد (${deleteTarget?.name})؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="نعم، حذف المورد"
        cancelText="إلغاء"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
