import { Prisma } from "@prisma/client";

export function formatSalary(
  amount: number | Prisma.Decimal | string | null | undefined,
  currency = "EGP"
): string {
  if (amount === null || amount === undefined) {
    return `0.00 ${currency}`;
  }

  const num =
    typeof amount === "number"
      ? amount
      : typeof amount === "string"
      ? parseFloat(amount) || 0
      : Number(amount);

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

  return `${formatted} ${currency}`;
}

export function maskSalary(
  amount: number | Prisma.Decimal | string | null | undefined,
  canView: boolean,
  currency = "EGP"
): string {
  if (!canView) {
    return "••••••";
  }
  return formatSalary(amount, currency);
}
