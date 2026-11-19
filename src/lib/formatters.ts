import { Decimal } from "@prisma/client/runtime/library";

export interface FormatOptions {
  currency?: string;
  currencySymbol?: string;
  locale?: string;
  decimals?: number;
  useArabicIndicDigits?: boolean;
}

export interface CompanySettingsFormatConfig {
  currency?: string;
  currencySymbol?: string;
  decimalPlaces?: number;
  useArabicIndicDigits?: boolean;
}

// Global active settings cache (fallback defaults)
let activeSettings: CompanySettingsFormatConfig = {
  currency: "EGP",
  currencySymbol: "ج.م",
  decimalPlaces: 2,
  useArabicIndicDigits: false,
};

export function setGlobalFormatSettings(settings: CompanySettingsFormatConfig) {
  activeSettings = { ...activeSettings, ...settings };
}

export function getGlobalFormatSettings(): CompanySettingsFormatConfig {
  return activeSettings;
}

function toNumeric(val: number | string | Decimal | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  if (typeof val === "string") {
    const parsed = parseFloat(val);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof val === "object" && "toNumber" in val && typeof val.toNumber === "function") {
    return val.toNumber();
  }
  return Number(val) || 0;
}

/**
 * Centralized currency formatter driven by company settings and locale.
 * Default digit style: Latin digits ('latn') for clean ERP alignment unless useArabicIndicDigits is true.
 */
export function formatCurrency(
  amount: number | string | Decimal | null | undefined,
  options: FormatOptions = {},
  settings?: CompanySettingsFormatConfig
): string {
  const mergedSettings = { ...activeSettings, ...settings };
  const numericAmount = toNumeric(amount);

  const decimals = options.decimals ?? mergedSettings.decimalPlaces ?? 2;
  const useArabicIndic = options.useArabicIndicDigits ?? mergedSettings.useArabicIndicDigits ?? false;
  const numberingSystem = useArabicIndic ? "arab" : "latn";
  const locale = options.locale || "ar-EG";
  const currency = options.currency || mergedSettings.currency || "EGP";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      numberingSystem,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numericAmount);
  } catch {
    // Fallback if currency code or locale is unsupported
    const formattedNum = new Intl.NumberFormat(locale, {
      numberingSystem,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numericAmount);
    const symbol = options.currencySymbol || mergedSettings.currencySymbol || currency;
    return `${formattedNum} ${symbol}`;
  }
}

/**
 * Centralized quantity formatter.
 */
export function formatQuantity(
  qty: number | string | Decimal | null | undefined,
  options: FormatOptions = {},
  settings?: CompanySettingsFormatConfig
): string {
  const mergedSettings = { ...activeSettings, ...settings };
  const numericQty = toNumeric(qty);

  const decimals = options.decimals !== undefined ? options.decimals : (numericQty % 1 === 0 ? 0 : 2);
  const useArabicIndic = options.useArabicIndicDigits ?? mergedSettings.useArabicIndicDigits ?? false;
  const numberingSystem = useArabicIndic ? "arab" : "latn";
  const locale = options.locale || "ar-EG";

  return new Intl.NumberFormat(locale, {
    numberingSystem,
    minimumFractionDigits: decimals,
    maximumFractionDigits: Math.max(decimals, 2),
  }).format(numericQty);
}

/**
 * Centralized percentage formatter (e.g. 14 -> 14% or 0.14 -> 14%).
 */
export function formatPercent(
  rate: number | string | Decimal | null | undefined,
  options: FormatOptions = {},
  settings?: CompanySettingsFormatConfig
): string {
  const mergedSettings = { ...activeSettings, ...settings };
  const numericRate = toNumeric(rate);

  const decimals = options.decimals ?? 0;
  const useArabicIndic = options.useArabicIndicDigits ?? mergedSettings.useArabicIndicDigits ?? false;
  const numberingSystem = useArabicIndic ? "arab" : "latn";
  const locale = options.locale || "ar-EG";

  const formattedNum = new Intl.NumberFormat(locale, {
    numberingSystem,
    minimumFractionDigits: decimals,
    maximumFractionDigits: 2,
  }).format(numericRate);

  return `${formattedNum}%`;
}

/**
 * Centralized date formatter with locale support.
 */
export function formatDate(
  date: Date | string | number | null | undefined,
  locale = "ar-EG",
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }
): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat(locale, options).format(d);
}

/**
 * Generic number formatter following company numbering conventions.
 */
export function formatNumber(
  value: number | string | Decimal | null | undefined,
  options: FormatOptions = {},
  settings?: CompanySettingsFormatConfig
): string {
  const mergedSettings = { ...activeSettings, ...settings };
  const numericVal = toNumeric(value);

  const decimals = options.decimals ?? 2;
  const useArabicIndic = options.useArabicIndicDigits ?? mergedSettings.useArabicIndicDigits ?? false;
  const numberingSystem = useArabicIndic ? "arab" : "latn";
  const locale = options.locale || "ar-EG";

  return new Intl.NumberFormat(locale, {
    numberingSystem,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numericVal);
}
