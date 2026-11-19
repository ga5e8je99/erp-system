import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getSupplierStatementOfAccount } from "../services/purchasing-service";
import { serializeDecimals } from "@/lib/serialization";

export interface GetSuppliersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: "name" | "code" | "createdAt" | "balance";
  sortOrder?: "asc" | "desc";
}

export async function getSuppliers(params: GetSuppliersParams = {}) {
  const {
    page = 1,
    pageSize = 20,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  const skip = (Math.max(1, page) - 1) * pageSize;
  const take = Math.max(1, pageSize);

  const where: Prisma.SupplierWhereInput = {
    deletedAt: null,
  };

  if (search && search.trim() !== "") {
    const term = search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { code: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { taxNumber: { contains: term, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    db.supplier.count({ where }),
    db.supplier.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: {
          select: {
            orders: true,
            receipts: true,
            invoices: true,
            payments: true,
            returns: true,
          },
        },
      },
    }),
  ]);

  return serializeDecimals({
    items: items.map((s) => ({
      ...s,
      balance: Number(s.balance),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

export async function getSupplierById(id: string) {
  const supplier = await db.supplier.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          poNumber: true,
          status: true,
          issueDate: true,
          expectedDate: true,
          total: true,
        },
      },
      receipts: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          warehouse: { select: { name: true } },
          _count: { select: { items: true } },
        },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          issueDate: true,
          dueDate: true,
          total: true,
          paidAmount: true,
        },
      },
      payments: {
        orderBy: { date: "desc" },
        take: 10,
        select: {
          id: true,
          paymentNumber: true,
          date: true,
          amount: true,
          method: true,
          reference: true,
        },
      },
      returns: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          returnNumber: true,
          createdAt: true,
          total: true,
          status: true,
        },
      },
      _count: {
        select: {
          orders: true,
          receipts: true,
          invoices: true,
          payments: true,
          returns: true,
        },
      },
    },
  });

  if (!supplier) return null;

  const statement = await getSupplierStatementOfAccount(supplier.id);

  return serializeDecimals({
    ...supplier,
    balance: Number(supplier.balance),
    orders: supplier.orders.map((o) => ({
      ...o,
      total: Number(o.total),
    })),
    invoices: supplier.invoices.map((i) => ({
      ...i,
      total: Number(i.total),
      paidAmount: Number(i.paidAmount),
    })),
    payments: supplier.payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
    })),
    returns: supplier.returns.map((r) => ({
      ...r,
      total: Number(r.total),
    })),
    statementOfAccount: statement,
  });
}

export async function getSuppliersForCombobox(search?: string) {
  const where: Prisma.SupplierWhereInput = {
    deletedAt: null,
  };

  if (search && search.trim() !== "") {
    where.OR = [
      { name: { contains: search.trim(), mode: "insensitive" } },
      { code: { contains: search.trim(), mode: "insensitive" } },
      { phone: { contains: search.trim(), mode: "insensitive" } },
    ];
  }

  const suppliers = await db.supplier.findMany({
    where,
    take: 30,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      balance: true,
      phone: true,
    },
  });

  return serializeDecimals(
    suppliers.map((s) => ({
      value: s.id,
      label: `${s.name} (${s.code})`,
      name: s.name,
      code: s.code,
      balance: Number(s.balance),
      phone: s.phone,
    }))
  );
}
