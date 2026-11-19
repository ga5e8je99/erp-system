"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Power,
  AlertTriangle,
  Plus,
  Upload,
} from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ProductFormDialog } from "./product-form-dialog";
import { ProductCsvImportDialog } from "./product-csv-import-dialog";
import {
  toggleProductStatusAction,
  deleteProductAction,
} from "../actions/products";
import { formatMoney, toMinorUnits } from "@/lib/money";

export interface ProductRow {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  unitId: string;
  unit: { id: string; name: string; symbol: string };
  costPrice: number;
  salePrice: number;
  taxRate: number;
  reorderLevel: number;
  isActive: boolean;
  trackStock: boolean;
  totalStock: number;
  isLowStock: boolean;
  createdAt: Date;
}

interface ProductsTableProps {
  data: ProductRow[];
  totalCount: number;
  pageCount: number;
  categories: { id: string; name: string }[];
  units: { id: string; name: string; symbol: string }[];
  selectedCategory?: string;
  selectedStatus?: string;
  lowStockOnly?: boolean;
}

export function ProductsTable({
  data,
  totalCount,
  pageCount,
  categories,
  units,
  selectedCategory = "all",
  selectedStatus = "all",
  lowStockOnly = false,
}: ProductsTableProps) {
  const t = useTranslations("inventory.products");
  const tCommon = useTranslations("common");
  const router = useRouter();

  // Dialog states
  const [formOpen, setFormOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<ProductRow | null>(null);

  // Delete confirm dialog
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [optimisticStatus, setOptimisticStatus] = React.useState<Record<string, boolean>>({});

  const handleEdit = (product: ProductRow) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };

  const handleToggleStatus = async (id: string, current: boolean) => {
    const next = !current;
    setOptimisticStatus((prev) => ({ ...prev, [id]: next }));
    try {
      const res = await toggleProductStatusAction(id);
      if (res.ok) {
        toast.success(t("statusToggled"));
        router.refresh();
      } else {
        setOptimisticStatus((prev) => {
          const cp = { ...prev };
          delete cp[id];
          return cp;
        });
        toast.error(res.error);
      }
    } catch {
      setOptimisticStatus((prev) => {
        const cp = { ...prev };
        delete cp[id];
        return cp;
      });
      toast.error(tCommon("error"));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await deleteProductAction(deleteId);
      if (res.ok) {
        toast.success(t("deletedSuccess"));
        setDeleteId(null);
        router.refresh();
      } else {
        if (res.error === "CANNOT_DELETE_PRODUCT_WITH_MOVEMENTS") {
          toast.error(t("cannotDeleteWithMovements"));
        } else {
          toast.error(res.error);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon("error"));
    } finally {
      setIsDeleting(false);
    }
  };

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

  const columns: ColumnDef<ProductRow>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            table.getIsSomePageRowsSelected()
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "sku",
      header: t("sku"),
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex flex-col">
            <Link
              href={`/inventory/products/${p.id}`}
              className="font-mono text-xs font-semibold text-primary hover:underline"
            >
              {p.sku}
            </Link>
            {p.barcode && (
              <span className="font-mono text-[10px] text-muted-foreground">
                {p.barcode}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "name",
      header: t("name"),
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex flex-col max-w-[240px]">
            <Link
              href={`/inventory/products/${p.id}`}
              className="font-medium text-foreground hover:underline truncate"
            >
              {p.name}
            </Link>
            <div className="flex items-center gap-1.5 mt-0.5">
              {p.category ? (
                <span className="text-[11px] text-muted-foreground">
                  {p.category.name}
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground/60">—</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "unit",
      header: t("unit"),
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-normal text-xs">
          {row.original.unit.symbol}
        </Badge>
      ),
    },
    {
      accessorKey: "salePrice",
      header: t("salePrice"),
      cell: ({ row }) => (
        <span className="font-mono font-medium text-xs">
          {formatMoney(toMinorUnits(row.original.salePrice))}
        </span>
      ),
    },
    {
      accessorKey: "costPrice",
      header: t("costPrice"),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatMoney(toMinorUnits(row.original.costPrice))}
        </span>
      ),
    },
    {
      accessorKey: "totalStock",
      header: t("stockOnHand"),
      cell: ({ row }) => {
        const p = row.original;
        if (!p.trackStock) {
          return <span className="text-xs text-muted-foreground">غير متتبع</span>;
        }

        return (
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold">
            <span
              className={
                p.isLowStock
                  ? "text-amber-600 dark:text-amber-400 font-bold"
                  : "text-foreground"
              }
            >
              {p.totalStock} {p.unit.symbol}
            </span>
            {p.isLowStock && (
              <Badge
                variant="outline"
                className="gap-1 border-amber-500/30 bg-amber-50 text-[10px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              >
                <AlertTriangle className="h-3 w-3" />
                {t("lowStock")}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: t("status"),
      cell: ({ row }) => {
        const isAct =
          optimisticStatus[row.original.id] !== undefined
            ? optimisticStatus[row.original.id]
            : row.original.isActive;
        return <StatusBadge status={isAct ? "ACTIVE" : "INACTIVE"} />;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const p = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground outline-none">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">{tCommon("actions")}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => router.push(`/inventory/products/${p.id}`)}
                className="cursor-pointer"
              >
                <Eye className="me-2 h-4 w-4 text-muted-foreground" />
                {t("details")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleEdit(p)}
                className="cursor-pointer"
              >
                <Edit className="me-2 h-4 w-4 text-muted-foreground" />
                {tCommon("edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const current =
                    optimisticStatus[p.id] !== undefined
                      ? optimisticStatus[p.id]
                      : p.isActive;
                  handleToggleStatus(p.id, current);
                }}
                className="cursor-pointer"
              >
                <Power className="me-2 h-4 w-4 text-muted-foreground" />
                {(optimisticStatus[p.id] !== undefined
                  ? optimisticStatus[p.id]
                  : p.isActive)
                  ? tCommon("inactive")
                  : tCommon("active")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteId(p.id)}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <Trash2 className="me-2 h-4 w-4" />
                {tCommon("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Prepare export data
  const exportData = data.map((p) => ({
    SKU: p.sku,
    Name: p.name,
    Barcode: p.barcode || "",
    Category: p.category?.name || "",
    Unit: p.unit.name,
    CostPrice: p.costPrice,
    SalePrice: p.salePrice,
    TaxRate: p.taxRate,
    ReorderLevel: p.reorderLevel,
    StockOnHand: p.totalStock,
    Active: p.isActive ? "Yes" : "No",
  }));

  const filterSlot = (
    <div className="flex flex-wrap items-center gap-2">
      {/* Category Filter */}
      <Select
        value={selectedCategory}
        onValueChange={(val) => updateFilters("category", val || "all")}
      >
        <SelectTrigger className="w-[160px] h-9 text-xs">
          <SelectValue placeholder={t("allCategories")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allCategories")}</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select
        value={selectedStatus}
        onValueChange={(val) => updateFilters("status", val || "all")}
      >
        <SelectTrigger className="w-[130px] h-9 text-xs">
          <SelectValue placeholder={t("allStatuses")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allStatuses")}</SelectItem>
          <SelectItem value="active">{tCommon("active")}</SelectItem>
          <SelectItem value="inactive">{tCommon("inactive")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Low Stock Toggle Button */}
      <Button
        variant={lowStockOnly ? "default" : "outline"}
        size="sm"
        className="h-9 text-xs gap-1.5"
        onClick={() => updateFilters("lowStock", lowStockOnly ? "false" : "true")}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        {t("lowStockOnly")}
      </Button>

      {/* CSV Import */}
      <Button
        variant="outline"
        size="sm"
        className="h-9 text-xs gap-1.5"
        onClick={() => setImportOpen(true)}
      >
        <Upload className="h-3.5 w-3.5" />
        {t("importCsv")}
      </Button>

      {/* New Product */}
      <Button
        size="sm"
        className="h-9 text-xs gap-1.5"
        data-hotkey-new="true"
        onClick={handleAddNew}
      >
        <Plus className="h-3.5 w-3.5" />
        {t("addProduct")}
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
        searchPlaceholder={tCommon("search")}
        exportFilename="masar_products"
        exportData={exportData}
        filterSlot={filterSlot}
      />

      {/* Product Form Dialog */}
      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
        categories={categories}
        units={units}
        onSuccess={() => router.refresh()}
      />

      {/* CSV Import Dialog */}
      <ProductCsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={() => router.refresh()}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={tCommon("confirm")}
        description={t("confirmDelete")}
        variant="destructive"
        confirmText={tCommon("delete")}
        cancelText={tCommon("cancel")}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
