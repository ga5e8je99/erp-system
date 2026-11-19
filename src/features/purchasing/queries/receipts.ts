import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { GoodsReceiptPayload } from "../types";
import { serializeDecimals } from "@/lib/serialization";

export interface GetGoodsReceiptsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  poId?: string;
  supplierId?: string;
  warehouseId?: string;
  fromDate?: Date;
  toDate?: Date;
}

export async function getGoodsReceipts(params: GetGoodsReceiptsParams = {}) {
  const {
    page = 1,
    pageSize = 20,
    search,
    poId,
    supplierId,
    warehouseId,
    fromDate,
    toDate,
  } = params;

  const skip = (Math.max(1, page) - 1) * pageSize;
  const take = Math.max(1, pageSize);

  const where: Prisma.GoodsReceiptWhereInput = {};

  if (poId) where.poId = poId;
  if (supplierId) where.supplierId = supplierId;
  if (warehouseId) where.warehouseId = warehouseId;

  if (fromDate || toDate) {
    where.receiveDate = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {}),
    };
  }

  if (search && search.trim() !== "") {
    const term = search.trim();
    where.OR = [
      { receiptNumber: { contains: term, mode: "insensitive" } },
      { supplier: { name: { contains: term, mode: "insensitive" } } },
      { po: { poNumber: { contains: term, mode: "insensitive" } } },
    ];
  }

  const [total, receipts] = await Promise.all([
    db.goodsReceipt.count({ where }),
    db.goodsReceipt.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        supplier: {
          select: { id: true, code: true, name: true },
        },
        warehouse: {
          select: { id: true, code: true, name: true },
        },
        po: {
          select: { id: true, poNumber: true, status: true },
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

  const items: GoodsReceiptPayload[] = receipts.map((r) => ({
    id: r.id,
    receiptNumber: r.receiptNumber,
    poId: r.poId,
    supplierId: r.supplierId,
    warehouseId: r.warehouseId,
    receiveDate: r.receiveDate,
    notes: r.notes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    supplier: r.supplier,
    warehouse: r.warehouse,
    po: r.po,
    items: r.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      quantity: Number(i.quantity),
      unitCost: Number(i.unitCost),
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

export async function getGoodsReceiptById(id: string): Promise<GoodsReceiptPayload | null> {
  const r = await db.goodsReceipt.findUnique({
    where: { id },
    include: {
      supplier: {
        select: { id: true, code: true, name: true },
      },
      warehouse: {
        select: { id: true, code: true, name: true },
      },
      po: {
        select: { id: true, poNumber: true, status: true },
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

  if (!r) return null;

  return serializeDecimals({
    id: r.id,
    receiptNumber: r.receiptNumber,
    poId: r.poId,
    supplierId: r.supplierId,
    warehouseId: r.warehouseId,
    receiveDate: r.receiveDate,
    notes: r.notes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    supplier: r.supplier,
    warehouse: r.warehouse,
    po: r.po,
    items: r.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      quantity: Number(i.quantity),
      unitCost: Number(i.unitCost),
      product: i.product,
    })),
  });
}
