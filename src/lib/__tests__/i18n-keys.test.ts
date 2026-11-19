import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

function getAllKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...getAllKeys(v as Record<string, unknown>, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

describe("i18n Translation Completeness", () => {
  const arPath = path.resolve(process.cwd(), "messages/ar.json");
  const enPath = path.resolve(process.cwd(), "messages/en.json");

  const arMessages = JSON.parse(fs.readFileSync(arPath, "utf-8"));
  const enMessages = JSON.parse(fs.readFileSync(enPath, "utf-8"));

  it("ensures ar.json and en.json have identical key structures", () => {
    const arKeys = new Set(getAllKeys(arMessages));
    const enKeys = new Set(getAllKeys(enMessages));

    const missingInEn = [...arKeys].filter((k) => !enKeys.has(k));
    const missingInAr = [...enKeys].filter((k) => !arKeys.has(k));

    expect(
      missingInEn,
      `Keys present in ar.json but missing in en.json:\n${missingInEn.join("\n")}`
    ).toEqual([]);

    expect(
      missingInAr,
      `Keys present in en.json but missing in ar.json:\n${missingInAr.join("\n")}`
    ).toEqual([]);
  });
});
