export const ALLOWED_PAGE_SIZES = [10, 20, 50, 100] as const;
export type AllowedPageSize = (typeof ALLOWED_PAGE_SIZES)[number];

export interface PaginationParams {
  page?: unknown;
  pageSize?: unknown;
}

export interface ClampedPagination {
  page: number;
  pageSize: AllowedPageSize;
  skip: number;
  take: number;
}

/**
 * Clamps pagination parameters to safe bounds:
 * - page >= 1 (integer)
 * - pageSize clamped to {10, 20, 50, 100}
 */
export function clampPagination(
  params?: PaginationParams,
  defaultPageSize: AllowedPageSize = 20
): ClampedPagination {
  const rawPage = Number(params?.page);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

  const rawPageSize = Number(params?.pageSize);
  const pageSize: AllowedPageSize = (ALLOWED_PAGE_SIZES as readonly number[]).includes(rawPageSize)
    ? (rawPageSize as AllowedPageSize)
    : defaultPageSize;

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  return { page, pageSize, skip, take };
}
