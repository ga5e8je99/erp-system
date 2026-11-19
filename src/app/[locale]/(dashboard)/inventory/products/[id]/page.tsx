import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductById } from "@/features/inventory/queries/products";
import { getCategories } from "@/features/inventory/queries/categories";
import { getUnits } from "@/features/inventory/queries/units";
import { ProductDetailView } from "@/features/inventory/components/product-detail-view";

interface ProductDetailPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  return {
    title: product ? `${product.name} (${product.sku}) | Masar ERP` : "تفاصيل المنتج | Masar ERP",
  };
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { id, locale } = await params;

  const [product, categories, units] = await Promise.all([
    getProductById(id),
    getCategories(),
    getUnits(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <ProductDetailView
      product={product}
      categories={categories}
      units={units}
      locale={locale}
    />
  );
}
