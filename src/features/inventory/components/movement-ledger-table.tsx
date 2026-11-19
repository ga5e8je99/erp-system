"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { StockMovementType } from "@prisma/client";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Sliders,
} from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface StockMovementItem {
  id: string;
  productId: string;
  warehouseId: string;
  type: StockMovementType;
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  note: string | null;
  createdById: string | null;
  createdAt: Date;
  product: {
    id: string;
    name: string;
    sku: string;
    unit: { symbol: string };
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
}

interface MovementLedgerTableProps {
  data: StockMovementItem[];
  totalCount: number;
  pageCount: number;
  warehouses: { id: string; name: string; code: string }[];
  selectedWarehouse?: string;
  selectedType?: string;
  locale?: string;
}

export function MovementLedgerTable({
  data,
  totalCount,
  pageCount,
  warehouses,
  selectedWarehouse = "all",
  selectedType = "all",
  locale = "ar",
}: MovementLedgerTableProps) {
  const t = useTranslations("inventory.movements");
  const router = useRouter();

  const dateLocale = locale === "ar" ? ar : enUS;

  const updateFilters = (key: string, value: string) => {
    const url = new URL(window.location.href);
    if (!value || value === "all") {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
    url.searchParams.set("page", "1");
    router.push(url.pathname + url.search);
  };

  const getMovementTypeBadge = (type: StockMovementType, refType?: string | null) => {
    switch (type) {
      case StockMovementType.IN:
        return (
          <Badge
            variant="outline"
            className="gap-1 border-emerald-500/40 bg-emerald-50 text-[11px] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <ArrowDownLeft className="h-3 w-3" />
            {t("types.IN")}
          </Badge>
        );
      case StockMovementType.OUT:
        return (
          <Badge
            variant="outline"
            className="gap-1 border-rose-500/40 bg-rose-50 text-[11px] text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
          >
            <ArrowUpRight className="h-3 w-3" />
            {t("types.OUT")}
          </Badge>
        );
      case StockMovementType.TRANSFER:
        return (
          <Badge
            variant="outline"
            className="gap-1 border-sky-500/40 bg-sky-50 text-[11px] text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
          >
            <ArrowRightLeft className="h-3 w-3" />
            {refType === "TRANSFER_IN" ? "تحويل وارد" : refType === "TRANSFER_OUT" ? "تحويل صادر" : t("types.TRANSFER")}
          </Badge>
        );
      case StockMovementType.ADJUSTMENT:
        return (
          <Badge
            variant="outline"
            className="gap-1 border-amber-500/40 bg-amber-50 text-[11px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
          >
            <Sliders className="h-3 w-3" />
            {refType === "ADJUSTMENT_INCREASE" ? "تسوية إضافة" : refType === "ADJUSTMENT_DECREASE" ? "تسوية خصم" : t("types.ADJUSTMENT")}
          </Badge>
        );
    }
  };

  const columns: ColumnDef<StockMovementItem>[] = [
    {
      accessorKey: "createdAt",
      header: t("date"),
      cell: ({ row }) => {
        const d = new Date(row.original.createdAt);
        return (
          <div className="flex flex-col text-xs font-mono">
            <span className="font-semibold text-foreground">
              {format(d, "yyyy-MM-dd", { locale: dateLocale })}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {format(d, "HH:mm:ss", { locale: dateLocale })}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: t("type"),
      cell: ({ row }) =>
        getMovementTypeBadge(row.original.type, row.original.referenceType),
    },
    {
      id: "product",
      header: t("product"),
      cell: ({ row }) => {
        const p = row.original.product;
        return (
          <div className="flex flex-col max-w-[200px]">
            <Link
              href={`/inventory/products/${p.id}`}
              className="font-medium text-xs text-foreground hover:underline truncate"
            >
              {p.name}
            </Link>
            <span className="font-mono text-[10px] text-muted-foreground">
              {p.sku}
            </span>
          </div>
        );
      },
    },
    {
      id: "warehouse",
      header: t("warehouse"),
      cell: ({ row }) => (
        <span className="font-medium text-xs">
          {row.original.warehouse.name} ({row.original.warehouse.code})
        </span>
      ),
    },
    {
      accessorKey: "quantity",
      header: t("quantity"),
      cell: ({ row }) => {
        const m = row.original;
        const isDecrease =
          m.type === StockMovementType.OUT ||
          m.referenceType === "TRANSFER_OUT" ||
          m.referenceType === "ADJUSTMENT_DECREASE";

        return (
          <div className="font-mono text-xs font-bold">
            <span
              className={
                isDecrease
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }
            >
              {isDecrease ? "-" : "+"}
              {m.quantity} {m.product.unit.symbol}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "referenceId",
      header: t("reference"),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs font-semibold">
            {row.original.referenceId || "—"}
          </span>
          {row.original.referenceType && (
            <span className="text-[10px] text-muted-foreground">
              {row.original.referenceType}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "note",
      header: t("note"),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground line-clamp-1 max-w-[250px]">
          {row.original.note || "—"}
        </span>
      ),
    },
  ];

  const exportData = data.map((m) => ({
    Date: format(new Date(m.createdAt), "yyyy-MM-dd HH:mm:ss"),
    Type: m.type,
    ReferenceType: m.referenceType || "",
    SKU: m.product.sku,
    Product: m.product.name,
    Warehouse: m.warehouse.name,
    Quantity: m.quantity,
    Unit: m.product.unit.symbol,
    Reference: m.referenceId || "",
    Note: m.note || "",
  }));

  const filterSlot = (
    <div className="flex flex-wrap items-center gap-2">
      {/* Warehouse Selector */}
      <Select
        value={selectedWarehouse}
        onValueChange={(val) => updateFilters("warehouse", val || "all")}
      >
        <SelectTrigger className="w-[160px] h-9 text-xs">
          <SelectValue placeholder="جميع المستودعات" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">جميع المستودعات</SelectItem>
          {warehouses.map((w) => (
            <SelectItem key={w.id} value={w.id}>
              {w.name} ({w.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Movement Type Selector */}
      <Select
        value={selectedType}
        onValueChange={(val) => updateFilters("type", val || "all")}
      >
        <SelectTrigger className="w-[150px] h-9 text-xs">
          <SelectValue placeholder={t("types.ALL")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("types.ALL")}</SelectItem>
          <SelectItem value="IN">{t("types.IN")}</SelectItem>
          <SelectItem value="OUT">{t("types.OUT")}</SelectItem>
          <SelectItem value="TRANSFER">{t("types.TRANSFER")}</SelectItem>
          <SelectItem value="ADJUSTMENT">{t("types.ADJUSTMENT")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      totalCount={totalCount}
      pageCount={pageCount}
      searchPlaceholder="بحث في سندات وبيانات الحركات..."
      exportFilename="masar_stock_movements_ledger"
      exportData={exportData}
      filterSlot={filterSlot}
    />
  );
}
