import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { serializeDecimals } from "@/lib/serialization";
import { clampPagination } from "@/lib/pagination";

export interface GetReturnsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  customerId?: string;
}

export async function getReturns(params: GetReturnsParams = {}) {
  const { page, pageSize, skip, take } = clampPagination(params, 20);
  const {
    search,
    customerId,
  } = params;

  const where: Prisma.SalesReturnWhereInput = {};

  if (customerId && customerId !== "all") {
    where.customerId = customerId;
  }

  if (search && search.trim() !== "") {
    const term = search.trim();
    where.OR = [
      { returnNumber: { contains: term, mode: "insensitive" } },
      { customer: { name: { contains: term, mode: "insensitive" } } },
      { notes: { contains: term, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    db.salesReturn.count({ where }),
    db.salesReturn.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
        _count: { select: { items: true } },
      },
    }),
  ]);

  return serializeDecimals({
    items: items.map((r) => ({
      ...r,
      subtotal: Number(r.subtotal),
      tax: Number(r.tax),
      total: Number(r.total),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
