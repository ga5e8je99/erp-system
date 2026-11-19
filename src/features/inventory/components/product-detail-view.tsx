"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  Package,
  Edit,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ProductFormDialog } from "./product-form-dialog";
import { formatMoney, toMinorUnits } from "@/lib/money";
import { StockMovementType } from "@prisma/client";

interface StockLevelItem {
  id: string;
  quantity: number;
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
}

interface ProductMovementItem {
  id: string;
  type: StockMovementType;
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  note: string | null;
  createdAt: Date;
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
}

export interface DetailedProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  unitId: string;
  unit: { id: string; name: string; symbol: string };
  costPrice: number;
  salePrice: number;
  taxRate: number;
  reorderLevel: number;
  isActive: boolean;
  trackStock: boolean;
  totalStock: number;
  isLowStock: boolean;
  stockLevels: StockLevelItem[];
  movements: ProductMovementItem[];
}

interface ProductDetailViewProps {
  product: DetailedProduct;
  categories: { id: string; name: string }[];
  units: { id: string; name: string; symbol: string }[];
  locale?: string;
}

export function ProductDetailView({
  product,
  categories,
  units,
  locale = "ar",
}: ProductDetailViewProps) {
  const t = useTranslations("inventory.products");
  const router = useRouter();

  const [editOpen, setEditOpen] = React.useState(false);
  const dateLocale = locale === "ar" ? ar : enUS;

  // Margin calculation
  const marginPercent =
    product.costPrice > 0
      ? Math.round(((product.salePrice - product.costPrice) / product.costPrice) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <Link href="/inventory/products">
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              <span>{t("title")}</span>
            </Link>
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {product.name}
              </h2>
              <StatusBadge status={product.isActive ? "ACTIVE" : "INACTIVE"} />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1 font-mono">
              <span>SKU: <strong className="text-foreground">{product.sku}</strong></span>
              {product.barcode && (
                <span>باركود: <strong className="text-foreground">{product.barcode}</strong></span>
              )}
              {product.category && (
                <span className="font-sans">تصنيف: <strong className="text-foreground">{product.category.name}</strong></span>
              )}
            </div>
          </div>
        </div>

        <Button onClick={() => setEditOpen(true)} size="sm" className="gap-1.5">
          <Edit className="h-4 w-4" />
          {t("editProduct")}
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("stockOnHand")}
          value={`${product.totalStock} ${product.unit.symbol}`}
          icon={Package}
          description={
            product.isLowStock
              ? `أقل من حد إعادة الطلب (${product.reorderLevel})`
              : `حد إعادة الطلب: ${product.reorderLevel} ${product.unit.symbol}`
          }
        />

        <StatCard
          title={t("salePrice")}
          value={formatMoney(toMinorUnits(product.salePrice))}
          description={`هامش الربح: ${marginPercent}%`}
        />

        <StatCard
          title={t("costPrice")}
          value={formatMoney(toMinorUnits(product.costPrice))}
          description="التكلفة القياسية للشراء"
        />

        <StatCard
          title={t("taxRate")}
          value={`${product.taxRate}%`}
          description="ضريبة القيمة المضافة المحتسبة"
        />
      </div>

      {/* Warehouse Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {t("stockByWarehouse")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {product.stockLevels.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noStockLevels")}</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>كود المستودع</TableHead>
                    <TableHead>اسم المستودع</TableHead>
                    <TableHead>الرصيد الفعلي</TableHead>
                    <TableHead>حالة التوفر</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.stockLevels.map((sl) => (
                    <TableRow key={sl.id}>
                      <TableCell className="font-mono text-xs font-bold text-primary">
                        {sl.warehouse.code}
                      </TableCell>
                      <TableCell className="font-semibold text-sm">
                        {sl.warehouse.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold">
                        {sl.quantity} {product.unit.symbol}
                      </TableCell>
                      <TableCell>
                        {sl.quantity > 0 ? (
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-50/50 gap-1 text-[11px]">
                            <CheckCircle2 className="h-3 w-3" />
                            متوفر
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-600 bg-amber-50/50 gap-1 text-[11px]">
                            <AlertTriangle className="h-3 w-3" />
                            نفد الرصيد
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Movements History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">
            {t("movementHistory")}
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-xs">
            <Link href={`/inventory/movements?productId=${product.id}`}>
              عرض السجل الكامل
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {product.movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noMovements")}</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>نوع الحركة</TableHead>
                    <TableHead>المستودع</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>المرجع</TableHead>
                    <TableHead>ملاحظات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.movements.map((m) => {
                    const isDecrease =
                      m.type === StockMovementType.OUT ||
                      m.referenceType === "TRANSFER_OUT" ||
                      m.referenceType === "ADJUSTMENT_DECREASE";

                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {format(new Date(m.createdAt), "yyyy-MM-dd HH:mm", { locale: dateLocale })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[11px]">
                            {m.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-xs">
                          {m.warehouse.name} ({m.warehouse.code})
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold">
                          <span
                            className={
                              isDecrease
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }
                          >
                            {isDecrease ? "-" : "+"}
                            {m.quantity} {product.unit.symbol}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {m.referenceId || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.note || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <ProductFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        product={product}
        categories={categories}
        units={units}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
