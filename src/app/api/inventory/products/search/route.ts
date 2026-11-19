import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getProductsForCombobox } from "@/features/inventory/queries/products";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAccess =
    hasPermission(session, "inventory.product.view") ||
    hasPermission(session, "inventory.product.create") ||
    hasPermission(session, "inventory.product.edit") ||
    hasPermission(session, "sales.invoice.create") ||
    hasPermission(session, "sales.order.manage") ||
    hasPermission(session, "sales.quotation.manage") ||
    hasPermission(session, "purchasing.order.manage") ||
    hasPermission(session, "purchasing.receipt.create") ||
    hasPermission(session, "purchasing.invoice.create") ||
    hasPermission(session, "inventory.stock.adjust") ||
    hasPermission(session, "inventory.stock.transfer");

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden: Missing required inventory permission" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q") || "";

  const items = await getProductsForCombobox(q);
  return NextResponse.json({ items });
}
