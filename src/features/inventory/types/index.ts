import { Prisma } from "@prisma/client";

export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: true;
    unit: true;
    stockLevels: {
      include: {
        warehouse: true;
      };
    };
  };
}>;

export type ProductDetail = Prisma.ProductGetPayload<{
  include: {
    category: true;
    unit: true;
    stockLevels: {
      include: {
        warehouse: true;
      };
    };
    movements: {
      include: {
        warehouse: true;
      };
      orderBy: {
        createdAt: "desc";
      };
    };
  };
}>;

export type CategoryWithChildren = Prisma.CategoryGetPayload<{
  include: {
    children: true;
    _count: {
      select: {
        products: true;
        children: true;
      };
    };
  };
}>;

export type WarehouseWithCount = Prisma.WarehouseGetPayload<{
  include: {
    _count: {
      select: {
        stockLevels: true;
        movements: true;
      };
    };
  };
}>;

export type UnitWithCount = Prisma.UnitGetPayload<{
  include: {
    _count: {
      select: {
        products: true;
      };
    };
  };
}>;

export type StockOverviewItem = {
  productId: string;
  productName: string;
  sku: string;
  barcode: string | null;
  categoryName: string | null;
  unitSymbol: string;
  reorderLevel: number;
  costPrice: number;
  salePrice: number;
  totalQuantity: number;
  warehouseStocks: {
    warehouseId: string;
    warehouseName: string;
    warehouseCode: string;
    quantity: number;
  }[];
  isLowStock: boolean;
};

export type StockMovementRecord = Prisma.StockMovementGetPayload<{
  include: {
    product: {
      select: {
        id: true;
        name: true;
        sku: true;
        unit: {
          select: {
            symbol: true;
          };
        };
      };
    };
    warehouse: {
      select: {
        id: true;
        name: true;
        code: true;
      };
    };
  };
}>;
