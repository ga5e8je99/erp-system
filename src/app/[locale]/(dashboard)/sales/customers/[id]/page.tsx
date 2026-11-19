import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getCustomerById } from "@/features/sales/queries/customers";
import { CustomerDetailView } from "@/features/sales/components/customer-detail-view";

interface CustomerDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  await requirePermission("sales.customer.view");
  const { id } = await params;

  const customer = await getCustomerById(id);
  if (!customer) {
    notFound();
  }

  return <CustomerDetailView customer={customer} />;
}
