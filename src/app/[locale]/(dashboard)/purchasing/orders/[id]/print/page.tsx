import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getPurchaseOrderById } from "@/features/purchasing/queries/orders";
import { PrintablePO } from "@/features/purchasing/components/printable-po";

interface PrintPOPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PrintPOPage({ params }: PrintPOPageProps) {
  await requirePermission("purchasing.order.view");
  const { id } = await params;

  const order = await getPurchaseOrderById(id);
  if (!order) {
    notFound();
  }

  return <PrintablePO order={order} />;
}
