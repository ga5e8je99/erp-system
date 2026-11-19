import { db } from "@/lib/db";

export async function getWarehouses(limit = 100) {
  return db.warehouse.findMany({
    where: { deletedAt: null },
    take: limit,
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          stockLevels: true,
          movements: true,
        },
      },
    },
  });
}

export async function getWarehousesForSelect(limit = 50) {
  return db.warehouse.findMany({
    where: { deletedAt: null },
    take: limit,
    select: {
      id: true,
      name: true,
      code: true,
      isDefault: true,
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}
