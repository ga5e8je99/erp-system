import { db } from "@/lib/db";
import { Prisma, SalesQuotationStatus } from "@prisma/client";
import { serializeDecimals } from "@/lib/serialization";

export interface GetQuotationsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  customerId?: string;
  status?: SalesQuotationStatus | "all";
}

export async function getQuotations(params: GetQuotationsParams = {}) {
  const {
    page = 1,
    pageSize = 20,
    search,
    customerId,
    status = "all",
  } = params;

  const skip = (Math.max(1, page) - 1) * pageSize;
  const take = Math.max(1, pageSize);

  const where: Prisma.SalesQuotationWhereInput = {};

  if (status && status !== "all") {
    where.status = status as SalesQuotationStatus;
  }

  if (customerId && customerId !== "all") {
    where.customerId = customerId;
  }

  if (search && search.trim() !== "") {
    const term = search.trim();
    where.OR = [
      { quotationNumber: { contains: term, mode: "insensitive" } },
      { customer: { name: { contains: term, mode: "insensitive" } } },
      { notes: { contains: term, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    db.salesQuotation.count({ where }),
    db.salesQuotation.findMany({
      where,
      skip,
      take,
      orderBy: { issueDate: "desc" },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        _count: { select: { items: true, orders: true } },
      },
    }),
  ]);

  return serializeDecimals({
    items: items.map((q) => ({
      ...q,
      subtotal: Number(q.subtotal),
      tax: Number(q.tax),
      total: Number(q.total),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

export async function getQuotationById(id: string) {
  const quotation = await db.salesQuotation.findUnique({
    where: { id },
    include: {
      customer: true,
      orders: {
        select: { id: true, orderNumber: true, status: true, total: true },
      },
      items: {
        include: {
          product: {
            select: { id: true, name: true, sku: true, unit: { select: { symbol: true } } },
          },
        },
      },
    },
  });

  if (!quotation) return null;

  return serializeDecimals({
    ...quotation,
    subtotal: Number(quotation.subtotal),
    tax: Number(quotation.tax),
    total: Number(quotation.total),
    customer: {
      ...quotation.customer,
      creditLimit: Number(quotation.customer.creditLimit),
      balance: Number(quotation.customer.balance),
    },
    orders: quotation.orders.map((o) => ({
      ...o,
      total: Number(o.total),
    })),
    items: quotation.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discount: Number(item.discount || 0),
      taxRate: Number(item.taxRate),
      taxAmount: Number(item.taxAmount),
      total: Number(item.total),
    })),
  });
}
