"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { usePathname, useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { clampPagination, ALLOWED_PAGE_SIZES } from "@/lib/pagination";

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageCount?: number;
  totalCount?: number;
  isLoading?: boolean;
  searchKey?: string;
  searchPlaceholder?: string;
  enableRowSelection?: boolean;
  enableColumnVisibility?: boolean;
  enableExport?: boolean;
  exportFilename?: string;
  exportData?: Record<string, unknown>[];
  bulkActions?: (selectedRows: TData[]) => React.ReactNode;
  filterSlot?: React.ReactNode;
  syncWithUrlParams?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount = 1,
  totalCount,
  isLoading = false,
  searchPlaceholder,
  enableRowSelection = true,
  enableColumnVisibility = true,
  enableExport = true,
  exportFilename = "masar-export",
  exportData,
  bulkActions,
  filterSlot,
  syncWithUrlParams = true,
}: DataTableProps<TData, TValue>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("table");

  // Read initial states from URL params if enabled (clamped to safe bounds)
  const { page: urlPage, pageSize: urlPageSize } = clampPagination(
    {
      page: searchParams.get("page"),
      pageSize: searchParams.get("pageSize"),
    },
    10
  );
  const urlSearch = searchParams.get("q") || "";
  const urlSort = searchParams.get("sort") || "";
  const urlOrder = searchParams.get("order") === "desc" ? "desc" : "asc";

  const [sorting, setSorting] = React.useState<SortingState>(
    urlSort ? [{ id: urlSort, desc: urlOrder === "desc" }] : []
  );
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [searchQuery, setSearchQuery] = React.useState(urlSearch);

  // Update URL search parameters
  const updateUrlParams = React.useCallback(
    (updates: Record<string, string | null>) => {
      if (!syncWithUrlParams) return;
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, val]) => {
        if (val === null || val === "" || val === undefined) {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      });

      router.replace(`${pathname}?${params.toString()}`);
    },
    [syncWithUrlParams, searchParams, router, pathname]
  );

  // Debounced search sync
  React.useEffect(() => {
    if (!syncWithUrlParams) return;
    const timer = setTimeout(() => {
      if (searchQuery !== urlSearch) {
        updateUrlParams({ q: searchQuery || null, page: "1" });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, urlSearch, syncWithUrlParams, updateUrlParams]);

  // Handle sorting change
  const handleSortingChange = (updater: React.SetStateAction<SortingState>) => {
    setSorting((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (syncWithUrlParams && next.length > 0) {
        updateUrlParams({
          sort: next[0].id,
          order: next[0].desc ? "desc" : "asc",
          page: "1",
        });
      } else if (syncWithUrlParams && next.length === 0) {
        updateUrlParams({ sort: null, order: null });
      }
      return next;
    });
  };

  const table = useReactTable({
    data,
    columns,
    pageCount: pageCount,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection: enableRowSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
  });

  const selectedRows = table
    .getSelectedRowModel()
    .rows.map((r) => r.original);

  // CSV Export with UTF-8 BOM for Arabic support
  const handleExportCsv = () => {
    const rawData =
      exportData ||
      (data as unknown as Record<string, unknown>[]).map((item) => {
        const row: Record<string, unknown> = {};
        Object.entries(item).forEach(([k, v]) => {
          if (typeof v !== "object" || v === null) {
            row[k] = v;
          }
        });
        return row;
      });

    if (rawData.length === 0) return;

    const headers = Object.keys(rawData[0]);
    const csvRows = [
      headers.join(","),
      ...rawData.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            const str = val === null || val === undefined ? "" : String(val);
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ];

    // UTF-8 BOM (\uFEFF) ensures Excel properly displays Arabic characters
    const csvContent = "\uFEFF" + csvRows.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${exportFilename}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const displayTotalCount = totalCount ?? data.length;

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input & Filters */}
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder || t("search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 ps-8 pe-8 text-xs sm:text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute end-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {filterSlot}
        </div>

        {/* Right Actions: Export & Columns */}
        <div className="flex items-center gap-2">
          {enableExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={isLoading || data.length === 0}
              className="h-9 text-xs"
            >
              <Download className="me-1.5 h-3.5 w-3.5" />
              <span>{t("exportCsv")}</span>
            </Button>
          )}

          {enableColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="h-9 text-xs">
                    <SlidersHorizontal className="me-1.5 h-3.5 w-3.5" />
                    <span>{t("columns")}</span>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-44">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="text-xs capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Bulk Actions Banner */}
      {selectedRows.length > 0 && bulkActions && (
        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-primary">
              {t("selectedRows", {
                count: selectedRows.length,
                total: displayTotalCount,
              })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.resetRowSelection()}
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
            >
              {t("clearSelection")}
            </Button>
          </div>
          <div>{bulkActions(selectedRows)}</div>
        </div>
      )}

      {/* Mobile Horizontal Scroll Affordance */}
      <div className="flex items-center justify-end px-1 sm:hidden">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
          <ArrowLeftRight className="h-3 w-3 text-primary animate-pulse" />
          <span>{t("scrollHint")}</span>
        </span>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-xs font-semibold text-foreground/80"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading Skeleton
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {columns.map((_, colIndex) => (
                    <TableCell key={`skeleton-col-${colIndex}`} className="py-3">
                      <Skeleton className="h-5 w-full max-w-32" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="transition-colors hover:bg-muted/40"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3 text-xs sm:text-sm">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-48 text-center"
                >
                  <EmptyState compact title={t("noData")} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
        <div>
          {totalCount !== undefined && (
            <span>
              {t("selectedRows", {
                count: selectedRows.length,
                total: totalCount,
              })}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {/* Page Size Selector */}
          <div className="flex items-center gap-2">
            <span>{t("perPage")}</span>
            <Select
              value={String(urlPageSize)}
              onValueChange={(val) => {
                if (syncWithUrlParams) {
                  updateUrlParams({ pageSize: val, page: "1" });
                }
              }}
            >
              <SelectTrigger className="h-8 w-16 text-xs" aria-label={t("perPage")}>
                <SelectValue placeholder={String(urlPageSize)} />
              </SelectTrigger>
              <SelectContent side="top">
                {ALLOWED_PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Current Page Indicator */}
          <div className="font-medium tabular-nums">
            {t("page")} {urlPage} {t("of")} {Math.max(1, pageCount)}
          </div>

          {/* Pagination Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => updateUrlParams({ page: "1" })}
              disabled={urlPage <= 1 || isLoading}
              aria-label="First page"
            >
              <ChevronsLeft className="h-4 w-4 rtl:rotate-180" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => updateUrlParams({ page: String(Math.max(1, urlPage - 1)) })}
              disabled={urlPage <= 1 || isLoading}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => updateUrlParams({ page: String(urlPage + 1) })}
              disabled={urlPage >= pageCount || isLoading}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => updateUrlParams({ page: String(Math.max(1, pageCount)) })}
              disabled={urlPage >= pageCount || isLoading}
              aria-label="Last page"
            >
              <ChevronsRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
