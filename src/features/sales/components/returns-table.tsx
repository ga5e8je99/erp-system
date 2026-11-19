"use client";

import * as React from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";

import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SalesReturnDialog } from "./sales-return-dialog";

export interface ReturnTableRow {
  id: string;
  returnNumber: string;
  customerId: string;
  customer: { id: string; name: string; code: string };
  invoice?: { id: string; invoiceNumber: string } | null;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: Date | string;
  notes?: string | null;
  _count: { items: number };
}

interface ReturnsTableProps {
  data: ReturnTableRow[];
  warehouses: { id: string; name: string; code: string }[];
  pageCount: number;
  currentPage: number;
  pageSize: number;
  totalRecords: number;
}

export function ReturnsTable({
  data,
  warehouses,
  pageCount,
  totalRecords,
}: ReturnsTableProps) {
  const t = useTranslations("sales.returns");
  const router = useRouter();

  const [createOpen, setCreateOpen] = React.useState(false);

  const columns = React.useMemo<ColumnDef<ReturnTableRow>[]>(
    () => [
      {
        accessorKey: "returnNumber",
        header: t("returnNumber"),
        cell: ({ row }) => (
          <span className="font-mono font-bold text-primary">
            {row.original.returnNumber}
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
        accessorKey: "invoice",
        header: t("invoice"),
        cell: ({ row }) => {
          const inv = row.original.invoice;
          if (!inv) return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <span
              className="font-mono text-xs text-primary hover:underline cursor-pointer"
              onClick={() => router.push(`/sales/invoices/${inv.id}`)}
            >
              {inv.invoiceNumber}
            </span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "تاريخ المرتجع",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {new Date(row.original.createdAt).toLocaleDateString("ar-EG")}
          </span>
        ),
      },
      {
        accessorKey: "total",
        header: t("total"),
        cell: ({ row }) => (
          <span className="font-mono font-bold text-destructive">
            -{Number(row.original.total).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}{" "}
            ر.س
          </span>
        ),
      },
      {
        id: "status",
        header: "الحالة",
        cell: () => (
          <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">
            مكتمل ومرحل
          </Badge>
        ),
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
            <span>{t("addReturn")}</span>
          </Button>
        }
      />

      <SalesReturnDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        warehouses={warehouses}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
