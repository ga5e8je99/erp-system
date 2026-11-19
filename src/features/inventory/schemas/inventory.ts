import { z } from "zod";

// ----------------------------------------------------
// PRODUCT SCHEMAS
// ----------------------------------------------------

export const productFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "اسم المنتج يجب أن يكون حرفين على الأقل / Name must be at least 2 characters"),
  sku: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
  description: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  unitId: z.string().min(1, "يرجى تحديد وحدة القياس / Unit is required"),
  costPrice: z.number().min(0, "سعر التكلفة لا يمكن أن يكون سالباً / Cost price must be >= 0"),
  salePrice: z.number().min(0, "سعر البيع لا يمكن أن يكون سالباً / Sale price must be >= 0"),
  taxRate: z.number().min(0).max(100),
  reorderLevel: z.number().int().min(0),
  isActive: z.boolean(),
  trackStock: z.boolean(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const createProductSchema = productFormSchema.omit({ id: true });
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = productFormSchema.extend({
  id: z.string().min(1, "معرف المنتج مطلوب / Product ID is required"),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ----------------------------------------------------
// CATEGORY SCHEMAS
// ----------------------------------------------------

export const categorySchema = z.object({
  name: z.string().min(2, "اسم التصنيف يجب أن يكون حرفين على الأقل / Category name is required"),
  description: z.string().trim().optional(),
  parentId: z
    .string()
    .trim()
    .transform((val) => (val === "" ? undefined : val))
    .optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const updateCategorySchema = categorySchema.extend({
  id: z.string().min(1, "معرف التصنيف مطلوب / Category ID is required"),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// ----------------------------------------------------
// UNIT SCHEMAS
// ----------------------------------------------------

export const unitSchema = z.object({
  name: z.string().min(1, "اسم الوحدة مطلوب / Unit name is required"),
  symbol: z.string().min(1, "رمز الوحدة مطلوب / Unit symbol is required"),
});

export type UnitInput = z.infer<typeof unitSchema>;

export const updateUnitSchema = unitSchema.extend({
  id: z.string().min(1, "معرف الوحدة مطلوب / Unit ID is required"),
});

export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;

// ----------------------------------------------------
// WAREHOUSE SCHEMAS
// ----------------------------------------------------

export const warehouseSchema = z.object({
  name: z.string().min(2, "اسم المستودع مطلوب / Warehouse name is required"),
  code: z
    .string()
    .min(2, "رمز المستودع مطلوب / Code is required")
    .regex(/^[A-Z0-9_-]+$/i, "رمز المستودع يقبل فقط أحرف وأرقام وشرطات / Code contains invalid characters")
    .transform((v) => v.toUpperCase().trim()),
  address: z.string().trim().optional(),
  isDefault: z.boolean().default(false),
});

export type WarehouseInput = z.infer<typeof warehouseSchema>;

export const updateWarehouseSchema = warehouseSchema.extend({
  id: z.string().min(1, "معرف المستودع مطلوب / Warehouse ID is required"),
});

export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;

// ----------------------------------------------------
// STOCK ADJUSTMENT SCHEMAS
// ----------------------------------------------------

export const stockAdjustmentLineSchema = z.object({
  productId: z.string().min(1, "المنتج مطلوب / Product is required"),
  type: z.enum(["INCREASE", "DECREASE"]),
  quantity: z.coerce.number().positive("الكمية يجب أن تكون أكبر من صفر / Quantity must be positive"),
  note: z.string().trim().optional(),
});

export const stockAdjustmentSchema = z.object({
  warehouseId: z.string().min(1, "المستودع مطلوب / Warehouse is required"),
  reason: z.string().min(2, "سبب التسوية مطلوب / Reason is required"),
  lines: z
    .array(stockAdjustmentLineSchema)
    .min(1, "يجب إضافة بند واحد على الأقل للتسوية / At least one line is required"),
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
export type StockAdjustmentLineInput = z.infer<typeof stockAdjustmentLineSchema>;

// ----------------------------------------------------
// STOCK TRANSFER SCHEMAS
// ----------------------------------------------------

export const stockTransferLineSchema = z.object({
  productId: z.string().min(1, "المنتج مطلوب / Product is required"),
  quantity: z.coerce.number().positive("الكمية يجب أن تكون أكبر من صفر / Quantity must be positive"),
  note: z.string().trim().optional(),
});

export const stockTransferSchema = z
  .object({
    fromWarehouseId: z.string().min(1, "مستودع المصدر مطلوب / Source warehouse is required"),
    toWarehouseId: z.string().min(1, "مستودع الوجهة مطلوب / Destination warehouse is required"),
    note: z.string().trim().optional(),
    lines: z
      .array(stockTransferLineSchema)
      .min(1, "يجب إضافة بند واحد على الأقل للتحويل / At least one item is required"),
  })
  .refine((data) => data.fromWarehouseId !== data.toWarehouseId, {
    message: "لا يمكن التحويل لنفس المستودع / Source and destination warehouse cannot be the same",
    path: ["toWarehouseId"],
  });

export type StockTransferInput = z.infer<typeof stockTransferSchema>;
export type StockTransferLineInput = z.infer<typeof stockTransferLineSchema>;

// ----------------------------------------------------
// CSV IMPORT SCHEMAS
// ----------------------------------------------------

export const productCsvRowSchema = z.object({
  name: z.string().min(1, "اسم المنتج مطلوب"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryName: z.string().optional(),
  unitName: z.string().min(1, "وحدة القياس مطلوبة"),
  costPrice: z.coerce.number().min(0, "سعر التكلفة يجب ألا يكون سالباً").default(0),
  salePrice: z.coerce.number().min(0, "سعر البيع يجب ألا يكون سالباً").default(0),
  taxRate: z.coerce.number().min(0).max(100).default(14),
  reorderLevel: z.coerce.number().int().min(0).default(10),
  initialStock: z.coerce.number().min(0).optional(),
  warehouseCode: z.string().optional(),
});

export type ProductCsvRow = z.infer<typeof productCsvRowSchema>;
