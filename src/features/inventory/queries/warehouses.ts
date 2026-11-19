import { db } from "@/lib/db";

export async function getWarehouses() {
  return db.warehouse.findMany({
    where: { deletedAt: null },
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

export async function getWarehousesForSelect() {
  return db.warehouse.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      code: true,
      isDefault: true,
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}
