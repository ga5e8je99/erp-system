import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getSuppliersForCombobox } from "@/features/purchasing/queries/suppliers";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAccess =
    hasPermission(session, "purchasing.supplier.view") ||
    hasPermission(session, "purchasing.supplier.manage") ||
    hasPermission(session, "purchasing.order.view") ||
    hasPermission(session, "purchasing.order.manage") ||
    hasPermission(session, "purchasing.invoice.create") ||
    hasPermission(session, "purchasing.receipt.create") ||
    hasPermission(session, "purchasing.payment.create");

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden: Missing required purchasing permission" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q") || "";

  const items = await getSuppliersForCombobox(q);
  return NextResponse.json({ items });
}
