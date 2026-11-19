import { describe, it, expect } from "vitest";
import { calculateEmployeePayroll } from "../payroll-service";
import { calculateLeaveDays } from "../leave-service";
import { maskSalary, formatSalary } from "../../utils/mask-salary";

describe("HR Module - Payroll Calculation", () => {
  it("calculates correct net salary when there are no absences or lates", () => {
    const res = calculateEmployeePayroll({
      baseSalary: 15000,
      allowances: 2500,
      absenceDays: 0,
      lateDays: 0,
    });

    expect(res.dailyRate).toBe(500);
    expect(res.absenceDeduction).toBe(0);
    expect(res.lateDeduction).toBe(0);
    expect(res.totalDeductions).toBe(0);
    expect(res.netSalary).toBe(17500);
  });

  it("calculates absence deductions using daily rate and absence deduction multiplier", () => {
    // 30,000 / 30 = 1,000 daily rate
    // 3 absence days * 1000 * 1.0 = 3000 deduction
    const res = calculateEmployeePayroll({
      baseSalary: 30000,
      allowances: 0,
      absenceDays: 3,
      lateDays: 0,
      absenceRate: 1.0,
    });

    expect(res.dailyRate).toBe(1000);
    expect(res.absenceDeduction).toBe(3000);
    expect(res.totalDeductions).toBe(3000);
    expect(res.netSalary).toBe(27000);
  });

  it("calculates late arrival deductions using late rate multiplier", () => {
    // 12,000 / 30 = 400 daily rate
    // 4 late days * 400 * 0.25 (quarter day) = 400 deduction
    const res = calculateEmployeePayroll({
      baseSalary: 12000,
      allowances: 1000,
      absenceDays: 0,
      lateDays: 4,
      lateRate: 0.25,
    });

    expect(res.dailyRate).toBe(400);
    expect(res.lateDeduction).toBe(400);
    expect(res.totalDeductions).toBe(400);
    expect(res.netSalary).toBe(12600); // 12000 + 1000 - 400
  });

  it("handles complex scenario with both absences, lates, custom rates, and allowances", () => {
    // 24,000 / 30 = 800 daily rate
    // 2 absence days * 800 * 1.5 = 2400
    // 2 late days * 800 * 0.5 = 800
    // Total deductions = 3200
    // Net = 24,000 + 3,000 - 3200 = 23,800
    const res = calculateEmployeePayroll({
      baseSalary: 24000,
      allowances: 3000,
      absenceDays: 2,
      lateDays: 2,
      absenceRate: 1.5,
      lateRate: 0.5,
    });

    expect(res.dailyRate).toBe(800);
    expect(res.absenceDeduction).toBe(2400);
    expect(res.lateDeduction).toBe(800);
    expect(res.totalDeductions).toBe(3200);
    expect(res.netSalary).toBe(23800);
  });

  it("ensures net salary does not fall below zero even if deductions exceed earnings", () => {
    const res = calculateEmployeePayroll({
      baseSalary: 3000,
      allowances: 0,
      absenceDays: 40, // Extreme deductions
      lateDays: 10,
    });

    expect(res.netSalary).toBe(0);
  });
});

describe("HR Module - Leave Duration Calculation", () => {
  it("calculates 1 day when start date and end date are the same", () => {
    const start = new Date("2026-06-10");
    const end = new Date("2026-06-10");
    expect(calculateLeaveDays(start, end)).toBe(1);
  });

  it("calculates inclusive days across calendar range", () => {
    const start = new Date("2026-06-01");
    const end = new Date("2026-06-05");
    expect(calculateLeaveDays(start, end)).toBe(5);
  });
});

describe("HR Module - Salary Privacy & Masking", () => {
  it("displays masked placeholder when user does not have permission", () => {
    const masked = maskSalary(15000, false);
    expect(masked).toBe("••••••");
  });

  it("formats and displays actual salary when user has permission", () => {
    const visible = maskSalary(15000, true, "EGP");
    expect(visible).toContain("15");
    expect(visible).toContain("EGP");
    expect(visible).not.toBe("••••••");
  });

  it("formats null or undefined salary gracefully", () => {
    expect(formatSalary(null, "EGP")).toBe("0.00 EGP");
  });
});
