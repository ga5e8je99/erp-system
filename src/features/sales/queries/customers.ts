import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { StatementOfAccountEntry } from "../types";
import { serializeDecimals } from "@/lib/serialization";

export interface GetCustomersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: "name" | "code" | "createdAt" | "balance";
  sortOrder?: "asc" | "desc";
}

export async function getCustomers(params: GetCustomersParams = {}) {
  const {
    page = 1,
    pageSize = 20,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  const skip = (Math.max(1, page) - 1) * pageSize;
  const take = Math.max(1, pageSize);

  const where: Prisma.CustomerWhereInput = {
    deletedAt: null,
  };

  if (search && search.trim() !== "") {
    const term = search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { code: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    db.customer.count({ where }),
    db.customer.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: {
          select: {
            invoices: true,
            orders: true,
            quotations: true,
            payments: true,
          },
        },
      },
    }),
  ]);

  return serializeDecimals({
    items: items.map((c) => ({
      ...c,
      creditLimit: Number(c.creditLimit),
      balance: Number(c.balance),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

export async function getCustomerById(id: string) {
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      invoices: {
        orderBy: { issueDate: "desc" },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, unit: { select: { symbol: true } } },
              },
            },
          },
          payments: true,
        },
      },
      orders: {
        orderBy: { issueDate: "desc" },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
      },
      quotations: {
        orderBy: { issueDate: "desc" },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
      },
      payments: {
        orderBy: { date: "desc" },
        include: {
          invoice: { select: { id: true, invoiceNumber: true } },
        },
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
    },
  });

  if (!customer || customer.deletedAt) {
    return null;
  }

  // Calculate Running Balance for Statement of Account
  const ledgerEntries: Array<{
    date: Date;
    type: "INVOICE" | "PAYMENT" | "RETURN";
    referenceNumber: string;
    description: string;
    debit: number;
    credit: number;
  }> = [];

  // Invoices (Debit - increases customer balance)
  for (const inv of customer.invoices) {
    if (inv.status !== "DRAFT" && inv.status !== "VOID") {
      ledgerEntries.push({
        date: new Date(inv.issueDate),
        type: "INVOICE",
        referenceNumber: inv.invoiceNumber,
        description: `فاتورة مبيعات رقم ${inv.invoiceNumber}`,
        debit: Number(inv.total),
        credit: 0,
      });
    }
  }

  // Payments (Credit - decreases customer balance)
  for (const pay of customer.payments) {
    ledgerEntries.push({
      date: new Date(pay.date),
      type: "PAYMENT",
      referenceNumber: pay.paymentNumber,
      description: `سند قبض نقدي/بنكي رقم ${pay.paymentNumber}`,
      debit: 0,
      credit: Number(pay.amount),
    });
  }

  // Returns (Credit - decreases customer balance)
  for (const rtn of customer.returns) {
    ledgerEntries.push({
      date: new Date(rtn.createdAt),
      type: "RETURN",
      referenceNumber: rtn.returnNumber,
      description: `مرتجع مبيعات / إشعار دائن ${rtn.returnNumber}`,
      debit: 0,
      credit: Number(rtn.total),
    });
  }

  // Sort chronological
  ledgerEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

  let runningBalance = 0;
  const statementOfAccount: StatementOfAccountEntry[] = ledgerEntries.map(
    (entry, idx) => {
      runningBalance += entry.debit - entry.credit;
      return {
        id: `soa-${idx + 1}`,
        date: entry.date,
        type: entry.type,
        referenceNumber: entry.referenceNumber,
        description: entry.description,
        debit: entry.debit,
        credit: entry.credit,
        runningBalance,
      };
    }
  );

  return serializeDecimals({
    ...customer,
    creditLimit: Number(customer.creditLimit),
    balance: Number(customer.balance),
    invoices: customer.invoices.map((inv) => ({
      ...inv,
      subtotal: Number(inv.subtotal),
      discount: Number(inv.discount),
      tax: Number(inv.tax),
      total: Number(inv.total),
      paidAmount: Number(inv.paidAmount),
    })),
    orders: customer.orders.map((o) => ({
      ...o,
      subtotal: Number(o.subtotal),
      tax: Number(o.tax),
      total: Number(o.total),
    })),
    quotations: customer.quotations.map((q) => ({
      ...q,
      subtotal: Number(q.subtotal),
      tax: Number(q.tax),
      total: Number(q.total),
    })),
    payments: customer.payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
    })),
    returns: customer.returns.map((r) => ({
      ...r,
      subtotal: Number(r.subtotal),
      tax: Number(r.tax),
      total: Number(r.total),
    })),
    statementOfAccount,
  });
}

export async function getCustomersForCombobox(search?: string) {
  const where: Prisma.CustomerWhereInput = {
    deletedAt: null,
  };

  if (search && search.trim() !== "") {
    where.OR = [
      { name: { contains: search.trim(), mode: "insensitive" } },
      { code: { contains: search.trim(), mode: "insensitive" } },
      { phone: { contains: search.trim(), mode: "insensitive" } },
    ];
  }

  const customers = await db.customer.findMany({
    where,
    take: 30,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      balance: true,
      creditLimit: true,
      phone: true,
    },
  });

  return serializeDecimals(
    customers.map((c) => ({
      value: c.id,
      label: `${c.name} (${c.code})`,
      name: c.name,
      code: c.code,
      balance: Number(c.balance),
      creditLimit: Number(c.creditLimit),
      phone: c.phone,
    }))
  );
}
