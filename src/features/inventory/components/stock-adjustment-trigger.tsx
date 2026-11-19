"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StockAdjustmentDialog } from "./stock-adjustment-dialog";

interface StockAdjustmentTriggerProps {
  warehouses: { id: string; name: string; code: string }[];
}

export function StockAdjustmentTrigger({ warehouses }: StockAdjustmentTriggerProps) {
  const t = useTranslations("inventory.adjustments");
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        {t("createAdjustment")}
      </Button>

      <StockAdjustmentDialog
        open={open}
        onOpenChange={setOpen}
        warehouses={warehouses}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
