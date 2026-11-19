"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface AuditDiffViewerProps {
  before: unknown;
  after: unknown;
  entity: string;
  action: string;
  entityId: string;
}

export function AuditDiffViewer({
  before,
  after,
  entity,
  action,
  entityId,
}: AuditDiffViewerProps) {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const beforeObj = (typeof before === "object" && before !== null && !Array.isArray(before))
    ? (before as Record<string, unknown>)
    : null;
  const afterObj = (typeof after === "object" && after !== null && !Array.isArray(after))
    ? (after as Record<string, unknown>)
    : null;

  // Compute all unique keys
  const allKeys = Array.from(
    new Set([
      ...(beforeObj ? Object.keys(beforeObj) : []),
      ...(afterObj ? Object.keys(afterObj) : []),
    ])
  );

  const copyJson = (data: unknown, label: string) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedKey(label);
    toast.success(
      isArabic ? `تم نسخ ${label} إلى الحافظة` : `${label} copied to clipboard`
    );
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const Arrow = isArabic ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/30 rounded-xl border">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs font-semibold">
            {entity}
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">
            #{entityId}
          </span>
        </div>
        <Badge
          className={
            action.includes("CREATE")
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
              : action.includes("DELETE") || action.includes("VOID")
              ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
              : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
          }
        >
          {action}
        </Badge>
      </div>

      <Tabs defaultValue="diff" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-9 bg-muted/60 p-1 rounded-lg">
          <TabsTrigger value="diff" className="text-xs">
            {isArabic ? "مقارنة التغييرات (Diff)" : "Visual Diff"}
          </TabsTrigger>
          <TabsTrigger value="before" className="text-xs">
            {isArabic ? "الحالة السابقة (Before)" : "Before JSON"}
          </TabsTrigger>
          <TabsTrigger value="after" className="text-xs">
            {isArabic ? "الحالة اللاحقة (After)" : "After JSON"}
          </TabsTrigger>
        </TabsList>

        {/* Visual Diff View */}
        <TabsContent value="diff" className="mt-3">
          {allKeys.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground border rounded-xl bg-muted/10">
              {isArabic
                ? "لا توجد حقول مسجلة للمقارنة في هذه العملية"
                : "No structured snapshot fields recorded for this action"}
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden divide-y divide-border text-xs">
              <div className="grid grid-cols-12 bg-muted/50 px-3 py-2 font-medium text-muted-foreground text-[11px]">
                <div className="col-span-4">{isArabic ? "الحقل" : "Field"}</div>
                <div className="col-span-4">{isArabic ? "القيمة السابقة" : "Before"}</div>
                <div className="col-span-4">{isArabic ? "القيمة الجديدة" : "After"}</div>
              </div>

              {allKeys.map((key) => {
                const valBefore = beforeObj ? beforeObj[key] : undefined;
                const valAfter = afterObj ? afterObj[key] : undefined;

                const isAdded = valBefore === undefined && valAfter !== undefined;
                const isRemoved = valBefore !== undefined && valAfter === undefined;
                const isModified =
                  !isAdded &&
                  !isRemoved &&
                  JSON.stringify(valBefore) !== JSON.stringify(valAfter);

                let rowBg = "hover:bg-muted/30";
                if (isAdded) rowBg = "bg-emerald-500/5 hover:bg-emerald-500/10";
                if (isRemoved) rowBg = "bg-rose-500/5 hover:bg-rose-500/10";
                if (isModified) rowBg = "bg-amber-500/5 hover:bg-amber-500/10";

                return (
                  <div
                    key={key}
                    className={`grid grid-cols-12 px-3 py-2.5 items-center transition-colors ${rowBg}`}
                  >
                    {/* Field Name */}
                    <div className="col-span-4 flex items-center gap-1.5 font-mono text-[11px] font-semibold text-foreground overflow-hidden text-ellipsis">
                      <span>{key}</span>
                      {isAdded && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                          {isArabic ? "جديد" : "Added"}
                        </span>
                      )}
                      {isRemoved && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300">
                          {isArabic ? "محذوف" : "Removed"}
                        </span>
                      )}
                      {isModified && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                          {isArabic ? "معدل" : "Modified"}
                        </span>
                      )}
                    </div>

                    {/* Value Before */}
                    <div className="col-span-4 font-mono text-[11px] text-muted-foreground break-all pe-2">
                      {valBefore === undefined ? (
                        <span className="text-muted-foreground/40 italic">
                          {isArabic ? "لا يوجد" : "None"}
                        </span>
                      ) : (
                        <span className={isModified || isRemoved ? "text-rose-600 dark:text-rose-400 line-through" : ""}>
                          {typeof valBefore === "object"
                            ? JSON.stringify(valBefore)
                            : String(valBefore)}
                        </span>
                      )}
                    </div>

                    {/* Value After */}
                    <div className="col-span-4 font-mono text-[11px] break-all ps-2 flex items-center gap-1">
                      {isModified && (
                        <Arrow className="size-3 text-amber-600 shrink-0" />
                      )}
                      {valAfter === undefined ? (
                        <span className="text-muted-foreground/40 italic">
                          {isArabic ? "تم الحذف" : "Removed"}
                        </span>
                      ) : (
                        <span className={isModified || isAdded ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-foreground"}>
                          {typeof valAfter === "object"
                            ? JSON.stringify(valAfter)
                            : String(valAfter)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Raw Before JSON */}
        <TabsContent value="before" className="mt-3 space-y-2">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              disabled={!before}
              onClick={() => copyJson(before, "Before JSON")}
            >
              {copiedKey === "Before JSON" ? (
                <>
                  <Check className="size-3 text-emerald-600" />
                  <span>{isArabic ? "تم النسخ" : "Copied"}</span>
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  <span>{isArabic ? "نسخ JSON" : "Copy JSON"}</span>
                </>
              )}
            </Button>
          </div>
          <pre className="p-3 bg-zinc-950 text-zinc-100 rounded-xl text-xs font-mono overflow-auto max-h-80 select-all">
            {before ? JSON.stringify(before, null, 2) : "null"}
          </pre>
        </TabsContent>

        {/* Raw After JSON */}
        <TabsContent value="after" className="mt-3 space-y-2">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              disabled={!after}
              onClick={() => copyJson(after, "After JSON")}
            >
              {copiedKey === "After JSON" ? (
                <>
                  <Check className="size-3 text-emerald-600" />
                  <span>{isArabic ? "تم النسخ" : "Copied"}</span>
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  <span>{isArabic ? "نسخ JSON" : "Copy JSON"}</span>
                </>
              )}
            </Button>
          </div>
          <pre className="p-3 bg-zinc-950 text-zinc-100 rounded-xl text-xs font-mono overflow-auto max-h-80 select-all">
            {after ? JSON.stringify(after, null, 2) : "null"}
          </pre>
        </TabsContent>
      </Tabs>
    </div>
  );
}
