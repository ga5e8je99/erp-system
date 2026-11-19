"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Plus, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FiscalPeriodItem } from "../types";
import { FiscalPeriodFormDialog } from "./fiscal-period-form-dialog";
import { closeFiscalPeriodAction, reopenFiscalPeriodAction } from "../actions/period-actions";

interface FiscalPeriodsTableProps {
  periods: FiscalPeriodItem[];
}

export function FiscalPeriodsTable({ periods }: FiscalPeriodsTableProps) {
  const t = useTranslations("accounting.periods");
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = React.useState(false);

  // Close period confirmation
  const [closeTarget, setCloseTarget] = React.useState<FiscalPeriodItem | null>(null);
  const [isClosing, setIsClosing] = React.useState(false);

  // Reopen period confirmation
  const [reopenTarget, setReopenTarget] = React.useState<FiscalPeriodItem | null>(null);
  const [isReopening, setIsReopening] = React.useState(false);

  const handleCloseConfirm = async () => {
    if (!closeTarget) return;
    setIsClosing(true);
    try {
      const res = await closeFiscalPeriodAction(closeTarget.id);
      if (res.ok) {
        toast.success(t("closedSuccessfully"));
        setCloseTarget(null);
        router.refresh();
      } else {
        toast.error(res.error || t("failedToClose"));
      }
    } catch {
      toast.error(t("unexpectedError"));
    } finally {
      setIsClosing(false);
    }
  };

  const handleReopenConfirm = async () => {
    if (!reopenTarget) return;
    setIsReopening(true);
    try {
      const res = await reopenFiscalPeriodAction(reopenTarget.id);
      if (res.ok) {
        toast.success(t("reopenedSuccessfully"));
        setReopenTarget(null);
        router.refresh();
      } else {
        toast.error(res.error || t("failedToReopen"));
      }
    } catch {
      toast.error(t("unexpectedError"));
    } finally {
      setIsReopening(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("fiscalPeriodsTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("fiscalPeriodsDesc")}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 me-1.5" />
          {t("addNewPeriod")}
        </Button>
      </div>

      {/* Table Card */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-semibold">
                <tr>
                  <th className="py-3 px-4 text-start">{t("periodName")}</th>
                  <th className="py-3 px-4 text-start">{t("startDate")}</th>
                  <th className="py-3 px-4 text-start">{t("endDate")}</th>
                  <th className="py-3 px-4 text-start">{t("status")}</th>
                  <th className="py-3 px-4 text-center">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {periods.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      {t("noPeriodsFound")}
                    </td>
                  </tr>
                ) : (
                  periods.map((period) => (
                    <tr key={period.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">{period.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(period.startDate).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(period.endDate).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="py-3 px-4">
                        {period.isClosed ? (
                          <Badge
                            variant="outline"
                            className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                          >
                            <Lock className="h-3 w-3 me-1" />
                            {t("closed")}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                          >
                            <Unlock className="h-3 w-3 me-1" />
                            {t("open")}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {period.isClosed ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setReopenTarget(period)}
                          >
                            <Unlock className="h-3.5 w-3.5 me-1.5" />
                            {t("reopen")}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            onClick={() => setCloseTarget(period)}
                          >
                            <Lock className="h-3.5 w-3.5 me-1.5" />
                            {t("closePeriod")}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <FiscalPeriodFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => router.refresh()}
      />

      {/* Close Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(closeTarget)}
        onOpenChange={(open) => !open && setCloseTarget(null)}
        title={t("closeConfirmTitle")}
        description={t("closeConfirmDescription", { name: closeTarget?.name || "" })}
        confirmText={t("closePeriod")}
        cancelText={t("cancel")}
        variant="destructive"
        isLoading={isClosing}
        onConfirm={handleCloseConfirm}
      />

      {/* Reopen Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(reopenTarget)}
        onOpenChange={(open) => !open && setReopenTarget(null)}
        title={t("reopenConfirmTitle")}
        description={t("reopenConfirmDescription", { name: reopenTarget?.name || "" })}
        confirmText={t("reopen")}
        cancelText={t("cancel")}
        isLoading={isReopening}
        onConfirm={handleReopenConfirm}
      />
    </div>
  );
}
