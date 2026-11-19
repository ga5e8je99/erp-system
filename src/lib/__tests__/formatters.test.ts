import { describe, it, expect, beforeEach } from "vitest";
import {
  formatCurrency,
  formatQuantity,
  formatPercent,
  formatDate,
  formatNumber,
  setGlobalFormatSettings,
} from "../formatters";

describe("Centralized Formatters", () => {
  beforeEach(() => {
    setGlobalFormatSettings({
      currency: "EGP",
      currencySymbol: "ج.م",
      decimalPlaces: 2,
      useArabicIndicDigits: false,
    });
  });

  it("formats currency using company settings with Latin digits by default", () => {
    const formatted = formatCurrency(1250.5);
    expect(formatted).toContain("1,250.50");
    // Should NOT contain Arabic-Indic digits by default
    expect(formatted).not.toContain("١");
  });

  it("formats currency with Arabic-Indic digits when configured", () => {
    const formatted = formatCurrency(1250.5, { useArabicIndicDigits: true });
    expect(formatted).toContain("١");
  });

  it("formats quantities cleanly without unnecessary decimals for integers", () => {
    expect(formatQuantity(10)).toBe("10");
    expect(formatQuantity(10.75)).toBe("10.75");
  });

  it("formats percentages accurately", () => {
    expect(formatPercent(14)).toBe("14%");
    expect(formatPercent(14.5, { decimals: 1 })).toBe("14.5%");
  });

  it("formats dates gracefully", () => {
    const date = new Date("2026-05-15T00:00:00Z");
    const formattedEn = formatDate(date, "en-US");
    expect(formattedEn).toContain("2026");
    expect(formatDate(null)).toBe("—");
  });

  it("formats generic numbers", () => {
    expect(formatNumber(12345.678, { decimals: 2 })).toBe("12,345.68");
  });
});
