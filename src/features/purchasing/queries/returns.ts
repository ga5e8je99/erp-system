import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { PurchaseReturnPayload } from "../types";
import { serializeDecimals } from "@/lib/serialization";

export interface GetPurchaseReturnsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  supplierId?: string;
  fromDate?: Date;
  toDate?: Date;
}

export async function getPurchaseReturns(params: GetPurchaseReturnsParams = {}) {
  const {
    page = 1,
    pageSize = 20,
    search,
    supplierId,
    fromDate,
    toDate,
  } = params;

  const skip = (Math.max(1, page) - 1) * pageSize;
  const take = Math.max(1, pageSize);

  const where: Prisma.PurchaseReturnWhereInput = {};

  if (supplierId) where.supplierId = supplierId;

  if (fromDate || toDate) {
    where.createdAt = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {}),
    };
  }

  if (search && search.trim() !== "") {
    const term = search.trim();
    where.OR = [
      { returnNumber: { contains: term, mode: "insensitive" } },
      { supplier: { name: { contains: term, mode: "insensitive" } } },
      { invoice: { invoiceNumber: { contains: term, mode: "insensitive" } } },
    ];
  }

  const [total, returns] = await Promise.all([
    db.purchaseReturn.count({ where }),
    db.purchaseReturn.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        supplier: {
          select: { id: true, code: true, name: true },
        },
        invoice: {
          select: { id: true, invoiceNumber: true },
        },
        warehouse: {
          select: { id: true, code: true, name: true },
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

  const items: PurchaseReturnPayload[] = returns.map((r) => ({
    id: r.id,
    returnNumber: r.returnNumber,
    supplierId: r.supplierId,
    invoiceId: r.invoiceId,
    warehouseId: r.warehouseId,
    status: r.status,
    subtotal: Number(r.subtotal),
    tax: Number(r.tax),
    total: Number(r.total),
    notes: r.notes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    supplier: r.supplier,
    invoice: r.invoice,
    warehouse: r.warehouse,
    items: r.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
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
