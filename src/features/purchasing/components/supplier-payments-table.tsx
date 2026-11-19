"use client";

import * as React from "react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";

import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { SupplierPaymentDialog } from "./supplier-payment-dialog";
import type { SupplierPaymentPayload } from "../types";

interface SupplierPaymentsTableProps {
  data: SupplierPaymentPayload[];
  pageCount: number;
  totalRecords: number;
}

export function SupplierPaymentsTable({
  data,
  pageCount,
  totalRecords,
}: SupplierPaymentsTableProps) {
  const t = useTranslations("purchasing.payments");
  const [createOpen, setCreateOpen] = React.useState(false);

  const columns = React.useMemo<ColumnDef<SupplierPaymentPayload>[]>(
    () => [
      {
        accessorKey: "paymentNumber",
        header: t("paymentNumber"),
        cell: ({ row }) => (
          <span className="font-mono font-medium text-xs bg-muted px-2 py-1 rounded">
            {row.original.paymentNumber}
          </span>
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
                className="font-medium hover:underline text-foreground block"
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
        accessorKey: "invoice",
        header: t("invoice"),
        cell: ({ row }) => {
          const inv = row.original.invoice;
          if (!inv) {
            return (
              <span className="text-xs text-muted-foreground">على الحساب</span>
            );
          }
          return (
            <Link
              href={`/purchasing/invoices/${inv.id}`}
              className="font-mono text-xs font-medium hover:underline text-foreground block"
            >
              {inv.invoiceNumber}
            </Link>
          );
        },
      },
      {
        accessorKey: "date",
        header: t("date"),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {new Date(row.original.date).toLocaleDateString()}
          </span>
        ),
      },
      {
        accessorKey: "method",
        header: t("method"),
        cell: ({ row }) => (
          <span className="bg-muted px-2 py-0.5 rounded text-xs font-medium">
            {row.original.method}
          </span>
        ),
      },
      {
        accessorKey: "reference",
        header: t("reference"),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.reference || "—"}
          </span>
        ),
      },
      {
        accessorKey: "amount",
        header: t("amount"),
        cell: ({ row }) => (
          <div className="font-mono font-bold text-end text-emerald-600">
            {row.original.amount.toLocaleString(undefined, {
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
            <span>{t("addPayment")}</span>
          </Button>
        }
      />

      <SupplierPaymentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
