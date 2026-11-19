import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getCustomersForCombobox } from "@/features/sales/queries/customers";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAccess =
    hasPermission(session, "sales.customer.view") ||
    hasPermission(session, "sales.customer.manage") ||
    hasPermission(session, "sales.invoice.create") ||
    hasPermission(session, "sales.invoice.view") ||
    hasPermission(session, "sales.order.view") ||
    hasPermission(session, "sales.quotation.view") ||
    hasPermission(session, "sales.payment.create");

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden: Missing required sales permission" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q") || "";

  const items = await getCustomersForCombobox(q);
  return NextResponse.json({ items });
}
