"use client";

import * as React from "react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";

import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { PurchaseReturnDialog } from "./purchase-return-dialog";
import type { PurchaseReturnPayload } from "../types";

interface PurchaseReturnsTableProps {
  data: PurchaseReturnPayload[];
  pageCount: number;
  totalRecords: number;
}

export function PurchaseReturnsTable({
  data,
  pageCount,
  totalRecords,
}: PurchaseReturnsTableProps) {
  const t = useTranslations("purchasing.returns");
  const [createOpen, setCreateOpen] = React.useState(false);

  const columns = React.useMemo<ColumnDef<PurchaseReturnPayload>[]>(
    () => [
      {
        accessorKey: "returnNumber",
        header: t("returnNumber"),
        cell: ({ row }) => (
          <span className="font-mono font-medium text-xs bg-muted px-2 py-1 rounded">
            {row.original.returnNumber}
          </span>
        ),
      },
      {
        accessorKey: "supplier",
        header: t("supplier"),
        cell: ({ row }) => {
          const s = row.original.supplier;
          return (
            <div>
              <Link
                href={`/purchasing/suppliers/${s.id}`}
                className="font-medium hover:underline text-foreground block"
              >
                {s.name}
              </Link>
              <span className="font-mono text-xs text-muted-foreground">
                {s.code}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "warehouse",
        header: t("warehouse"),
        cell: ({ row }) => (
          <span className="text-sm font-medium">
            {row.original.warehouse?.name || "—"}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: t("date"),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {new Date(row.original.createdAt).toLocaleDateString()}
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
        header: t("total"),
        cell: ({ row }) => (
          <div className="font-mono font-bold text-end text-rose-600">
            {row.original.total.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}{" "}
            ر.س
          </div>
        ),
      },
    ],
    [t]
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

      <PurchaseReturnDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
