import { db } from "@/lib/db";
import { Prisma, SalesOrderStatus } from "@prisma/client";
import { serializeDecimals } from "@/lib/serialization";

export interface GetOrdersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  customerId?: string;
  status?: SalesOrderStatus | "all";
}

export async function getOrders(params: GetOrdersParams = {}) {
  const {
    page = 1,
    pageSize = 20,
    search,
    customerId,
    status = "all",
  } = params;

  const skip = (Math.max(1, page) - 1) * pageSize;
  const take = Math.max(1, pageSize);

  const where: Prisma.SalesOrderWhereInput = {};

  if (status && status !== "all") {
    where.status = status as SalesOrderStatus;
  }

  if (customerId && customerId !== "all") {
    where.customerId = customerId;
  }

  if (search && search.trim() !== "") {
    const term = search.trim();
    where.OR = [
      { orderNumber: { contains: term, mode: "insensitive" } },
      { customer: { name: { contains: term, mode: "insensitive" } } },
      { notes: { contains: term, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    db.salesOrder.count({ where }),
    db.salesOrder.findMany({
      where,
      skip,
      take,
      orderBy: { issueDate: "desc" },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        quotation: { select: { id: true, quotationNumber: true } },
        _count: { select: { items: true, invoices: true } },
      },
    }),
  ]);

  return serializeDecimals({
    items: items.map((o) => ({
      ...o,
      subtotal: Number(o.subtotal),
      tax: Number(o.tax),
      total: Number(o.total),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

export async function getOrderById(id: string) {
  const order = await db.salesOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      quotation: true,
      invoices: {
        select: { id: true, invoiceNumber: true, status: true, total: true, paidAmount: true },
      },
      items: {
        include: {
          product: {
            select: { id: true, name: true, sku: true, costPrice: true, unit: { select: { symbol: true } } },
          },
        },
      },
    },
  });

  if (!order) return null;

  return serializeDecimals({
    ...order,
    subtotal: Number(order.subtotal),
    tax: Number(order.tax),
    total: Number(order.total),
    customer: {
      ...order.customer,
      creditLimit: Number(order.customer.creditLimit),
      balance: Number(order.customer.balance),
    },
    invoices: order.invoices.map((inv) => ({
      ...inv,
      total: Number(inv.total),
      paidAmount: Number(inv.paidAmount),
    })),
    items: order.items.map((item) => ({
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
