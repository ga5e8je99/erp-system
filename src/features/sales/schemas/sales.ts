import { z } from "zod";
import { PaymentMethod } from "@prisma/client";

// ----------------------------------------------------
// CUSTOMER SCHEMAS
// ----------------------------------------------------

export const customerSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().optional(),
  name: z.string().min(2, "اسم العميل يجب ألا يقل عن حرفين / Name must be at least 2 characters"),
  phone: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .email("البريد الإلكتروني غير صالح / Invalid email")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().optional(),
  taxNumber: z.string().trim().optional(),
  creditLimit: z.number().min(0, "الحد الائتماني يجب ألا يكون سالباً / Credit limit must be >= 0"),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

export const createCustomerSchema = customerSchema.omit({ id: true });
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = customerSchema.extend({
  id: z.string().min(1, "معرف العميل مطلوب / Customer ID is required"),
});
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

// ----------------------------------------------------
// SHARED LINE ITEM SCHEMA
// ----------------------------------------------------

export const salesLineItemSchema = z.object({
  productId: z.string().min(1, "المنتج مطلوب / Product is required"),
  quantity: z.number().positive("الكمية يجب أن تكون أكبر من صفر / Quantity must be > 0"),
  unitPrice: z.number().min(0, "سعر الوحدة يجب ألا يكون سالباً / Unit price must be >= 0"),
  discount: z.number().min(0, "الخصم يجب ألا يكون سالباً / Discount must be >= 0"),
  taxRate: z.number().min(0).max(100, "نسبة الضريبة غير صالحة / Tax rate must be between 0 and 100"),
});

export type SalesLineItemInput = z.infer<typeof salesLineItemSchema>;

// ----------------------------------------------------
// QUOTATION SCHEMAS
// ----------------------------------------------------

export const salesQuotationSchema = z.object({
  id: z.string().optional(),
  customerId: z.string().min(1, "يرجى تحديد العميل / Customer is required"),
  issueDate: z.string().min(1, "تاريخ الإصدار مطلوب / Issue date is required"),
  expiryDate: z.string().optional(),
  notes: z.string().trim().optional(),
  items: z.array(salesLineItemSchema).min(1, "يجب إضافة بند واحد على الأقل / At least one line item required"),
});

export type SalesQuotationInput = z.infer<typeof salesQuotationSchema>;

// ----------------------------------------------------
// SALES ORDER SCHEMAS
// ----------------------------------------------------

export const salesOrderSchema = z.object({
  id: z.string().optional(),
  customerId: z.string().min(1, "يرجى تحديد العميل / Customer is required"),
  quotationId: z.string().optional(),
  issueDate: z.string().min(1, "تاريخ الأمر مطلوب / Order date is required"),
  notes: z.string().trim().optional(),
  items: z.array(salesLineItemSchema).min(1, "يجب إضافة بند واحد على الأقل / At least one line item required"),
});

export type SalesOrderInput = z.infer<typeof salesOrderSchema>;

// ----------------------------------------------------
// SALES INVOICE SCHEMAS
// ----------------------------------------------------

export const salesInvoiceSchema = z.object({
  id: z.string().optional(),
  customerId: z.string().min(1, "يرجى تحديد العميل / Customer is required"),
  orderId: z.string().optional(),
  warehouseId: z.string().min(1, "مستودع الصرف مطلوب / Dispatch warehouse is required"),
  issueDate: z.string().min(1, "تاريخ الفاتورة مطلوب / Invoice date is required"),
  dueDate: z.string().min(1, "تاريخ الاستحقاق مطلوب / Due date is required"),
  discount: z.number().min(0, "الخصم الإجمالي يجب ألا يكون سالباً / Overall discount must be >= 0"),
  notes: z.string().trim().optional(),
  items: z.array(salesLineItemSchema).min(1, "يجب إضافة بند واحد على الأقل / At least one line item required"),
});

export type SalesInvoiceInput = z.infer<typeof salesInvoiceSchema>;

// ----------------------------------------------------
// CUSTOMER PAYMENT SCHEMAS
// ----------------------------------------------------

export const customerPaymentSchema = z.object({
  customerId: z.string().min(1, "يرجى تحديد العميل / Customer is required"),
  invoiceId: z.string().optional(),
  amount: z.number().positive("المبلغ يجب أن تكون قيمته موجبة / Amount must be positive"),
  method: z.nativeEnum(PaymentMethod),
  date: z.string().min(1, "تاريخ السند مطلوب / Payment date is required"),
  reference: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type CustomerPaymentInput = z.infer<typeof customerPaymentSchema>;

// ----------------------------------------------------
// SALES RETURN SCHEMAS
// ----------------------------------------------------

export const salesReturnLineSchema = z.object({
  productId: z.string().min(1, "المنتج مطلوب / Product is required"),
  quantity: z.number().positive("الكمية يجب أن تكون أكبر من صفر / Quantity must be positive"),
  unitPrice: z.number().min(0, "السعر يجب ألا يكون سالباً / Price must be >= 0"),
  taxRate: z.number().min(0).max(100),
});

export const salesReturnSchema = z.object({
  customerId: z.string().min(1, "يرجى تحديد العميل / Customer is required"),
  invoiceId: z.string().optional(),
  warehouseId: z.string().min(1, "مستودع الاستلام مطلوب / Target warehouse is required"),
  notes: z.string().trim().optional(),
  items: z.array(salesReturnLineSchema).min(1, "يجب إضافة بند مرتجع واحد على الأقل / At least one return item required"),
});

export type SalesReturnInput = z.infer<typeof salesReturnSchema>;
