import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { CategoryTree } from "@/features/inventory/components/category-tree";
import { getCategoriesTree, getCategories } from "@/features/inventory/queries/categories";

export const metadata: Metadata = {
  title: "تصنيفات المنتجات | Masar ERP",
};

export default async function CategoriesPage() {
  const t = await getTranslations("inventory.categories");

  const [tree, flatCategories] = await Promise.all([
    getCategoriesTree(),
    getCategories(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
      />

      <CategoryTree
        tree={tree}
        flatCategories={flatCategories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
