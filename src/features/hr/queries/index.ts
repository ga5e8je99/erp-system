import { db } from "@/lib/db";
import { AccountType } from "@prisma/client";

export async function getPaymentAccounts() {
  return db.account.findMany({
    where: {
      type: AccountType.ASSET,
      isPostable: true,
      deletedAt: null,
      OR: [
        { code: { startsWith: "111" } }, // Cash / Treasury
        { code: { startsWith: "112" } }, // Bank
      ],
    },
    select: {
      id: true,
      code: true,
      name: true,
    },
    orderBy: { code: "asc" },
  });
}

export async function getCompanySettingsForPrint() {
  return db.companySettings.findFirst();
}
