import { describe, it, expect } from "vitest";
import { toMinorUnits, fromMinorUnits, formatMoney, formatCurrency, formatNumber } from "../money";

describe("Money utility", () => {
  it("converts major units to minor units without floating point inaccuracy", () => {
    expect(toMinorUnits(10.5)).toBe(1050);
    expect(toMinorUnits("19.99")).toBe(1999);
    expect(toMinorUnits(0.01)).toBe(1);
    expect(toMinorUnits(0)).toBe(0);
  });

  it("converts minor units back to major units", () => {
    expect(fromMinorUnits(1050)).toBe(10.5);
    expect(fromMinorUnits(1999)).toBe(19.99);
    expect(fromMinorUnits(1)).toBe(0.01);
  });

  it("formats minor units into currency string", () => {
    const formatted = formatMoney(1050, { currency: "EGP", locale: "en-US" });
    expect(formatted).toContain("10.50");
  });

  it("supports Western digits by default in Arabic locale", () => {
    const formatted = formatCurrency(1250.5, { currency: "EGP", locale: "ar-EG", useArabicIndicDigits: false });
    expect(formatted).toContain("1,250.50");
  });

  it("supports Arabic-Indic digits when useArabicIndicDigits is true", () => {
    const formatted = formatNumber(1250, { locale: "ar-EG", useArabicIndicDigits: true, decimals: 0 });
    // In Arabic-Indic digits, 1250 is ١٬٢٥٠
    expect(formatted).toContain("١");
    expect(formatted).toContain("٢");
    expect(formatted).toContain("٥");
    expect(formatted).toContain("٠");
  });
});
