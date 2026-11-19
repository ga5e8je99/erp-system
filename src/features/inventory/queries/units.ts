import { db } from "@/lib/db";

export async function getUnits(limit = 100) {
  return db.unit.findMany({
    take: limit,
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          products: {
            where: { deletedAt: null },
          },
        },
      },
    },
  });
}
