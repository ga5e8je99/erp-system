import { db } from "@/lib/db";
import {
  ReportDateFilter,
  SalesByCustomerRow,
  SalesByProductRow,
  SalesBySalespersonRow,
  PurchasesBySupplierRow,
  InventoryValuationRow,
  StockMovementSummaryRow,
  ProfitByProductRow,
  HrAttendanceSummaryRow,
} from "../types";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";

function parseLocalDate(dateStr: string, isEnd = false): Date {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return isEnd
      ? new Date(year, month, day, 23, 59, 59, 999)
      : new Date(year, month, day, 0, 0, 0, 0);
  }
  const d = new Date(dateStr);
  return isEnd ? endOfDay(d) : startOfDay(d);
}

function parseDateRange(from?: string, to?: string) {
  const now = new Date();
  const startDate = from ? parseLocalDate(from, false) : startOfMonth(now);
  const endDate = to ? parseLocalDate(to, true) : endOfMonth(now);
  return { startDate, endDate };
}

// 1. Sales by Customer Report
export async function getSalesByCustomerReport(
  filter: ReportDateFilter = {}
): Promise<SalesByCustomerRow[]> {
  const { startDate, endDate } = parseDateRange(filter.from, filter.to);

  const customers = await db.customer.findMany({
    where: {
      deletedAt: null,
      ...(filter.search
        ? {
          OR: [
            { name: { contains: filter.search, mode: "insensitive" } },
            { code: { contains: filter.search, mode: "insensitive" } },
          ],
        }
        : {}),
    },
    take: 200,
    include: {
      invoices: {
        where: {
          status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
          issueDate: { gte: startDate, lte: endDate },
        },
        select: {
          total: true,
          paidAmount: true,
        },
      },
    },
  });

  return customers
    .map((c) => {
      const invoiceCount = c.invoices.length;
      const totalSales = c.invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
      const totalPaid = c.invoices.reduce((sum, inv) => sum + Number(inv.paidAmount), 0);
      const balance = totalSales - totalPaid;

      return {
        customerId: c.id,
        customerCode: c.code,
        customerName: c.name,
        phone: c.phone,
        invoiceCount,
        totalSales: Math.round(totalSales * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        balance: Math.round(balance * 100) / 100,
      };
    })
    .filter((row) => row.invoiceCount > 0 || row.totalSales > 0)
    .sort((a, b) => b.totalSales - a.totalSales);
}

// 2. Sales by Product Report
export async function getSalesByProductReport(
  filter: ReportDateFilter = {}
): Promise<SalesByProductRow[]> {
  const { startDate, endDate } = parseDateRange(filter.from, filter.to);

  const items = await db.salesInvoiceItem.findMany({
    where: {
      invoice: {
        status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
        issueDate: { gte: startDate, lte: endDate },
      },
      product: {
        deletedAt: null,
        ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
        ...(filter.search
          ? {
            OR: [
              { name: { contains: filter.search, mode: "insensitive" } },
              { sku: { contains: filter.search, mode: "insensitive" } },
            ],
          }
          : {}),
      },
    },
    take: 500,
    include: {
      product: {
        include: {
          category: { select: { name: true } },
          unit: { select: { symbol: true } },
        },
      },
    },
  });

  const productMap = new Map<
    string,
    {
      sku: string;
      name: string;
      category: string;
      unit: string;
      quantity: number;
      revenue: number;
    }
  >();

  for (const it of items) {
    const pid = it.productId;
    const qty = Number(it.quantity);
    const lineTotal = Number(it.unitPrice) * qty - Number(it.discount);

    const existing = productMap.get(pid);
    if (existing) {
      existing.quantity += qty;
      existing.revenue += lineTotal;
    } else {
      productMap.set(pid, {
        sku: it.product.sku,
        name: it.product.name,
        category: it.product.category?.name || "—",
        unit: it.product.unit?.symbol || "",
        quantity: qty,
        revenue: lineTotal,
      });
    }
  }

  return Array.from(productMap.entries())
    .map(([productId, val]) => ({
      productId,
      sku: val.sku,
      productName: val.name,
      categoryName: val.category,
      unitSymbol: val.unit,
      quantitySold: Math.round(val.quantity * 100) / 100,
      totalSales: Math.round(val.revenue * 100) / 100,
      avgUnitPrice:
        val.quantity > 0
          ? Math.round((val.revenue / val.quantity) * 100) / 100
          : 0,
    }))
    .sort((a, b) => b.totalSales - a.totalSales);
}

// 3. Sales by Salesperson (User) Report
export async function getSalesBySalespersonReport(
  filter: ReportDateFilter = {}
): Promise<SalesBySalespersonRow[]> {
  const { startDate, endDate } = parseDateRange(filter.from, filter.to);

  // Find audit logs for invoice creations/issuances (bounded to 500)
  const logs = await db.auditLog.findMany({
    where: {
      entity: "SalesInvoice",
      action: { in: ["INVOICE_CREATE", "INVOICE_ISSUE"] },
      createdAt: { gte: startDate, lte: endDate },
    },
    take: 500,
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // Collect invoice IDs
  const invoiceIds = Array.from(new Set(logs.map((l) => l.entityId)));
  const invoices = await db.salesInvoice.findMany({
    where: {
      id: { in: invoiceIds },
      status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
    },
    take: 500,
    select: { id: true, total: true },
  });

  const invoiceTotalMap = new Map(invoices.map((inv) => [inv.id, Number(inv.total)]));

  const userMap = new Map<
    string,
    { name: string; email: string; invoiceIds: Set<string>; totalSales: number }
  >();

  for (const log of logs) {
    if (!log.user) continue;
    const uid = log.user.id;
    const invTotal = invoiceTotalMap.get(log.entityId) || 0;

    let userData = userMap.get(uid);
    if (!userData) {
      userData = {
        name: log.user.name,
        email: log.user.email,
        invoiceIds: new Set<string>(),
        totalSales: 0,
      };
      userMap.set(uid, userData);
    }

    if (!userData.invoiceIds.has(log.entityId) && invTotal > 0) {
      userData.invoiceIds.add(log.entityId);
      userData.totalSales += invTotal;
    }
  }

  // Fallback: If no audit log records, list active users
  if (userMap.size === 0) {
    const users = await db.user.findMany({
      where: { isActive: true },
      take: 100,
      select: { id: true, name: true, email: true },
    });
    return users.map((u) => ({
      userId: u.id,
      userName: u.name,
      userEmail: u.email,
      invoiceCount: 0,
      totalSales: 0,
      avgInvoiceValue: 0,
    }));
  }

  return Array.from(userMap.entries()).map(([userId, data]) => ({
    userId,
    userName: data.name,
    userEmail: data.email,
    invoiceCount: data.invoiceIds.size,
    totalSales: Math.round(data.totalSales * 100) / 100,
    avgInvoiceValue:
      data.invoiceIds.size > 0
        ? Math.round((data.totalSales / data.invoiceIds.size) * 100) / 100
        : 0,
  }));
}

// 4. Purchases by Supplier Report
export async function getPurchasesBySupplierReport(
  filter: ReportDateFilter = {}
): Promise<PurchasesBySupplierRow[]> {
  const { startDate, endDate } = parseDateRange(filter.from, filter.to);

  const suppliers = await db.supplier.findMany({
    where: {
      deletedAt: null,
      ...(filter.search
        ? {
          OR: [
            { name: { contains: filter.search, mode: "insensitive" } },
            { code: { contains: filter.search, mode: "insensitive" } },
          ],
        }
        : {}),
    },
    take: 200,
    include: {
      invoices: {
        where: {
          status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
          issueDate: { gte: startDate, lte: endDate },
        },
        select: {
          total: true,
          paidAmount: true,
        },
      },
    },
  });

  return suppliers
    .map((s) => {
      const invoiceCount = s.invoices.length;
      const totalPurchases = s.invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
      const totalPaid = s.invoices.reduce((sum, inv) => sum + Number(inv.paidAmount), 0);
      const balance = totalPurchases - totalPaid;

      return {
        supplierId: s.id,
        supplierCode: s.code,
        supplierName: s.name,
        phone: s.phone,
        invoiceCount,
        totalPurchases: Math.round(totalPurchases * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        balance: Math.round(balance * 100) / 100,
      };
    })
    .filter((row) => row.invoiceCount > 0 || row.totalPurchases > 0)
    .sort((a, b) => b.totalPurchases - a.totalPurchases);
}

// 5. Inventory Valuation Report
export async function getInventoryValuationReport(
  filter: ReportDateFilter = {}
): Promise<InventoryValuationRow[]> {
  const products = await db.product.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      trackStock: true,
      ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
      ...(filter.search
        ? {
          OR: [
            { name: { contains: filter.search, mode: "insensitive" } },
            { sku: { contains: filter.search, mode: "insensitive" } },
          ],
        }
        : {}),
    },
    take: 500,
    include: {
      category: { select: { name: true } },
      unit: { select: { symbol: true } },
      stockLevels: {
        where: filter.warehouseId ? { warehouseId: filter.warehouseId } : undefined,
        select: { quantity: true },
      },
    },
  });

  return products
    .map((p) => {
      const currentStock = p.stockLevels.reduce(
        (sum, sl) => sum + Number(sl.quantity),
        0
      );
      const unitCost = Number(p.costPrice);
      const totalValuation = currentStock * unitCost;

      return {
        productId: p.id,
        sku: p.sku,
        productName: p.name,
        categoryName: p.category?.name || "—",
        unitSymbol: p.unit?.symbol || "",
        currentStock: Math.round(currentStock * 100) / 100,
        unitCost: Math.round(unitCost * 100) / 100,
        totalValuation: Math.round(totalValuation * 100) / 100,
      };
    })
    .sort((a, b) => b.totalValuation - a.totalValuation);
}

// 6. Stock Movement Summary Report
export async function getStockMovementSummaryReport(
  filter: ReportDateFilter = {}
): Promise<StockMovementSummaryRow[]> {
  const { startDate, endDate } = parseDateRange(filter.from, filter.to);

  const products = await db.product.findMany({
    where: {
      deletedAt: null,
      trackStock: true,
      ...(filter.search
        ? {
          OR: [
            { name: { contains: filter.search, mode: "insensitive" } },
            { sku: { contains: filter.search, mode: "insensitive" } },
          ],
        }
        : {}),
    },
    take: 500,
    include: {
      unit: { select: { symbol: true } },
      movements: {
        where: {
          createdAt: { lte: endDate },
          ...(filter.warehouseId ? { warehouseId: filter.warehouseId } : {}),
        },
        select: {
          type: true,
          quantity: true,
          createdAt: true,
        },
      },
    },
  });

  return products.map((p) => {
    let openingStock = 0;
    let inQuantity = 0;
    let outQuantity = 0;
    let adjustmentQuantity = 0;

    for (const m of p.movements) {
      const q = Number(m.quantity);
      if (m.createdAt < startDate) {
        // Prior to period -> contributes to opening stock
        if (m.type === "IN") openingStock += q;
        else if (m.type === "OUT") openingStock -= q;
        else if (m.type === "ADJUSTMENT") openingStock += q;
      } else {
        // Within period
        if (m.type === "IN") inQuantity += q;
        else if (m.type === "OUT") outQuantity += q;
        else if (m.type === "ADJUSTMENT") adjustmentQuantity += q;
      }
    }

    const closingStock = openingStock + inQuantity - outQuantity + adjustmentQuantity;

    return {
      productId: p.id,
      sku: p.sku,
      productName: p.name,
      unitSymbol: p.unit?.symbol || "",
      openingStock: Math.round(openingStock * 100) / 100,
      inQuantity: Math.round(inQuantity * 100) / 100,
      outQuantity: Math.round(outQuantity * 100) / 100,
      adjustmentQuantity: Math.round(adjustmentQuantity * 100) / 100,
      closingStock: Math.round(closingStock * 100) / 100,
    };
  });
}

// 7. Profit by Product Report
export async function getProfitByProductReport(
  filter: ReportDateFilter = {}
): Promise<ProfitByProductRow[]> {
  const { startDate, endDate } = parseDateRange(filter.from, filter.to);

  const items = await db.salesInvoiceItem.findMany({
    where: {
      invoice: {
        status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
        issueDate: { gte: startDate, lte: endDate },
      },
      product: {
        deletedAt: null,
        ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
        ...(filter.search
          ? {
            OR: [
              { name: { contains: filter.search, mode: "insensitive" } },
              { sku: { contains: filter.search, mode: "insensitive" } },
            ],
          }
          : {}),
      },
    },
    take: 500,
    include: {
      product: {
        include: {
          category: { select: { name: true } },
          unit: { select: { symbol: true } },
        },
      },
    },
  });

  const aggMap = new Map<
    string,
    {
      sku: string;
      name: string;
      category: string;
      unit: string;
      costPrice: number;
      qty: number;
      revenue: number;
    }
  >();

  for (const it of items) {
    const pid = it.productId;
    const qty = Number(it.quantity);
    const rev = Number(it.unitPrice) * qty - Number(it.discount);
    const cost = Number(it.product.costPrice);

    const existing = aggMap.get(pid);
    if (existing) {
      existing.qty += qty;
      existing.revenue += rev;
    } else {
      aggMap.set(pid, {
        sku: it.product.sku,
        name: it.product.name,
        category: it.product.category?.name || "—",
        unit: it.product.unit?.symbol || "",
        costPrice: cost,
        qty,
        revenue: rev,
      });
    }
  }

  return Array.from(aggMap.entries())
    .map(([productId, val]) => {
      const cogs = val.qty * val.costPrice;
      const grossProfit = val.revenue - cogs;
      const marginPercent =
        val.revenue > 0 ? Math.round((grossProfit / val.revenue) * 10000) / 100 : 0;

      return {
        productId,
        sku: val.sku,
        productName: val.name,
        categoryName: val.category,
        unitSymbol: val.unit,
        quantitySold: Math.round(val.qty * 100) / 100,
        revenue: Math.round(val.revenue * 100) / 100,
        cogs: Math.round(cogs * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        marginPercent,
      };
    })
    .sort((a, b) => b.grossProfit - a.grossProfit);
}

// 8. HR Attendance Summary Report
export async function getHrAttendanceSummaryReport(
  filter: ReportDateFilter = {}
): Promise<HrAttendanceSummaryRow[]> {
  const { startDate, endDate } = parseDateRange(filter.from, filter.to);

  const employees = await db.employee.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      ...(filter.departmentId ? { departmentId: filter.departmentId } : {}),
      ...(filter.search
        ? {
          OR: [
            { fullName: { contains: filter.search, mode: "insensitive" } },
            { code: { contains: filter.search, mode: "insensitive" } },
          ],
        }
        : {}),
    },
    take: 200,
    include: {
      department: { select: { name: true } },
      position: { select: { title: true } },
      attendances: {
        where: {
          date: { gte: startDate, lte: endDate },
        },
        select: { status: true },
      },
    },
  });

  return employees.map((emp) => {
    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let leaveDays = 0;

    for (const att of emp.attendances) {
      if (att.status === "PRESENT") presentDays++;
      else if (att.status === "ABSENT") absentDays++;
      else if (att.status === "LATE") lateDays++;
      else if (att.status === "ON_LEAVE" || att.status === "HALF_DAY") leaveDays++;
    }

    const totalWorkingDays = emp.attendances.length || 1;
    const attendanceRate =
      Math.round(((presentDays + lateDays) / totalWorkingDays) * 1000) / 10;

    return {
      employeeId: emp.id,
      employeeCode: emp.code,
      employeeName: emp.fullName,
      departmentName: emp.department?.name || "—",
      positionTitle: emp.position?.title || "—",
      totalWorkingDays: emp.attendances.length,
      presentDays,
      absentDays,
      lateDays,
      leaveDays,
      attendanceRate,
    };
  });
}
