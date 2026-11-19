import { z } from "zod";
import { PaymentMethod } from "@prisma/client";

export const supplierSchema = z.object({
  code: z.string().max(50).optional(),
  name: z.string().min(2, "اسم المورد مطلوب (حرفين على الأقل)").max(200),
  phone: z.string().max(50).optional().nullable(),
  email: z
    .string()
    .email("البريد الإلكتروني غير صحيح")
    .optional()
    .nullable()
    .or(z.literal("")),
  address: z.string().max(500).optional().nullable(),
  taxNumber: z.string().max(50).optional().nullable(),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;

export const purchasingLineItemSchema = z.object({
  productId: z.string().min(1, "يجب تحديد المنتج"),
  quantity: z.coerce.number().positive("الكمية يجب أن تكون أكبر من صفر"),
  unitPrice: z.coerce.number().min(0, "السعر لا يمكن أن يكون سالباً"),
  discount: z.coerce.number().min(0, "الخصم لا يمكن أن يكون سالباً").default(0),
  taxRate: z.coerce.number().min(0).max(100).default(14),
});

export type PurchasingLineItemFormValues = z.infer<
  typeof purchasingLineItemSchema
>;

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "يجب تحديد المورد"),
  expectedDate: z.string().optional().nullable(),
  discount: z.coerce.number().min(0).default(0),
  notes: z.string().max(1000).optional().nullable(),
  items: z
    .array(purchasingLineItemSchema)
    .min(1, "يجب إضافة بند واحد على الأقل في أمر الشراء"),
});

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;

export const goodsReceiptItemSchema = z.object({
  productId: z.string().min(1, "يجب تحديد المنتج"),
  quantity: z.coerce.number().positive("الكمية يجب أن تكون أكبر من صفر"),
  unitCost: z.coerce.number().min(0, "سعر التكلفة لا يمكن أن يكون سالباً"),
});

export const goodsReceiptSchema = z.object({
  poId: z.string().optional().nullable(),
  supplierId: z.string().min(1, "يجب تحديد المورد"),
  warehouseId: z.string().min(1, "يجب تحديد المستودع المستلم"),
  receiveDate: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  items: z
    .array(goodsReceiptItemSchema)
    .min(1, "يجب استلام صنف واحد على الأقل"),
});

export type GoodsReceiptFormValues = z.infer<typeof goodsReceiptSchema>;

export const purchaseInvoiceSchema = z.object({
  supplierId: z.string().min(1, "يجب تحديد المورد"),
  poId: z.string().optional().nullable(),
  receiptId: z.string().optional().nullable(),
  dueDate: z.string().min(1, "تاريخ الاستحقاق مطلوب"),
  discount: z.coerce.number().min(0).default(0),
  notes: z.string().max(1000).optional().nullable(),
  items: z
    .array(purchasingLineItemSchema)
    .min(1, "يجب إضافة بند واحد على الأقل في فاتورة المشتريات"),
});

export type PurchaseInvoiceFormValues = z.infer<typeof purchaseInvoiceSchema>;

export const supplierPaymentSchema = z.object({
  supplierId: z.string().min(1, "يجب تحديد المورد"),
  invoiceId: z.string().optional().nullable(),
  amount: z.coerce.number().positive("مبلغ السداد يجب أن يكون أكبر من صفر"),
  method: z.nativeEnum(PaymentMethod),
  date: z.string().optional().nullable(),
  reference: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export type SupplierPaymentFormValues = z.infer<typeof supplierPaymentSchema>;

export const purchaseReturnItemSchema = z.object({
  productId: z.string().min(1, "يجب تحديد المنتج"),
  quantity: z.coerce.number().positive("الكمية المرتجعة يجب أن تكون أكبر من صفر"),
  unitPrice: z.coerce.number().min(0, "سعر الوحدة غير صحيح"),
  taxAmount: z.coerce.number().min(0).default(0),
  total: z.coerce.number().min(0),
});

export const purchaseReturnSchema = z.object({
  supplierId: z.string().min(1, "يجب تحديد المورد"),
  invoiceId: z.string().optional().nullable(),
  warehouseId: z.string().min(1, "يجب تحديد المستودع الخارج منه البضاعة"),
  notes: z.string().max(1000).optional().nullable(),
  items: z
    .array(purchaseReturnItemSchema)
    .min(1, "يجب إضافة بند واحد على الأقل للمرتجع"),
});

export type PurchaseReturnFormValues = z.infer<typeof purchaseReturnSchema>;
