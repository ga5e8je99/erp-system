import { db } from "@/lib/db";
import { Prisma, PurchaseOrderStatus } from "@prisma/client";
import type { PurchaseOrderPayload } from "../types";
import { serializeDecimals } from "@/lib/serialization";

export interface GetPurchaseOrdersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: PurchaseOrderStatus | "ALL";
  supplierId?: string;
  fromDate?: Date;
  toDate?: Date;
  sortBy?: "issueDate" | "poNumber" | "total" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export async function getPurchaseOrders(params: GetPurchaseOrdersParams = {}) {
  const {
    page = 1,
    pageSize = 20,
    search,
    status,
    supplierId,
    fromDate,
    toDate,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  const skip = (Math.max(1, page) - 1) * pageSize;
  const take = Math.max(1, pageSize);

  const where: Prisma.PurchaseOrderWhereInput = {};

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
      { poNumber: { contains: term, mode: "insensitive" } },
      { supplier: { name: { contains: term, mode: "insensitive" } } },
      { supplier: { code: { contains: term, mode: "insensitive" } } },
    ];
  }

  const [total, orders] = await Promise.all([
    db.purchaseOrder.count({ where }),
    db.purchaseOrder.findMany({
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
        receipts: {
          select: {
            id: true,
            receiptNumber: true,
            receiveDate: true,
            _count: { select: { items: true } },
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
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
                unit: { select: { symbol: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const items: PurchaseOrderPayload[] = orders.map((o) => ({
    id: o.id,
    poNumber: o.poNumber,
    supplierId: o.supplierId,
    status: o.status,
    issueDate: o.issueDate,
    expectedDate: o.expectedDate,
    subtotal: Number(o.subtotal),
    discount: Number(o.discount),
    tax: Number(o.tax),
    total: Number(o.total),
    notes: o.notes,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    supplier: o.supplier,
    receipts: o.receipts,
    invoices: o.invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      total: Number(inv.total),
    })),
    items: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      discount: Number(i.discount),
      taxRate: Number(i.taxRate),
      taxAmount: Number(i.taxAmount),
      total: Number(i.total),
      product: {
        id: i.product.id,
        name: i.product.name,
        sku: i.product.sku,
        costPrice: Number(i.product.costPrice),
        unit: i.product.unit,
      },
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

export async function getPurchaseOrderById(id: string): Promise<PurchaseOrderPayload | null> {
  const o = await db.purchaseOrder.findUnique({
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
      receipts: {
        select: {
          id: true,
          receiptNumber: true,
          receiveDate: true,
          _count: { select: { items: true } },
        },
      },
      invoices: {
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
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
              unit: { select: { symbol: true } },
            },
          },
        },
      },
    },
  });

  if (!o) return null;

  return serializeDecimals({
    id: o.id,
    poNumber: o.poNumber,
    supplierId: o.supplierId,
    status: o.status,
    issueDate: o.issueDate,
    expectedDate: o.expectedDate,
    subtotal: Number(o.subtotal),
    discount: Number(o.discount),
    tax: Number(o.tax),
    total: Number(o.total),
    notes: o.notes,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    supplier: o.supplier,
    receipts: o.receipts,
    invoices: o.invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      total: Number(inv.total),
    })),
    items: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      discount: Number(i.discount),
      taxRate: Number(i.taxRate),
      taxAmount: Number(i.taxAmount),
      total: Number(i.total),
      product: {
        id: i.product.id,
        name: i.product.name,
        sku: i.product.sku,
        costPrice: Number(i.product.costPrice),
        unit: i.product.unit,
      },
    })),
  });
}
