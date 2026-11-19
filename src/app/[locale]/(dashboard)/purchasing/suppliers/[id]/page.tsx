import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getSupplierById } from "@/features/purchasing/queries/suppliers";
import { SupplierDetailView } from "@/features/purchasing/components/supplier-detail-view";

interface SupplierDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SupplierDetailPage({
  params,
}: SupplierDetailPageProps) {
  await requirePermission("purchasing.supplier.view");
  const { id } = await params;

  const supplier = await getSupplierById(id);
  if (!supplier) {
    notFound();
  }

  return <SupplierDetailView supplier={supplier} />;
}
