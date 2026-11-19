import { db } from "@/lib/db";
import { Prisma, PurchaseInvoiceStatus } from "@prisma/client";
import type { PurchaseInvoicePayload } from "../types";
import { serializeDecimals } from "@/lib/serialization";
import { clampPagination } from "@/lib/pagination";

export interface GetPurchaseInvoicesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: PurchaseInvoiceStatus | "ALL";
  supplierId?: string;
  fromDate?: Date;
  toDate?: Date;
  sortBy?: "issueDate" | "dueDate" | "invoiceNumber" | "total" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export async function getPurchaseInvoices(params: GetPurchaseInvoicesParams = {}) {
  const { page, pageSize, skip, take } = clampPagination(params, 20);
  const {
    search,
    status,
    supplierId,
    fromDate,
    toDate,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  const where: Prisma.PurchaseInvoiceWhereInput = {};

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (supplierId) {
    where.supplierId = supplierId;
  }

  if (fromDate || toDate) {
    where.issueDate = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {}),
    };
  }

  if (search && search.trim() !== "") {
    const term = search.trim();
    where.OR = [
      { invoiceNumber: { contains: term, mode: "insensitive" } },
      { supplier: { name: { contains: term, mode: "insensitive" } } },
      { supplier: { code: { contains: term, mode: "insensitive" } } },
    ];
  }

  const [total, invoices] = await Promise.all([
    db.purchaseInvoice.count({ where }),
    db.purchaseInvoice.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
            phone: true,
            email: true,
            address: true,
            taxNumber: true,
          },
        },
        po: {
          select: { id: true, poNumber: true },
        },
        receipt: {
          select: { id: true, receiptNumber: true },
        },
        payments: {
          select: {
            id: true,
            paymentNumber: true,
            amount: true,
            date: true,
            method: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: { select: { symbol: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const items: PurchaseInvoicePayload[] = invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    supplierId: inv.supplierId,
    poId: inv.poId,
    receiptId: inv.receiptId,
    status: inv.status,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    subtotal: Number(inv.subtotal),
    discount: Number(inv.discount),
    tax: Number(inv.tax),
    total: Number(inv.total),
    paidAmount: Number(inv.paidAmount),
    notes: inv.notes,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
    supplier: inv.supplier,
    po: inv.po,
    receipt: inv.receipt,
    payments: inv.payments.map((p) => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      amount: Number(p.amount),
      date: p.date,
      method: p.method,
    })),
    items: inv.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      discount: Number(i.discount),
      taxRate: Number(i.taxRate),
      taxAmount: Number(i.taxAmount),
      total: Number(i.total),
      product: i.product,
    })),
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

export async function getPurchaseInvoiceById(id: string): Promise<PurchaseInvoicePayload | null> {
  const inv = await db.purchaseInvoice.findUnique({
    where: { id },
    include: {
      supplier: {
        select: {
          id: true,
          code: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          taxNumber: true,
        },
      },
      po: {
        select: { id: true, poNumber: true },
      },
      receipt: {
        select: { id: true, receiptNumber: true },
      },
      payments: {
        select: {
          id: true,
          paymentNumber: true,
          amount: true,
          date: true,
          method: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit: { select: { symbol: true } },
            },
          },
        },
      },
    },
  });

  if (!inv) return null;

  return serializeDecimals({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    supplierId: inv.supplierId,
    poId: inv.poId,
    receiptId: inv.receiptId,
    status: inv.status,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    subtotal: Number(inv.subtotal),
    discount: Number(inv.discount),
    tax: Number(inv.tax),
    total: Number(inv.total),
    paidAmount: Number(inv.paidAmount),
    notes: inv.notes,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
    supplier: inv.supplier,
    po: inv.po,
    receipt: inv.receipt,
    payments: inv.payments.map((p) => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      amount: Number(p.amount),
      date: p.date,
      method: p.method,
    })),
    items: inv.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      discount: Number(i.discount),
      taxRate: Number(i.taxRate),
      taxAmount: Number(i.taxAmount),
      total: Number(i.total),
      product: i.product,
    })),
  });
}
