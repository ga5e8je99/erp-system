import { Prisma } from "@prisma/client";

/**
 * Recursively converts Prisma.Decimal instances into standard JavaScript numbers
 * so data can be safely passed from Server Components to Client Components in Next.js App Router.
 * Also preserves Dates, nulls, arrays, and plain objects.
 */
export function serializeDecimals<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle Prisma.Decimal (or any object that looks like Decimal / DecimalJs)
  if (
    Prisma.Decimal.isDecimal(obj) ||
    (typeof obj === "object" &&
      obj !== null &&
      "toNumber" in obj &&
      typeof (obj as { toNumber: unknown }).toNumber === "function" &&
      ("d" in obj || "s" in obj || (obj as { constructor?: { name?: string } }).constructor?.name === "Decimal"))
  ) {
    return (obj as unknown as Prisma.Decimal).toNumber() as unknown as T;
  }

  // Preserve Date instances (supported by Next.js RSC)
  if (obj instanceof Date) {
    return obj;
  }

  // Recurse into arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => serializeDecimals(item)) as unknown as T;
  }

  // Recurse into plain objects
  if (typeof obj === "object") {
    const res: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      res[key] = serializeDecimals(value);
    }
    return res as T;
  }

  return obj;
}
