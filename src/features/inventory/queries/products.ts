import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { serializeDecimals } from "@/lib/serialization";

export interface GetProductsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  status?: "all" | "active" | "inactive";
  lowStock?: boolean;
  sortBy?: "name" | "sku" | "createdAt" | "salePrice" | "costPrice";
  sortOrder?: "asc" | "desc";
}

export async function getProducts(params: GetProductsParams = {}) {
  const {
    page = 1,
    pageSize = 20,
    search,
    categoryId,
    status = "all",
    lowStock = false,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  const skip = (Math.max(1, page) - 1) * pageSize;
  const take = Math.max(1, pageSize);

  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
  };

  if (status === "active") {
    where.isActive = true;
  } else if (status === "inactive") {
    where.isActive = false;
  }

  if (categoryId && categoryId !== "all") {
    where.categoryId = categoryId;
  }

  if (search && search.trim() !== "") {
    const term = search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { sku: { contains: term, mode: "insensitive" } },
      { barcode: { contains: term, mode: "insensitive" } },
    ];
  }

  // Fetch products with their unit, category, and stock levels
  const [total, items] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        category: {
          select: { id: true, name: true },
        },
        unit: {
          select: { id: true, name: true, symbol: true },
        },
        stockLevels: {
          select: {
            quantity: true,
            warehouseId: true,
            warehouse: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    }),
  ]);

  // Map items to calculate total on-hand quantity and low stock flag
  const formattedItems = items.map((product) => {
    const totalStock = product.stockLevels.reduce(
      (sum, level) => sum + Number(level.quantity),
      0
    );
    const isLowStock = product.trackStock && totalStock <= product.reorderLevel;

    return serializeDecimals({
      ...product,
      costPrice: Number(product.costPrice),
      salePrice: Number(product.salePrice),
      taxRate: Number(product.taxRate),
      totalStock,
      isLowStock,
      stockLevels: product.stockLevels.map((sl) => ({
        ...sl,
        quantity: Number(sl.quantity),
      })),
    });
  });

// If lowStock filter was requested
const filteredItems = lowStock
  ? formattedItems.filter((p) => p.isLowStock)
  : formattedItems;

return {
  items: filteredItems,
  pagination: {
    page,
    pageSize,
    total: lowStock ? filteredItems.length : total,
    totalPages: Math.ceil((lowStock ? filteredItems.length : total) / pageSize),
  },
};
}

export async function getProductById(id: string) {
  const product = await db.product.findUnique({
    where: { id },
    include: {
      category: true,
      unit: true,
      stockLevels: {
        include: {
          warehouse: true,
        },
      },
      movements: {
        take: 30,
        orderBy: { createdAt: "desc" },
        include: {
          warehouse: {
            select: { id: true, name: true, code: true },
          },
        },
      },
    },
  });

  if (!product || product.deletedAt) {
    return null;
  }

  const totalStock = product.stockLevels.reduce(
    (sum, level) => sum + Number(level.quantity),
    0
  );

  return serializeDecimals({
    ...product,
    costPrice: Number(product.costPrice),
    salePrice: Number(product.salePrice),
    taxRate: Number(product.taxRate),
    totalStock,
    isLowStock: product.trackStock && totalStock <= product.reorderLevel,
    stockLevels: product.stockLevels.map((sl) => ({
      ...sl,
      quantity: Number(sl.quantity),
    })),
    movements: product.movements.map((m) => ({
      ...m,
      quantity: Number(m.quantity),
    })),
  });
}

export async function getProductsForCombobox(search?: string) {
  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    isActive: true,
  };

  if (search && search.trim() !== "") {
    where.OR = [
      { name: { contains: search.trim(), mode: "insensitive" } },
      { sku: { contains: search.trim(), mode: "insensitive" } },
      { barcode: { contains: search.trim(), mode: "insensitive" } },
    ];
  }

  const products = await db.product.findMany({
    where,
    take: 30,
    orderBy: { name: "asc" },
    include: {
      unit: { select: { symbol: true } },
      stockLevels: { select: { quantity: true } },
    },
  });

  return products.map((p) => {
    const stockQty = p.stockLevels.reduce(
      (sum, l) => sum + Number(l.quantity),
      0
    );
    return {
      value: p.id,
      label: `${p.name} (${p.sku})`,
      name: p.name,
      sku: p.sku,
      unitSymbol: p.unit.symbol,
      costPrice: Number(p.costPrice),
      salePrice: Number(p.salePrice),
      taxRate: Number(p.taxRate),
      stockQuantity: stockQty,
      trackStock: p.trackStock,
    };
  });
  return serializeDecimals(
    products.map((p) => {
      const stockQty = p.stockLevels.reduce(
        (sum, l) => sum + Number(l.quantity),
        0
      );
      return {
        value: p.id,
        label: `${p.name} (${p.sku})`,
        name: p.name,
        sku: p.sku,
        unitSymbol: p.unit.symbol,
        costPrice: Number(p.costPrice),
        salePrice: Number(p.salePrice),
        taxRate: Number(p.taxRate),
        stockQuantity: stockQty,
        trackStock: p.trackStock,
      };
    })
  );
}
