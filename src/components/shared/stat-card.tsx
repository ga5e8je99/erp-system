import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number; // e.g. 12.5 for +12.5%, -4.2 for -4.2%
  changePeriod?: string;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
  loading?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  changePeriod,
  icon: Icon,
  description,
  loading = false,
  className,
}: StatCardProps) {
  if (loading) {
    return (
      <Card className={cn("overflow-hidden border-border/80 shadow-xs", className)}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPositive = typeof change === "number" && change > 0;
  const isNegative = typeof change === "number" && change < 0;
  const isNeutral = typeof change === "number" && change === 0;

  return (
    <Card
      className={cn(
        "overflow-hidden border-border/80 bg-card shadow-xs transition-all hover:border-border hover:shadow-sm",
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </span>
          {Icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="mt-2">
          <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {value}
          </div>

          {(typeof change === "number" || description) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {typeof change === "number" && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium tabular-nums",
                    isPositive &&
                      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
                    isNegative &&
                      "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
                    isNeutral && "bg-muted text-muted-foreground"
                  )}
                >
                  {isPositive && <ArrowUpRight className="h-3 w-3" />}
                  {isNegative && <ArrowDownRight className="h-3 w-3" />}
                  {isNeutral && <Minus className="h-3 w-3" />}
                  <span>
                    {isPositive ? `+${change}%` : `${change}%`}
                  </span>
                </span>
              )}

              {(changePeriod || description) && (
                <span className="text-muted-foreground">
                  {changePeriod || description}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
