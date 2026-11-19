import { describe, it, expect } from "vitest";
import { GET, HEAD } from "../route";

describe("Health Check API (/api/health)", () => {
  it("returns 200 with healthy database connectivity status on GET", async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe("healthy");
    expect(body.checks.database.status).toBe("connected");
    expect(typeof body.checks.database.latencyMs).toBe("number");
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(body.version).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });

  it("returns 200 empty response on HEAD probe", async () => {
    const response = await HEAD();
    expect(response.status).toBe(200);
  });
});
