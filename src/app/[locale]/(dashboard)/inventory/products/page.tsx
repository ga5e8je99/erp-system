import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { ProductsTable, type ProductRow } from "@/features/inventory/components/products-table";
import { getProducts } from "@/features/inventory/queries/products";
import { getCategories } from "@/features/inventory/queries/categories";
import { getUnits } from "@/features/inventory/queries/units";

export const metadata: Metadata = {
  title: "المنتجات والأصناف | Masar ERP",
};

interface ProductsPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    q?: string;
    category?: string;
    status?: "all" | "active" | "inactive";
    lowStock?: string;
    sort?: "name" | "sku" | "createdAt" | "salePrice" | "costPrice";
    order?: "asc" | "desc";
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const t = await getTranslations("inventory.products");

  const page = Number(params.page || "1");
  const pageSize = Number(params.pageSize || "10");
  const search = params.q || "";
  const categoryId = params.category;
  const status = params.status || "all";
  const lowStock = params.lowStock === "true";
  const sortBy = params.sort || "createdAt";
  const sortOrder = params.order || "desc";

  const [productsData, categories, units] = await Promise.all([
    getProducts({
      page,
      pageSize,
      search,
      categoryId,
      status,
      lowStock,
      sortBy,
      sortOrder,
    }),
    getCategories(),
    getUnits(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
      />

      <ProductsTable
        data={productsData.items as ProductRow[]}
        totalCount={productsData.pagination.total}
        pageCount={productsData.pagination.totalPages}
        categories={categories}
        units={units}
        selectedCategory={categoryId}
        selectedStatus={status}
        lowStockOnly={lowStock}
      />
    </div>
  );
}
