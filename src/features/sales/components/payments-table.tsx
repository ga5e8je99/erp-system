"use client";

import * as React from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { PaymentMethod } from "@prisma/client";

import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentDialog } from "./payment-dialog";

export interface PaymentTableRow {
  id: string;
  paymentNumber: string;
  customerId: string;
  customer: { id: string; name: string; code: string };
  invoice?: { id: string; invoiceNumber: string; total: number } | null;
  amount: number;
  method: PaymentMethod;
  date: Date | string;
  reference?: string | null;
  notes?: string | null;
}

interface PaymentsTableProps {
  data: PaymentTableRow[];
  pageCount: number;
  currentPage: number;
  pageSize: number;
  totalRecords: number;
}

export function PaymentsTable({
  data,
  pageCount,
  totalRecords,
}: PaymentsTableProps) {
  const t = useTranslations("sales.payments");
  const router = useRouter();

  const [createOpen, setCreateOpen] = React.useState(false);

  const columns = React.useMemo<ColumnDef<PaymentTableRow>[]>(
    () => [
      {
        accessorKey: "paymentNumber",
        header: t("paymentNumber"),
        cell: ({ row }) => (
          <span className="font-mono font-bold text-primary">
            {row.original.paymentNumber}
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
          if (!inv) {
            return <Badge variant="secondary" className="text-xs">على الحساب</Badge>;
          }
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
        accessorKey: "date",
        header: t("date"),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {new Date(row.original.date).toLocaleDateString("ar-EG")}
          </span>
        ),
      },
      {
        accessorKey: "method",
        header: t("method"),
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            {row.original.method === "CASH"
              ? "نقداً"
              : row.original.method === "BANK"
              ? "تحويل بنكي"
              : row.original.method === "CARD"
              ? "بطاقة دفع"
              : "شيك بنكي"}
          </Badge>
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
          <span className="font-mono font-bold text-emerald-600">
            {Number(row.original.amount).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}{" "}
            ر.س
          </span>
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
            <span>{t("addPayment")}</span>
          </Button>
        }
      />

      <PaymentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
