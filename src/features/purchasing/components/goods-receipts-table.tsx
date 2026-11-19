"use client";

import * as React from "react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";

import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { GoodsReceiptDialog } from "./goods-receipt-dialog";
import type { GoodsReceiptPayload } from "../types";

interface GoodsReceiptsTableProps {
  data: GoodsReceiptPayload[];
  pageCount: number;
  totalRecords: number;
}

export function GoodsReceiptsTable({
  data,
  pageCount,
  totalRecords,
}: GoodsReceiptsTableProps) {
  const t = useTranslations("purchasing.receipts");
  const [createOpen, setCreateOpen] = React.useState(false);

  const columns = React.useMemo<ColumnDef<GoodsReceiptPayload>[]>(
    () => [
      {
        accessorKey: "receiptNumber",
        header: t("receiptNumber"),
        cell: ({ row }) => (
          <span className="font-mono font-medium text-xs bg-muted px-2 py-1 rounded">
            {row.original.receiptNumber}
          </span>
        ),
      },
      {
        accessorKey: "po",
        header: t("poNumber"),
        cell: ({ row }) => {
          const po = row.original.po;
          if (!po) {
            return (
              <span className="text-xs text-muted-foreground">استلام مباشر</span>
            );
          }
          return (
            <Link
              href={`/purchasing/orders/${po.id}`}
              className="font-mono text-xs font-medium hover:underline text-foreground block"
            >
              {po.poNumber}
            </Link>
          );
        },
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
            {row.original.warehouse.name}
          </span>
        ),
      },
      {
        accessorKey: "receiveDate",
        header: t("receiveDate"),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {new Date(row.original.receiveDate).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: "itemsCount",
        header: t("itemsCount"),
        cell: ({ row }) => (
          <span className="font-mono text-center block">
            {row.original.items.length}
          </span>
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
            <span>{t("createReceipt")}</span>
          </Button>
        }
      />

      <GoodsReceiptDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
