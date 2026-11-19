import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function RouteLoadingSkeleton({
  type = "table",
  cardCount = 4,
  rowCount = 6,
}: {
  type?: "table" | "cards" | "dashboard" | "form";
  cardCount?: number;
  rowCount?: number;
}) {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Page Header Skeleton */}
      <div className="border-b pb-4 space-y-2">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-4 w-72 rounded-md" />
      </div>

      {type === "dashboard" && (
        <div className="space-y-6">
          {/* KPI grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="size-8 rounded-lg" />
                </div>
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-3 w-20" />
              </Card>
            ))}
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-5 space-y-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </Card>
            <Card className="p-5 space-y-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-64 w-full rounded-full mx-auto max-w-[200px]" />
            </Card>
          </div>
        </div>
      )}

      {type === "cards" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: cardCount }).map((_, i) => (
            <Card key={i} className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-xl" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-12 w-full rounded-lg" />
            </Card>
          ))}
        </div>
      )}

      {type === "form" && (
        <Card className="p-6 space-y-6 max-w-3xl">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </Card>
      )}

      {type === "table" && (
        <div className="space-y-4">
          {/* Filter Bar Skeleton */}
          <div className="p-4 rounded-xl border bg-card shadow-xs flex flex-wrap gap-3 items-center justify-between">
            <Skeleton className="h-9 w-64 rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28 rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>

          {/* Table Skeleton */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="border-b p-3 bg-muted/40 flex justify-between gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="divide-y divide-border">
                {Array.from({ length: rowCount }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center justify-between gap-4">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-7 w-14 rounded-md" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
