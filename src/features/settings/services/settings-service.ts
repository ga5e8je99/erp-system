import { db } from "@/lib/db";
import { FullCompanySettingsInput } from "../schemas";

export async function getCompanySettings() {
  let settings = await db.companySettings.findFirst({
    include: {
      arAccount: { select: { id: true, code: true, name: true } },
      apAccount: { select: { id: true, code: true, name: true } },
      salesAccount: { select: { id: true, code: true, name: true } },
      cogsAccount: { select: { id: true, code: true, name: true } },
      inventoryAccount: { select: { id: true, code: true, name: true } },
      taxAccount: { select: { id: true, code: true, name: true } },
      cashAccount: { select: { id: true, code: true, name: true } },
      bankAccount: { select: { id: true, code: true, name: true } },
      salaryExpenseAccount: { select: { id: true, code: true, name: true } },
      salaryPayableAccount: { select: { id: true, code: true, name: true } },
    },
  });

  if (!settings) {
    settings = await db.companySettings.create({
      data: {
        name: "شركة مسار للتجارة والتوزيع",
        currency: "EGP",
        currencySymbol: "ج.م",
        decimalPlaces: 2,
        defaultTaxRate: 14.0,
      },
      include: {
        arAccount: { select: { id: true, code: true, name: true } },
        apAccount: { select: { id: true, code: true, name: true } },
        salesAccount: { select: { id: true, code: true, name: true } },
        cogsAccount: { select: { id: true, code: true, name: true } },
        inventoryAccount: { select: { id: true, code: true, name: true } },
        taxAccount: { select: { id: true, code: true, name: true } },
        cashAccount: { select: { id: true, code: true, name: true } },
        bankAccount: { select: { id: true, code: true, name: true } },
        salaryExpenseAccount: { select: { id: true, code: true, name: true } },
        salaryPayableAccount: { select: { id: true, code: true, name: true } },
      },
    });
  }

  return settings;
}

export async function updateCompanySettings(data: FullCompanySettingsInput) {
  const current = await getCompanySettings();

  const updated = await db.companySettings.update({
    where: { id: current.id },
    data: {
      name: data.name,
      commercialRegister: data.commercialRegister || null,
      taxNumber: data.taxNumber || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      website: data.website || null,
      logoUrl: data.logoUrl || null,
      currency: data.currency,
      currencySymbol: data.currencySymbol,
      decimalPlaces: data.decimalPlaces,
      useArabicIndicDigits: data.useArabicIndicDigits,
      defaultTaxRate: data.defaultTaxRate,
      invoicePrefix: data.invoicePrefix,
      orderPrefix: data.orderPrefix,
      quotationPrefix: data.quotationPrefix,
      poPrefix: data.poPrefix,
      receiptPrefix: data.receiptPrefix,
      returnPrefix: data.returnPrefix,
      paymentPrefix: data.paymentPrefix,
      journalPrefix: data.journalPrefix,
      expensePrefix: data.expensePrefix,
      purchaseInvoicePrefix: data.purchaseInvoicePrefix,
      purchaseReturnPrefix: data.purchaseReturnPrefix,
      allowNegativeStock: data.allowNegativeStock,
      costingMethod: data.costingMethod,
      blockOnCreditLimit: data.blockOnCreditLimit,
      creditLimitBehavior: data.creditLimitBehavior,
      arAccountId: data.arAccountId || null,
      apAccountId: data.apAccountId || null,
      salesAccountId: data.salesAccountId || null,
      cogsAccountId: data.cogsAccountId || null,
      inventoryAccountId: data.inventoryAccountId || null,
      taxAccountId: data.taxAccountId || null,
      cashAccountId: data.cashAccountId || null,
      bankAccountId: data.bankAccountId || null,
      salaryExpenseAccountId: data.salaryExpenseAccountId || null,
      salaryPayableAccountId: data.salaryPayableAccountId || null,
      absenceDeductionRate: data.absenceDeductionRate,
      lateDeductionRate: data.lateDeductionRate,
      overtimeMultiplier: data.overtimeMultiplier,
    },
  });

  return updated;
}

export async function getPostableAccounts(limit = 200) {
  return db.account.findMany({
    where: { isPostable: true, deletedAt: null },
    take: limit,
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, type: true },
  });
}
