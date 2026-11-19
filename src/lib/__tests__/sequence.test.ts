import { describe, it, expect, afterAll } from "vitest";
import { getNextDocumentNumber } from "../sequence";
import { db } from "@/lib/db";

describe("Document sequence numbering", () => {
  const testType = `TEST_${Date.now()}`;

  afterAll(async () => {
    await db.documentSequence.deleteMany({
      where: { type: testType },
    });
  });

  it("generates sequential document numbers with proper year and padding", async () => {
    const num1 = await getNextDocumentNumber({
      type: testType,
      prefix: "TEST",
      year: 2026,
    });
    const num2 = await getNextDocumentNumber({
      type: testType,
      prefix: "TEST",
      year: 2026,
    });

    expect(num1).toBe("TEST-2026-00001");
    expect(num2).toBe("TEST-2026-00002");
  });
});
