import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type EntityStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "VOID"
  | "CANCELLED"
  | "ACTIVE"
  | "INACTIVE"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CONFIRMED"
  | "FULFILLED"
  | "SENT"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "POSTED"
  | "REVERSED"
  | string;

interface StatusBadgeProps {
  status: EntityStatus;
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({
  status,
  className,
  showDot = true,
}: StatusBadgeProps) {
  const t = useTranslations("statusBadge");

  // Determine semantic color style based on status
  let badgeClasses = "bg-muted text-muted-foreground border-border";
  let dotClasses = "bg-muted-foreground";

  switch (status) {
    case "PAID":
    case "APPROVED":
    case "ACTIVE":
    case "FULFILLED":
    case "RECEIVED":
    case "POSTED":
      // Success (Green / Emerald)
      badgeClasses =
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
      dotClasses = "bg-emerald-500";
      break;

    case "ISSUED":
    case "PARTIALLY_PAID":
    case "PENDING":
    case "PARTIALLY_RECEIVED":
    case "SENT":
      // Warning / Attention (Amber / Yellow)
      badgeClasses =
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
      dotClasses = "bg-amber-500";
      break;

    case "CONFIRMED":
      // Info (Sky / Blue)
      badgeClasses =
        "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800";
      dotClasses = "bg-sky-500";
      break;

    case "VOID":
    case "CANCELLED":
    case "REJECTED":
    case "INACTIVE":
      // Destructive / Danger (Rose / Red)
      badgeClasses =
        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
      dotClasses = "bg-rose-500";
      break;

    case "DRAFT":
    case "REVERSED":
    default:
      // Neutral (Slate / Muted)
      badgeClasses =
        "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
      dotClasses = "bg-slate-400";
      break;
  }

  const label = t.has(status) ? t(status) : status;

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border shadow-none",
        badgeClasses,
        className
      )}
    >
      {showDot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotClasses)}
        />
      )}
      <span className="truncate">{label}</span>
    </Badge>
  );
}
