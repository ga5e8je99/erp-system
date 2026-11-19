import { db } from "@/lib/db";

export interface CategoryTreeNode {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  productsCount: number;
  children: CategoryTreeNode[];
}

export async function getCategories() {
  const categories = await db.category.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      parent: {
        select: { id: true, name: true },
      },
      _count: {
        select: { products: { where: { deletedAt: null } }, children: { where: { deletedAt: null } } },
      },
    },
  });

  return categories;
}

export async function getCategoriesTree(): Promise<CategoryTreeNode[]> {
  const allCategories = await db.category.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { products: { where: { deletedAt: null } } },
      },
    },
  });

  const nodeMap = new Map<string, CategoryTreeNode>();

  for (const cat of allCategories) {
    nodeMap.set(cat.id, {
      id: cat.id,
      name: cat.name,
      description: cat.description,
      parentId: cat.parentId,
      productsCount: cat._count.products,
      children: [],
    });
  }

  const rootNodes: CategoryTreeNode[] = [];

  for (const cat of allCategories) {
    const node = nodeMap.get(cat.id)!;
    if (cat.parentId && nodeMap.has(cat.parentId)) {
      nodeMap.get(cat.parentId)!.children.push(node);
    } else {
      rootNodes.push(node);
    }
  }

  return rootNodes;
}
