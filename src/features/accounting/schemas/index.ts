import { z } from "zod";
import { AccountType, JournalStatus } from "@prisma/client";

export const accountSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "رمز الحساب مطلوب")
    .max(20, "رمز الحساب يجب ألا يتجاوز 20 حرفاً")
    .regex(/^[0-9A-Za-z.-]+$/, "رمز الحساب يجب أن يحتوي على أرقام وحروف ونقاط فقط"),
  name: z
    .string()
    .trim()
    .min(2, "اسم الحساب يجب أن يتكون من حرفين على الأقل")
    .max(150, "اسم الحساب طويل جداً"),
  type: z.nativeEnum(AccountType),
  parentId: z.string().nullable().optional(),
  isPostable: z.boolean(),
});

export type AccountFormValues = z.infer<typeof accountSchema>;

export const journalLineSchema = z.object({
  accountId: z.string().min(1, "يجب تحديد الحساب"),
  debit: z.number().min(0, "المبلغ المدين لا يمكن أن يكون سالباً"),
  credit: z.number().min(0, "المبلغ الدائن لا يمكن أن يكون سالباً"),
  description: z.string().trim().max(255).optional().nullable(),
});

export type JournalLineFormValues = z.infer<typeof journalLineSchema>;

export const journalEntrySchema = z
  .object({
    date: z.string().min(1, "تاريخ القيد مطلوب"),
    description: z.string().trim().min(3, "بيان القيد مطلوب (3 أحرف على الأقل)").max(500),
    status: z.nativeEnum(JournalStatus),
    lines: z
      .array(journalLineSchema)
      .min(2, "يجب إدخال طرفين على الأقل للقيد المحاسبي"),
  })
  .superRefine((data, ctx) => {
    let totalDebit = 0;
    let totalCredit = 0;

    data.lines.forEach((line, index) => {
      if (line.debit > 0 && line.credit > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "لا يمكن إدخال مدين ودائن معاً في نفس السطر",
          path: ["lines", index, "credit"],
        });
      }
      if (line.debit === 0 && line.credit === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "يجب تحديد مبلغ مدين أو دائن أكبر من صفر",
          path: ["lines", index, "debit"],
        });
      }
      totalDebit += Number(line.debit || 0);
      totalCredit += Number(line.credit || 0);
    });

    if (Math.abs(totalDebit - totalCredit) > 0.009) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `القيد غير متزن! إجمالي المدين (${totalDebit.toFixed(2)}) لا يساوي إجمالي الدائن (${totalCredit.toFixed(2)})`,
        path: ["lines"],
      });
    }

    if (totalDebit <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "يجب أن تكون قيمة القيد أكبر من صفر",
        path: ["lines"],
      });
    }
  });

export type JournalEntryFormValues = z.infer<typeof journalEntrySchema>;

export const fiscalPeriodSchema = z
  .object({
    name: z.string().trim().min(2, "اسم الفترة مطلوب (مثال: الربع الأول 2026)").max(100),
    startDate: z.string().min(1, "تاريخ بداية الفترة مطلوب"),
    endDate: z.string().min(1, "تاريخ نهاية الفترة مطلوب"),
  })
  .refine(
    (data) => new Date(data.startDate) <= new Date(data.endDate),
    {
      message: "تاريخ نهاية الفترة يجب أن يكون بعد أو يساوي تاريخ البداية",
      path: ["endDate"],
    }
  );

export type FiscalPeriodFormValues = z.infer<typeof fiscalPeriodSchema>;

export const expenseSchema = z.object({
  category: z.string().trim().min(2, "بند المصروف مطلوب").max(100),
  accountId: z.string().min(1, "حساب المصروف مطلوب"),
  paidFromAccountId: z.string().min(1, "حساب السداد (الخزينة/البنك) مطلوب"),
  amount: z.number().positive("قيمة المصروف يجب أن تكون أكبر من صفر"),
  date: z.string().min(1, "تاريخ المصروف مطلوب"),
  note: z.string().trim().max(500).optional().nullable(),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;

export const accountMappingSchema = z.object({
  arAccountId: z.string().nullable().optional(),
  apAccountId: z.string().nullable().optional(),
  salesAccountId: z.string().nullable().optional(),
  cogsAccountId: z.string().nullable().optional(),
  inventoryAccountId: z.string().nullable().optional(),
  taxAccountId: z.string().nullable().optional(),
  cashAccountId: z.string().nullable().optional(),
  bankAccountId: z.string().nullable().optional(),
});

export type AccountMappingFormValues = z.infer<typeof accountMappingSchema>;
