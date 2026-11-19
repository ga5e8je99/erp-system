import { db } from "@/lib/db";
import { Prisma, StockMovementType } from "@prisma/client";
import { StockOverviewItem } from "../types";
import { serializeDecimals } from "@/lib/serialization";
import { clampPagination } from "@/lib/pagination";

export interface GetStockOverviewParams {
  page?: number;
  pageSize?: number;
  search?: string;
  warehouseId?: string;
  lowStockOnly?: boolean;
}

export async function getStockOverview(params: GetStockOverviewParams = {}) {
  const { page, pageSize, skip, take } = clampPagination(params, 20);
  const {
    search,
    warehouseId,
    lowStockOnly = false,
  } = params;

  const productWhere: Prisma.ProductWhereInput = {
    deletedAt: null,
    trackStock: true,
  };

  if (search && search.trim() !== "") {
    const term = search.trim();
    productWhere.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { sku: { contains: term, mode: "insensitive" } },
      { barcode: { contains: term, mode: "insensitive" } },
    ];
  }

  // Get active warehouses (bounded to 50)
  const warehouses = await db.warehouse.findMany({
    where: { deletedAt: null },
    take: 50,
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: { id: true, name: true, code: true },
  });

  const [totalProducts, products] = await Promise.all([
    db.product.count({ where: productWhere }),
    db.product.findMany({
      where: productWhere,
      skip,
      take,
      orderBy: { name: "asc" },
      include: {
        category: { select: { name: true } },
        unit: { select: { symbol: true } },
        stockLevels: {
          include: {
            warehouse: { select: { id: true, name: true, code: true } },
          },
        },
      },
    }),
  ]);

  const items: StockOverviewItem[] = products.map((p) => {
    const warehouseStocks = warehouses.map((wh) => {
      const match = p.stockLevels.find((sl) => sl.warehouseId === wh.id);
      return {
        warehouseId: wh.id,
        warehouseName: wh.name,
        warehouseCode: wh.code,
        quantity: match ? Number(match.quantity) : 0,
      };
    });

    const totalQuantity = warehouseStocks.reduce((sum, ws) => sum + ws.quantity, 0);
    const isLowStock = totalQuantity <= p.reorderLevel;

    return {
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      barcode: p.barcode,
      categoryName: p.category?.name ?? null,
      unitSymbol: p.unit.symbol,
      reorderLevel: p.reorderLevel,
      costPrice: Number(p.costPrice),
      salePrice: Number(p.salePrice),
      totalQuantity,
      warehouseStocks,
      isLowStock,
    };
  });

  let filteredItems = items;
  if (warehouseId && warehouseId !== "all") {
    filteredItems = filteredItems.map((item) => {
      const specific = item.warehouseStocks.filter((ws) => ws.warehouseId === warehouseId);
      const specificQty = specific.reduce((sum, ws) => sum + ws.quantity, 0);
      return {
        ...item,
        totalQuantity: specificQty,
        isLowStock: specificQty <= item.reorderLevel,
      };
    });
  }

  if (lowStockOnly) {
    filteredItems = filteredItems.filter((i) => i.isLowStock);
  }

  return serializeDecimals({
    items: filteredItems,
    warehouses,
    pagination: {
      page,
      pageSize,
      total: lowStockOnly ? filteredItems.length : totalProducts,
      totalPages: Math.ceil((lowStockOnly ? filteredItems.length : totalProducts) / pageSize),
    },
  });
}

export interface GetMovementLedgerParams {
  page?: number;
  pageSize?: number;
  search?: string;
  productId?: string;
  warehouseId?: string;
  type?: StockMovementType | "all";
  fromDate?: string;
  toDate?: string;
}

export async function getMovementLedger(params: GetMovementLedgerParams = {}) {
  const { page, pageSize, skip, take } = clampPagination(params, 20);
  const {
    search,
    productId,
    warehouseId,
    type,
    fromDate,
    toDate,
  } = params;

  const where: Prisma.StockMovementWhereInput = {};

  if (productId && productId !== "all") {
    where.productId = productId;
  }

  if (warehouseId && warehouseId !== "all") {
    where.warehouseId = warehouseId;
  }

  if (type && type !== "all") {
    where.type = type as StockMovementType;
  }

  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) {
      where.createdAt.gte = new Date(fromDate);
    }
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  if (search && search.trim() !== "") {
    const term = search.trim();
    where.OR = [
      { product: { name: { contains: term, mode: "insensitive" } } },
      { product: { sku: { contains: term, mode: "insensitive" } } },
      { referenceId: { contains: term, mode: "insensitive" } },
      { note: { contains: term, mode: "insensitive" } },
    ];
  }

  const [total, movements] = await Promise.all([
    db.stockMovement.count({ where }),
    db.stockMovement.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: { select: { symbol: true } },
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    }),
  ]);

  return serializeDecimals({
    items: movements.map((m) => ({
      ...m,
      quantity: Number(m.quantity),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
