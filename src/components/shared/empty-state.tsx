import * as React from "react";
import { FolderOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  const t = useTranslations("emptyState");

  const resolvedTitle = title || t("defaultTitle");
  const resolvedDescription = description || t("defaultDescription");

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 text-center animate-in fade-in-50",
        compact ? "p-6" : "p-10 md:p-14",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-3 text-base font-semibold text-foreground">
        {resolvedTitle}
      </h3>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        {resolvedDescription}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
