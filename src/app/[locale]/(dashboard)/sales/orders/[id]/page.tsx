import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getOrderById } from "@/features/sales/queries/orders";
import { getWarehousesForSelect } from "@/features/inventory/queries/warehouses";
import { OrderDetailClient } from "./order-detail-client";

interface OrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  await requirePermission("sales.order.view");
  const { id } = await params;

  const [order, warehouses] = await Promise.all([
    getOrderById(id),
    getWarehousesForSelect(),
  ]);

  if (!order) {
    notFound();
  }

  return <OrderDetailClient order={order} warehouses={warehouses} />;
}
