import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { SupplierPaymentPayload } from "../types";
import { serializeDecimals } from "@/lib/serialization";
import { clampPagination } from "@/lib/pagination";

export interface GetSupplierPaymentsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  supplierId?: string;
  fromDate?: Date;
  toDate?: Date;
}

export async function getSupplierPayments(params: GetSupplierPaymentsParams = {}) {
  const { page, pageSize, skip, take } = clampPagination(params, 20);
  const {
    search,
    supplierId,
    fromDate,
    toDate,
  } = params;

  const where: Prisma.SupplierPaymentWhereInput = {};

  if (supplierId) where.supplierId = supplierId;

  if (fromDate || toDate) {
    where.date = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {}),
    };
  }

  if (search && search.trim() !== "") {
    const term = search.trim();
    where.OR = [
      { paymentNumber: { contains: term, mode: "insensitive" } },
      { reference: { contains: term, mode: "insensitive" } },
      { supplier: { name: { contains: term, mode: "insensitive" } } },
      { invoice: { invoiceNumber: { contains: term, mode: "insensitive" } } },
    ];
  }

  const [total, payments] = await Promise.all([
    db.supplierPayment.count({ where }),
    db.supplierPayment.findMany({
      where,
      skip,
      take,
      orderBy: { date: "desc" },
      include: {
        supplier: {
          select: { id: true, code: true, name: true },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            paidAmount: true,
          },
        },
      },
    }),
  ]);

  const items: SupplierPaymentPayload[] = payments.map((p) => ({
    id: p.id,
    paymentNumber: p.paymentNumber,
    supplierId: p.supplierId,
    invoiceId: p.invoiceId,
    amount: Number(p.amount),
    method: p.method,
    date: p.date,
    reference: p.reference,
    notes: p.notes,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    supplier: p.supplier,
    invoice: p.invoice
      ? {
          id: p.invoice.id,
          invoiceNumber: p.invoice.invoiceNumber,
          total: Number(p.invoice.total),
          paidAmount: Number(p.invoice.paidAmount),
        }
      : null,
  }));

  return serializeDecimals({
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
