import { describe, it, expect } from "vitest";
import { clampPagination, ALLOWED_PAGE_SIZES } from "../pagination";

describe("Pagination Clamping Utility (clampPagination)", () => {
  it("defaults to page 1 and pageSize 20 when parameters are omitted", () => {
    const result = clampPagination();
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
  });

  it("accepts valid allowed page sizes: 10, 20, 50, 100", () => {
    for (const size of ALLOWED_PAGE_SIZES) {
      const result = clampPagination({ page: 2, pageSize: size });
      expect(result.pageSize).toBe(size);
      expect(result.take).toBe(size);
      expect(result.skip).toBe(size); // (2 - 1) * size
    }
  });

  it("clamps invalid or out-of-bounds page sizes to defaultPageSize", () => {
    // Unbounded numbers or negative numbers
    expect(clampPagination({ pageSize: 500 }).pageSize).toBe(20);
    expect(clampPagination({ pageSize: 0 }).pageSize).toBe(20);
    expect(clampPagination({ pageSize: -10 }).pageSize).toBe(20);
    expect(clampPagination({ pageSize: "100000" }).pageSize).toBe(20);
    expect(clampPagination({ pageSize: "invalid" }).pageSize).toBe(20);
  });

  it("clamps page numbers to minimum 1 (rejects negative numbers and 0)", () => {
    expect(clampPagination({ page: 0 }).page).toBe(1);
    expect(clampPagination({ page: -5 }).page).toBe(1);
    expect(clampPagination({ page: "not-a-number" }).page).toBe(1);
  });

  it("floors decimal page numbers to valid integers", () => {
    expect(clampPagination({ page: 3.8 }).page).toBe(3);
    expect(clampPagination({ page: "4.9" }).page).toBe(4);
  });

  it("calculates correct skip offset for high pages", () => {
    const result = clampPagination({ page: 5, pageSize: 50 });
    expect(result.page).toBe(5);
    expect(result.pageSize).toBe(50);
    expect(result.skip).toBe(200); // (5 - 1) * 50
    expect(result.take).toBe(50);
  });
});
