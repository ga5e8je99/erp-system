import { db } from "@/lib/db";
import { Prisma, SalesInvoiceStatus } from "@prisma/client";
import { serializeDecimals } from "@/lib/serialization";

export interface GetInvoicesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  customerId?: string;
  status?: SalesInvoiceStatus | "all";
  fromDate?: string;
  toDate?: string;
}

export async function getInvoices(params: GetInvoicesParams = {}) {
  const {
    page = 1,
    pageSize = 20,
    search,
    customerId,
    status = "all",
    fromDate,
    toDate,
  } = params;

  const skip = (Math.max(1, page) - 1) * pageSize;
  const take = Math.max(1, pageSize);

  const where: Prisma.SalesInvoiceWhereInput = {};

  if (status && status !== "all") {
    where.status = status as SalesInvoiceStatus;
  }

  if (customerId && customerId !== "all") {
    where.customerId = customerId;
  }

  if (fromDate || toDate) {
    where.issueDate = {};
    if (fromDate) where.issueDate.gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      where.issueDate.lte = end;
    }
  }

  if (search && search.trim() !== "") {
    const term = search.trim();
    where.OR = [
      { invoiceNumber: { contains: term, mode: "insensitive" } },
      { customer: { name: { contains: term, mode: "insensitive" } } },
      { notes: { contains: term, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    db.salesInvoice.count({ where }),
    db.salesInvoice.findMany({
      where,
      skip,
      take,
      orderBy: { issueDate: "desc" },
      include: {
        customer: { select: { id: true, name: true, code: true, taxNumber: true } },
        order: { select: { id: true, orderNumber: true } },
        _count: { select: { items: true, payments: true, returns: true } },
      },
    }),
  ]);

  return serializeDecimals({
    items: items.map((inv) => ({
      ...inv,
      subtotal: Number(inv.subtotal),
      discount: Number(inv.discount),
      tax: Number(inv.tax),
      total: Number(inv.total),
      paidAmount: Number(inv.paidAmount),
      dueAmount: Math.max(0, Number(inv.total) - Number(inv.paidAmount)),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

export async function getInvoiceById(id: string) {
  const invoice = await db.salesInvoice.findUnique({
    where: { id },
    include: {
      customer: true,
      order: true,
      payments: {
        orderBy: { date: "desc" },
      },
      returns: {
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              costPrice: true,
              trackStock: true,
              unit: { select: { symbol: true } },
            },
          },
        },
      },
    },
  });

  if (!invoice) return null;

  const companySettings = await db.companySettings.findFirst();

  return serializeDecimals({
    ...invoice,
    companySettings,
    subtotal: Number(invoice.subtotal),
    discount: Number(invoice.discount),
    tax: Number(invoice.tax),
    total: Number(invoice.total),
    paidAmount: Number(invoice.paidAmount),
    dueAmount: Math.max(0, Number(invoice.total) - Number(invoice.paidAmount)),
    items: invoice.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discount: Number(item.discount),
      taxRate: Number(item.taxRate),
      taxAmount: Number(item.taxAmount),
      total: Number(item.total),
    })),
    payments: invoice.payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
    })),
    returns: invoice.returns.map((r) => ({
      ...r,
      subtotal: Number(r.subtotal),
      tax: Number(r.tax),
      total: Number(r.total),
    })),
  });
}
