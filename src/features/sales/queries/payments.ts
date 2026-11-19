import { db } from "@/lib/db";
import { PaymentMethod, Prisma } from "@prisma/client";
import { serializeDecimals } from "@/lib/serialization";

export interface GetPaymentsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  customerId?: string;
  method?: PaymentMethod | "all";
}

export async function getPayments(params: GetPaymentsParams = {}) {
  const {
    page = 1,
    pageSize = 20,
    search,
    customerId,
    method = "all",
  } = params;

  const skip = (Math.max(1, page) - 1) * pageSize;
  const take = Math.max(1, pageSize);

  const where: Prisma.CustomerPaymentWhereInput = {};

  if (method && method !== "all") {
    where.method = method as PaymentMethod;
  }

  if (customerId && customerId !== "all") {
    where.customerId = customerId;
  }

  if (search && search.trim() !== "") {
    const term = search.trim();
    where.OR = [
      { paymentNumber: { contains: term, mode: "insensitive" } },
      { customer: { name: { contains: term, mode: "insensitive" } } },
      { reference: { contains: term, mode: "insensitive" } },
      { notes: { contains: term, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    db.customerPayment.count({ where }),
    db.customerPayment.findMany({
      where,
      skip,
      take,
      orderBy: { date: "desc" },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        invoice: { select: { id: true, invoiceNumber: true, total: true } },
      },
    }),
  ]);

  return serializeDecimals({
    items: items.map((p) => ({
      ...p,
      amount: Number(p.amount),
      invoice: p.invoice
        ? {
            ...p.invoice,
            total: Number(p.invoice.total),
          }
        : null,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
