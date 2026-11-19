import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { serializeDecimals } from "../serialization";

describe("serializeDecimals", () => {
  it("converts Prisma.Decimal to number", () => {
    const dec = new Prisma.Decimal("123.45");
    const result = serializeDecimals(dec);
    expect(result).toBe(123.45);
    expect(typeof result).toBe("number");
  });

  it("converts deeply nested decimals in objects and arrays", () => {
    const input = {
      id: "prod-1",
      name: "Product A",
      costPrice: new Prisma.Decimal("50.00"),
      stockLevels: [
        {
          quantity: new Prisma.Decimal("10.50"),
          warehouse: { id: "wh-1", capacity: new Prisma.Decimal("500") },
        },
      ],
      createdAt: new Date("2026-01-01T00:00:00Z"),
      deletedAt: null,
    };

    const output = serializeDecimals(input);

    expect(output.costPrice).toBe(50);
    expect(output.stockLevels[0].quantity).toBe(10.5);
    expect(output.stockLevels[0].warehouse.capacity).toBe(500);
    expect(output.createdAt).toBeInstanceOf(Date);
    expect(output.deletedAt).toBeNull();
  });

  it("handles null and undefined safely", () => {
    expect(serializeDecimals(null)).toBeNull();
    expect(serializeDecimals(undefined)).toBeUndefined();
  });

  it("leaves primitive numbers, strings, and booleans untouched", () => {
    expect(serializeDecimals(42)).toBe(42);
    expect(serializeDecimals("hello")).toBe("hello");
    expect(serializeDecimals(true)).toBe(true);
  });
});
