"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import {
  Search,
  RotateCcw,
  FileCode2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AuditDiffViewer } from "./audit-diff-viewer";
import { EmptyState } from "@/components/shared/empty-state";

export interface AuditLogItem {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string | Date;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

interface AuditLogTableProps {
  logs: AuditLogItem[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  filterOptions: {
    users: { id: string; name: string | null; email: string | null }[];
    entities: string[];
    actions: string[];
  };
}

export function AuditLogTable({
  logs,
  pagination,
  filterOptions,
}: AuditLogTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const isArabic = locale === "ar";

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Active modal state
  const [selectedLog, setSelectedLog] = React.useState<AuditLogItem | null>(null);

  // Current query params
  const currentSearch = searchParams.get("search") || "";
  const currentUserId = searchParams.get("userId") || "all";
  const currentEntity = searchParams.get("entity") || "all";
  const currentAction = searchParams.get("action") || "all";
  const currentDateFrom = searchParams.get("dateFrom") || "";
  const currentDateTo = searchParams.get("dateTo") || "";

  const [localSearch, setLocalSearch] = React.useState(currentSearch);

  // Keyboard shortcut: / focuses search input
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        !((document.activeElement as HTMLElement)?.isContentEditable)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (!val || val === "all") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    // Reset to page 1 on filter update
    if (!updates.page) {
      params.delete("page");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const resetAllFilters = () => {
    setLocalSearch("");
    router.push(pathname);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: localSearch.trim() || null });
  };

  const formatDate = (dateVal: string | Date) => {
    const d = new Date(dateVal);
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d);
  };

  return (
    <div className="space-y-4">
      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl border bg-card shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] max-w-md relative">
            <Search className="size-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder={
                isArabic
                  ? "بحث بالكيان، المعرف، الإجراء، أو المستخدم (اضغط / للتركيز)..."
                  : "Search entity, ID, action, or user (press / to focus)..."
              }
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="ps-9 h-9 text-xs"
            />
          </form>

          <div className="flex items-center gap-2">
            {(currentSearch ||
              currentUserId !== "all" ||
              currentEntity !== "all" ||
              currentAction !== "all" ||
              currentDateFrom ||
              currentDateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAllFilters}
                className="h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3.5" />
                <span>{isArabic ? "إعادة ضبط" : "Reset"}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5 pt-1">
          {/* User filter */}
          <Select
            value={currentUserId}
            onValueChange={(val) => updateFilters({ userId: val })}
          >
            <SelectTrigger className="h-8 text-xs bg-background">
              <SelectValue placeholder={isArabic ? "المستخدم" : "User"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                {isArabic ? "جميع المستخدمين" : "All Users"}
              </SelectItem>
              {filterOptions.users.map((u) => (
                <SelectItem key={u.id} value={u.id} className="text-xs">
                  {u.name || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Entity filter */}
          <Select
            value={currentEntity}
            onValueChange={(val) => updateFilters({ entity: val })}
          >
            <SelectTrigger className="h-8 text-xs bg-background">
              <SelectValue placeholder={isArabic ? "الكيان / الجدول" : "Entity"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                {isArabic ? "جميع الكيانات" : "All Entities"}
              </SelectItem>
              {filterOptions.entities.map((ent) => (
                <SelectItem key={ent} value={ent} className="text-xs font-mono">
                  {ent}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Action filter */}
          <Select
            value={currentAction}
            onValueChange={(val) => updateFilters({ action: val })}
          >
            <SelectTrigger className="h-8 text-xs bg-background">
              <SelectValue placeholder={isArabic ? "نوع العملية" : "Action"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                {isArabic ? "جميع العمليات" : "All Actions"}
              </SelectItem>
              {filterOptions.actions.map((act) => (
                <SelectItem key={act} value={act} className="text-xs font-mono">
                  {act}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date From */}
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              aria-label={isArabic ? "من تاريخ" : "Date From"}
              value={currentDateFrom}
              onChange={(e) => updateFilters({ dateFrom: e.target.value || null })}
              className="h-8 text-xs"
            />
          </div>

          {/* Date To */}
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              aria-label={isArabic ? "إلى تاريخ" : "Date To"}
              value={currentDateTo}
              onChange={(e) => updateFilters({ dateTo: e.target.value || null })}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      {logs.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={isArabic ? "لا توجد سجلات مطابقة" : "No audit entries found"}
          description={
            isArabic
              ? "لم يتم العثور على أي حركات تدقيق تطابق معايير التصفية الحالية."
              : "No audit trail records matched the active filter criteria."
          }
          action={
            (currentSearch || currentUserId !== "all" || currentEntity !== "all" || currentAction !== "all") && (
              <Button variant="outline" size="sm" onClick={resetAllFilters} className="text-xs">
                {isArabic ? "إزالة عوامل التصفية" : "Clear Filters"}
              </Button>
            )
          }
        />
      ) : (
        <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start border-collapse">
              <thead className="bg-muted/50 border-b text-[11px] font-medium text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 text-start sticky start-0 bg-muted/50 z-10">
                    {isArabic ? "الوقت والتاريخ" : "Timestamp"}
                  </th>
                  <th className="py-3 px-4 text-start">{isArabic ? "المستخدم" : "User"}</th>
                  <th className="py-3 px-4 text-start">{isArabic ? "نوع العملية" : "Action"}</th>
                  <th className="py-3 px-4 text-start">{isArabic ? "الكيان المتأثر" : "Entity"}</th>
                  <th className="py-3 px-4 text-start">{isArabic ? "معرف السجل" : "Entity ID"}</th>
                  <th className="py-3 px-4 text-start">{isArabic ? "عنوان IP" : "IP Address"}</th>
                  <th className="py-3 px-4 text-center">{isArabic ? "المقارنة" : "Diff"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => {
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Timestamp (sticky first column for mobile scroll) */}
                      <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap sticky start-0 bg-card group-hover:bg-muted/30 z-10 text-muted-foreground border-e border-transparent group-hover:border-border/40">
                        {formatDate(log.createdAt)}
                      </td>

                      {/* User */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.user ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">
                              {log.user.name || log.user.email}
                            </span>
                            {log.user.name && (
                              <span className="text-[10px] text-muted-foreground">
                                {log.user.email}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">
                            {isArabic ? "النظام الآلي" : "System / Guest"}
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge
                          variant="secondary"
                          className={
                            log.action.includes("CREATE")
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px]"
                              : log.action.includes("DELETE") || log.action.includes("VOID")
                              ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 text-[10px]"
                              : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 text-[10px]"
                          }
                        >
                          {log.action}
                        </Badge>
                      </td>

                      {/* Entity */}
                      <td className="py-3 px-4 font-mono font-medium text-foreground whitespace-nowrap">
                        {log.entity}
                      </td>

                      {/* Entity ID */}
                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap max-w-[140px] truncate">
                        {log.entityId}
                      </td>

                      {/* IP */}
                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {log.ip || "—"}
                      </td>

                      {/* Diff View Button */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5 px-2.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                        >
                          <FileCode2 className="size-3 text-muted-foreground" />
                          <span>{isArabic ? "الفروقات" : "View Diff"}</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="p-3 border-t bg-muted/20 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <div>
              {isArabic
                ? `عرض ${(pagination.page - 1) * pagination.pageSize + 1} إلى ${Math.min(
                    pagination.page * pagination.pageSize,
                    pagination.total
                  )} من إجمالي ${pagination.total} سجل`
                : `Showing ${(pagination.page - 1) * pagination.pageSize + 1} to ${Math.min(
                    pagination.page * pagination.pageSize,
                    pagination.total
                  )} of ${pagination.total} entries`}
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={pagination.page <= 1}
                onClick={() => updateFilters({ page: String(pagination.page - 1) })}
              >
                {isArabic ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
              </Button>

              <span className="px-2 text-xs font-medium font-mono text-foreground">
                {pagination.page} / {Math.max(1, pagination.totalPages)}
              </span>

              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => updateFilters({ page: String(pagination.page + 1) })}
              >
                {isArabic ? <ChevronLeft className="size-3.5" /> : <ChevronRight className="size-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Diff Viewer Modal */}
      {selectedLog && (
        <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <FileCode2 className="size-4 text-primary" />
                <span>
                  {isArabic
                    ? `تفاصيل ومقارنة التعديل: ${selectedLog.entity}`
                    : `Audit Diff Details: ${selectedLog.entity}`}
                </span>
              </DialogTitle>
            </DialogHeader>

            <AuditDiffViewer
              before={selectedLog.before}
              after={selectedLog.after}
              entity={selectedLog.entity}
              action={selectedLog.action}
              entityId={selectedLog.entityId}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
