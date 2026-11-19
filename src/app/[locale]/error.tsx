"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { AlertTriangle, RotateCcw, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  const locale = useLocale();
  const isArabic = locale === "ar";

  React.useEffect(() => {
    // Log client error telemetry
    console.error("[MASAR_ERP_GLOBAL_ERROR]", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl border bg-card shadow-sm animate-in fade-in-50 duration-200">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-8 ring-rose-500/5">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {isArabic ? "حدث خطأ غير متوقع" : "Something went wrong"}
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isArabic
              ? "تعذر إكمال العملية المطلوبة بسبب خطأ برمجيات غير متوقع. تم تسجيل هذا الخطأ لأغراض المتابعة."
              : "An unexpected runtime error occurred while processing your request. This incident has been logged."}
          </p>
          {error.digest && (
            <div className="pt-2">
              <span className="inline-block px-2.5 py-1 rounded bg-muted font-mono text-[11px] text-muted-foreground">
                Digest: {error.digest}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto text-xs gap-1.5"
            size="sm"
          >
            <RotateCcw className="size-3.5" />
            <span>{isArabic ? "إعادة المحاولة" : "Try Again"}</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto text-xs gap-1.5"
            size="sm"
          >
            <RefreshCw className="size-3.5" />
            <span>{isArabic ? "تحديث الصفحة" : "Reload"}</span>
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              window.location.href = `/${locale}/dashboard`;
            }}
            className="w-full sm:w-auto text-xs gap-1.5"
            size="sm"
          >
            <Home className="size-3.5" />
            <span>{isArabic ? "لوحة التحكم" : "Dashboard"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
