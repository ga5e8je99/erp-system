"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import {
  AlertTriangle,
  Sliders,
  ArrowRightLeft,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StockOverviewItem } from "../types";
import { StockAdjustmentDialog } from "./stock-adjustment-dialog";
import { StockTransferDialog } from "./stock-transfer-dialog";

interface StockOverviewTableProps {
  data: StockOverviewItem[];
  totalCount: number;
  pageCount: number;
  warehouses: { id: string; name: string; code: string }[];
  selectedWarehouse?: string;
  lowStockOnly?: boolean;
}

export function StockOverviewTable({
  data,
  totalCount,
  pageCount,
  warehouses,
  selectedWarehouse = "all",
  lowStockOnly = false,
}: StockOverviewTableProps) {
  const t = useTranslations("inventory.stock");
  const router = useRouter();

  const [adjustmentOpen, setAdjustmentOpen] = React.useState(false);
  const [transferOpen, setTransferOpen] = React.useState(false);

  const updateFilters = (key: string, value: string) => {
    const url = new URL(window.location.href);
    if (!value || value === "all" || value === "false") {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
    url.searchParams.set("page", "1");
    router.push(url.pathname + url.search);
  };

  const columns: ColumnDef<StockOverviewItem>[] = [
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => (
        <Link
          href={`/inventory/products/${row.original.productId}`}
          className="font-mono text-xs font-bold text-primary hover:underline"
        >
          {row.original.sku}
        </Link>
      ),
    },
    {
      accessorKey: "productName",
      header: "المنتج",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex flex-col max-w-[220px]">
            <Link
              href={`/inventory/products/${item.productId}`}
              className="font-medium text-foreground hover:underline truncate"
            >
              {item.productName}
            </Link>
            {item.categoryName && (
              <span className="text-[11px] text-muted-foreground">
                {item.categoryName}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "unitSymbol",
      header: t("unit"),
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-normal text-xs">
          {row.original.unitSymbol}
        </Badge>
      ),
    },
    {
      id: "warehouseStocks",
      header: "توزيع المستودعات",
      cell: ({ row }) => {
        const stocks = row.original.warehouseStocks;
        return (
          <div className="flex flex-wrap gap-1.5 max-w-[280px]">
            {stocks.map((s) => (
              <span
                key={s.warehouseId}
                className="inline-flex items-center gap-1 rounded bg-muted/70 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                title={s.warehouseName}
              >
                <span>{s.warehouseCode}:</span>
                <span className="font-semibold text-foreground">{s.quantity}</span>
              </span>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "totalQuantity",
      header: t("totalStock"),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
            <span
              className={
                item.isLowStock
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-foreground"
              }
            >
              {item.totalQuantity} {item.unitSymbol}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "reorderLevel",
      header: t("reorderLevel"),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.reorderLevel}
        </span>
      ),
    },
    {
      id: "status",
      header: "حالة المخزون",
      cell: ({ row }) => {
        const item = row.original;
        if (item.isLowStock) {
          return (
            <Badge
              variant="outline"
              className="gap-1 border-amber-500/40 bg-amber-50 text-[11px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            >
              <AlertTriangle className="h-3 w-3" />
              منخفض المخزون
            </Badge>
          );
        }

        return (
          <Badge
            variant="outline"
            className="gap-1 border-emerald-500/40 bg-emerald-50 text-[11px] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <CheckCircle2 className="h-3 w-3" />
            متوفر
          </Badge>
        );
      },
    },
  ];

  const exportData = data.map((item) => ({
    SKU: item.sku,
    Product: item.productName,
    Category: item.categoryName || "",
    Unit: item.unitSymbol,
    TotalStock: item.totalQuantity,
    ReorderLevel: item.reorderLevel,
    Status: item.isLowStock ? "Low Stock" : "In Stock",
  }));

  const filterSlot = (
    <div className="flex flex-wrap items-center gap-2">
      {/* Warehouse Selector */}
      <Select
        value={selectedWarehouse}
        onValueChange={(val) => updateFilters("warehouse", val || "all")}
      >
        <SelectTrigger className="w-[170px] h-9 text-xs">
          <SelectValue placeholder={t("allWarehouses")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allWarehouses")}</SelectItem>
          {warehouses.map((w) => (
            <SelectItem key={w.id} value={w.id}>
              {w.name} ({w.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Low Stock Toggle */}
      <Button
        variant={lowStockOnly ? "default" : "outline"}
        size="sm"
        className="h-9 text-xs gap-1.5"
        onClick={() => updateFilters("lowStock", lowStockOnly ? "false" : "true")}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        {lowStockOnly ? "عرض الكل" : "المنخفض فقط"}
      </Button>

      {/* Quick Action: Stock Adjustment */}
      <Button
        variant="outline"
        size="sm"
        className="h-9 text-xs gap-1.5"
        onClick={() => setAdjustmentOpen(true)}
      >
        <Sliders className="h-3.5 w-3.5 text-primary" />
        {t("adjustStock")}
      </Button>

      {/* Quick Action: Transfer Stock */}
      <Button
        variant="outline"
        size="sm"
        className="h-9 text-xs gap-1.5"
        onClick={() => setTransferOpen(true)}
      >
        <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
        {t("transferStock")}
      </Button>

      {/* Quick Action: Movement Ledger */}
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="h-9 text-xs gap-1.5"
      >
        <Link href="/inventory/movements">
          <BookOpen className="h-3.5 w-3.5" />
          {t("viewLedger")}
        </Link>
      </Button>
    </div>
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        totalCount={totalCount}
        pageCount={pageCount}
        searchPlaceholder="بحث في أرصدة الأصناف..."
        exportFilename="masar_stock_overview"
        exportData={exportData}
        filterSlot={filterSlot}
      />

      <StockAdjustmentDialog
        open={adjustmentOpen}
        onOpenChange={setAdjustmentOpen}
        warehouses={warehouses}
        onSuccess={() => router.refresh()}
      />

      <StockTransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        warehouses={warehouses}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
