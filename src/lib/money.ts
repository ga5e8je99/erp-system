export type CurrencyCode = "EGP" | "SAR" | "USD" | "EUR" | "AED";

export interface MoneyOptions {
  currency?: CurrencyCode | string;
  locale?: string;
  decimals?: number;
  useArabicIndicDigits?: boolean;
}

/**
 * Converts major currency units to minor units (e.g., 10.50 EGP -> 1050 piastres).
 * Avoids floating-point math issues using round.
 */
export function toMinorUnits(amount: number | string, decimals = 2): number {
  const numeric = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(numeric)) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  const factor = Math.pow(10, decimals);
  return Math.round(numeric * factor);
}

/**
 * Converts minor currency units back to major units (e.g., 1050 -> 10.50).
 */
export function fromMinorUnits(minorUnits: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return minorUnits / factor;
}

/**
 * Formats minor units into a localized currency string.
 * Uses Arabic-Indic digits only if useArabicIndicDigits is true.
 */
export function formatMoney(
  minorUnits: number,
  options: MoneyOptions = {}
): string {
  const {
    currency = "EGP",
    locale = "ar-EG",
    decimals = 2,
    useArabicIndicDigits = false,
  } = options;
  const majorUnits = fromMinorUnits(minorUnits, decimals);

  const numberingSystem = useArabicIndicDigits ? "arab" : "latn";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    numberingSystem,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(majorUnits);
}

/**
 * Formats a major currency amount (e.g., 10.50 EGP).
 * Uses Arabic-Indic digits only if useArabicIndicDigits is true.
 */
export function formatCurrency(
  amount: number,
  options: MoneyOptions = {}
): string {
  const {
    currency = "EGP",
    locale = "ar-EG",
    decimals = 2,
    useArabicIndicDigits = false,
  } = options;

  const numberingSystem = useArabicIndicDigits ? "arab" : "latn";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    numberingSystem,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Formats a generic numeric value according to locale and digit style.
 */
export function formatNumber(
  value: number,
  options: {
    locale?: string;
    decimals?: number;
    useArabicIndicDigits?: boolean;
  } = {}
): string {
  const {
    locale = "ar-EG",
    decimals = 2,
    useArabicIndicDigits = false,
  } = options;

  const numberingSystem = useArabicIndicDigits ? "arab" : "latn";

  return new Intl.NumberFormat(locale, {
    numberingSystem,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
