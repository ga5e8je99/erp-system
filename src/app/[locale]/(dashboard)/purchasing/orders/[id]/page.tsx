import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getPurchaseOrderById } from "@/features/purchasing/queries/orders";
import { OrderDetailClient } from "./order-detail-client";

interface OrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  await requirePermission("purchasing.order.view");
  const { id } = await params;

  const order = await getPurchaseOrderById(id);
  if (!order) {
    notFound();
  }

  return <OrderDetailClient order={order} />;
}
