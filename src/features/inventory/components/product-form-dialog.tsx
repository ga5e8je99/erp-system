"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  productFormSchema,
  type ProductFormValues,
} from "../schemas/inventory";
import {
  createProductAction,
  updateProductAction,
} from "../actions/products";

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: {
    id: string;
    name: string;
    sku: string;
    barcode?: string | null;
    description?: string | null;
    categoryId?: string | null;
    unitId: string;
    costPrice: number;
    salePrice: number;
    taxRate: number;
    reorderLevel: number;
    isActive: boolean;
    trackStock: boolean;
  } | null;
  categories: { id: string; name: string }[];
  units: { id: string; name: string; symbol: string }[];
  onSuccess?: () => void;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
  units,
  onSuccess,
}: ProductFormDialogProps) {
  const t = useTranslations("inventory.products");
  const tCommon = useTranslations("common");
  const [activeTab, setActiveTab] = React.useState("general");
  const isEditing = Boolean(product?.id);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      barcode: "",
      description: "",
      categoryId: undefined,
      unitId: units[0]?.id || "",
      costPrice: 0,
      salePrice: 0,
      taxRate: 14,
      reorderLevel: 10,
      isActive: true,
      trackStock: true,
    },
  });

  React.useEffect(() => {
    if (open) {
      if (product) {
        form.reset({
          id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode || "",
          description: product.description || "",
          categoryId: product.categoryId || undefined,
          unitId: product.unitId,
          costPrice: product.costPrice,
          salePrice: product.salePrice,
          taxRate: product.taxRate,
          reorderLevel: product.reorderLevel,
          isActive: product.isActive,
          trackStock: product.trackStock,
        });
      } else {
        form.reset({
          name: "",
          sku: "",
          barcode: "",
          description: "",
          categoryId: undefined,
          unitId: units[0]?.id || "",
          costPrice: 0,
          salePrice: 0,
          taxRate: 14,
          reorderLevel: 10,
          isActive: true,
          trackStock: true,
        });
      }
      setActiveTab("general");
    }
  }, [open, product, units, form]);

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: ProductFormValues) => {
    try {
      if (isEditing && product?.id) {
        const res = await updateProductAction({
          ...values,
          id: product.id,
        });
        if (res.ok) {
          toast.success(t("updatedSuccess"));
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(res.error);
        }
      } else {
        const createData = { ...values };
        delete createData.id;
        const res = await createProductAction(createData);
        if (res.ok) {
          toast.success(t("createdSuccess"));
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(res.error);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon("error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("editProduct") : t("addProduct")}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `${product?.name} (${product?.sku})`
              : t("subtitle")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
              <TabsTrigger value="pricing">{t("tabs.pricing")}</TabsTrigger>
              <TabsTrigger value="stock">{t("tabs.stock")}</TabsTrigger>
            </TabsList>

            {/* TAB 1: GENERAL */}
            <TabsContent value="general" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name" className="text-start">
                    {t("name")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder={t("name")}
                    autoFocus
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku" className="text-start">
                    {t("sku")}
                  </Label>
                  <Input
                    id="sku"
                    {...form.register("sku")}
                    placeholder={t("skuAutoHint")}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {t("skuAutoHint")}
                  </p>
                  {form.formState.errors.sku && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.sku.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barcode" className="text-start">
                    {t("barcode")}
                  </Label>
                  <Input
                    id="barcode"
                    {...form.register("barcode")}
                    placeholder="EAN / UPC / Code128"
                  />
                  {form.formState.errors.barcode && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.barcode.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-start">{t("category")}</Label>
                  <Controller
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <Select
                        value={field.value || "none"}
                        onValueChange={(val) =>
                          field.onChange(val === "none" ? undefined : val)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("selectCategory")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            {t("allCategories")}
                          </SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-start">
                    {t("unit")} <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    control={form.control}
                    name="unitId"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("selectUnit")} />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name} ({u.symbol})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.unitId && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.unitId.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description" className="text-start">
                    {t("description")}
                  </Label>
                  <Textarea
                    id="description"
                    {...form.register("description")}
                    placeholder={t("description")}
                    rows={2}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3 md:col-span-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="isActive" className="text-sm font-medium">
                      {t("active")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {form.watch("isActive")
                        ? tCommon("active")
                        : tCommon("inactive")}
                    </p>
                  </div>
                  <Controller
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <Switch
                        id="isActive"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: PRICING & TAX */}
            <TabsContent value="pricing" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="costPrice" className="text-start">
                    {t("costPrice")}
                  </Label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    {...form.register("costPrice", { valueAsNumber: true })}
                  />
                  {form.formState.errors.costPrice && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.costPrice.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salePrice" className="text-start">
                    {t("salePrice")}
                  </Label>
                  <Input
                    id="salePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    {...form.register("salePrice", { valueAsNumber: true })}
                  />
                  {form.formState.errors.salePrice && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.salePrice.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxRate" className="text-start">
                    {t("taxRate")}
                  </Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    {...form.register("taxRate", { valueAsNumber: true })}
                  />
                  {form.formState.errors.taxRate && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.taxRate.message}
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: STOCK SETTINGS */}
            <TabsContent value="stock" className="space-y-4 pt-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5 pe-4">
                  <Label htmlFor="trackStock" className="text-sm font-medium">
                    {t("trackStock")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("trackStockHelp")}
                  </p>
                </div>
                <Controller
                  control={form.control}
                  name="trackStock"
                  render={({ field }) => (
                    <Switch
                      id="trackStock"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>

              {form.watch("trackStock") && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="reorderLevel" className="text-start">
                    {t("reorderLevel")}
                  </Label>
                  <Input
                    id="reorderLevel"
                    type="number"
                    min="0"
                    step="1"
                    {...form.register("reorderLevel", { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">
                    تنبيه عندما يقل إجمالي الرصيد عن هذا الحد
                  </p>
                  {form.formState.errors.reorderLevel && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.reorderLevel.message}
                    </p>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tCommon("loading") : tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
