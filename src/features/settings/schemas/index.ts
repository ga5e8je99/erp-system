import { z } from "zod";

export const companyProfileSchema = z.object({
  name: z.string().min(2, "اسم الشركة مطلوب"),
  commercialRegister: z.string().optional().nullable(),
  taxNumber: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("البريد الإلكتروني غير صالح").optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  website: z.string().optional().nullable().or(z.literal("")),
  logoUrl: z.string().optional().nullable(),
});

export const currencyNumbersSchema = z.object({
  currency: z.string().min(1, "رمز العملة مطلوب"),
  currencySymbol: z.string().min(1, "رمز العملة المختصر مطلوب"),
  decimalPlaces: z.number().min(0).max(4),
  useArabicIndicDigits: z.boolean(),
});

export const taxRatesSchema = z.object({
  defaultTaxRate: z.number().min(0).max(100),
  taxNumber: z.string().optional().nullable(),
});

export const documentNumberingSchema = z.object({
  invoicePrefix: z.string().min(1),
  orderPrefix: z.string().min(1),
  quotationPrefix: z.string().min(1),
  poPrefix: z.string().min(1),
  receiptPrefix: z.string().min(1),
  returnPrefix: z.string().min(1),
  paymentPrefix: z.string().min(1),
  journalPrefix: z.string().min(1),
  expensePrefix: z.string().min(1),
  purchaseInvoicePrefix: z.string().min(1),
  purchaseReturnPrefix: z.string().min(1),
});

export const accountMappingSchema = z.object({
  arAccountId: z.string().optional().nullable(),
  apAccountId: z.string().optional().nullable(),
  salesAccountId: z.string().optional().nullable(),
  cogsAccountId: z.string().optional().nullable(),
  inventoryAccountId: z.string().optional().nullable(),
  taxAccountId: z.string().optional().nullable(),
  cashAccountId: z.string().optional().nullable(),
  bankAccountId: z.string().optional().nullable(),
  salaryExpenseAccountId: z.string().optional().nullable(),
  salaryPayableAccountId: z.string().optional().nullable(),
});

export const inventoryRulesSchema = z.object({
  allowNegativeStock: z.boolean(),
  costingMethod: z.enum(["WAC", "FIFO", "LIFO"]),
});

export const salesRulesSchema = z.object({
  blockOnCreditLimit: z.boolean(),
  creditLimitBehavior: z.enum(["STRICT_BLOCK", "WARN_ONLY", "IGNORE"]),
});

export const payrollRulesSchema = z.object({
  absenceDeductionRate: z.number().min(0).max(10),
  lateDeductionRate: z.number().min(0).max(10),
  overtimeMultiplier: z.number().min(1).max(5),
});

export const fullCompanySettingsSchema = companyProfileSchema
  .merge(currencyNumbersSchema)
  .merge(taxRatesSchema)
  .merge(documentNumberingSchema)
  .merge(accountMappingSchema)
  .merge(inventoryRulesSchema)
  .merge(salesRulesSchema)
  .merge(payrollRulesSchema);

export type FullCompanySettingsInput = z.infer<typeof fullCompanySettingsSchema>;
