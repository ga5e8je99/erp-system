import { db } from "@/lib/db";

export async function getUnits() {
  return db.unit.findMany({
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
