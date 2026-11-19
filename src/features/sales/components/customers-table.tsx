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
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CustomerFormDialog } from "./customer-form-dialog";
import { deleteCustomerAction } from "../actions/customers";
import type { CustomerWithCounts } from "../types";

interface CustomersTableProps {
  data: CustomerWithCounts[];
  pageCount: number;
  currentPage: number;
  pageSize: number;
  totalRecords: number;
}

export function CustomersTable({
  data,
  pageCount,
  totalRecords,
}: CustomersTableProps) {
  const t = useTranslations("sales.customers");
  const router = useRouter();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editCustomer, setEditCustomer] = React.useState<CustomerWithCounts | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<CustomerWithCounts | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteCustomerAction(deleteTarget.id);
      if (res.ok) {
        toast.success(`تم حذف العميل ${deleteTarget.name} بنجاح`);
        router.refresh();
      } else {
        toast.error(res.error || "فشل حذف العميل");
      }
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const columns = React.useMemo<ColumnDef<CustomerWithCounts>[]>(
    () => [
      {
        accessorKey: "code",
        header: t("code"),
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-primary">
            {row.original.code}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: t("name"),
        cell: ({ row }) => {
          const cust = row.original;
          return (
            <div>
              <Link
                href={`/sales/customers/${cust.id}`}
                className="font-medium hover:underline cursor-pointer text-foreground block"
              >
                {cust.name}
              </Link>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                {cust.phone && (
                  <span className="flex items-center gap-1" dir="ltr">
                    <Phone className="h-3 w-3" />
                    {cust.phone}
                  </span>
                )}
                {cust.email && (
                  <span className="flex items-center gap-1" dir="ltr">
                    <Mail className="h-3 w-3" />
                    {cust.email}
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
        accessorKey: "creditLimit",
        header: t("creditLimit"),
        cell: ({ row }) => {
          const limit = Number(row.original.creditLimit);
          return (
            <span className="font-mono">
              {limit > 0
                ? `${limit.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س`
                : "غير محدد"}
            </span>
          );
        },
      },
      {
        accessorKey: "balance",
        header: t("balance"),
        cell: ({ row }) => {
          const balance = Number(row.original.balance);
          const limit = Number(row.original.creditLimit);
          const isOverLimit = limit > 0 && balance > limit;

          return (
            <div className="space-y-1">
              <div
                className={`font-mono font-bold ${
                  balance > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : balance < 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground"
                }`}
              >
                {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
              </div>
              {isOverLimit && (
                <Badge variant="destructive" className="h-4 text-[10px] px-1 gap-1">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  <span>تجاوز الحد</span>
                </Badge>
              )}
            </div>
          );
        },
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
        header: t("actions"),
        cell: ({ row }) => {
          const cust = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted h-8 w-8 p-0">
                <span className="sr-only">خيارات</span>
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => router.push(`/sales/customers/${cust.id}`)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Eye className="h-4 w-4" />
                  <span>{t("details")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setEditCustomer(cust)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Edit className="h-4 w-4" />
                  <span>تعديل البيانات</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteTarget(cust)}
                  className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>حذف العميل</span>
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
            <span>{t("addCustomer")}</span>
          </Button>
        }
      />

      <CustomerFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => router.refresh()}
      />

      {editCustomer && (
        <CustomerFormDialog
          open={Boolean(editCustomer)}
          onOpenChange={(open) => !open && setEditCustomer(null)}
          customer={editCustomer}
          onSuccess={() => router.refresh()}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`حذف العميل "${deleteTarget?.name}"`}
        description="هل أنت متأكد من حذف هذا العميل؟ لن يمكنك حذف العميل إذا كان لديه أي فواتير أو سندات سابقة."
        onConfirm={handleDelete}
        confirmText="حذف العميل"
        variant="destructive"
        isLoading={isDeleting}
      />
    </div>
  );
}
