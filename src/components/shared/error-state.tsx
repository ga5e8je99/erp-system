import * as React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

export function ErrorState({
  title,
  description,
  onRetry,
  className,
  compact = false,
}: ErrorStateProps) {
  const t = useTranslations("errorState");

  const resolvedTitle = title || t("defaultTitle");
  const resolvedDescription = description || t("defaultDescription");

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 text-center animate-in fade-in-50",
        compact ? "p-6" : "p-10 md:p-14",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="mt-3 text-base font-semibold text-foreground">
        {resolvedTitle}
      </h3>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        {resolvedDescription}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-5 border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          <RotateCcw className="me-2 h-3.5 w-3.5" />
          {t("retry")}
        </Button>
      )}
    </div>
  );
}
