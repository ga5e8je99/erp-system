import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getWarehousesForSelect } from "@/features/inventory/queries/warehouses";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAccess =
    hasPermission(session, "inventory.warehouse.manage") ||
    hasPermission(session, "inventory.product.view") ||
    hasPermission(session, "inventory.stock.adjust") ||
    hasPermission(session, "inventory.stock.transfer") ||
    hasPermission(session, "purchasing.receipt.create") ||
    hasPermission(session, "sales.invoice.create");

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden: Missing required warehouse permission" }, { status: 403 });
  }

  const items = await getWarehousesForSelect();
  return NextResponse.json({ items });
}
