export interface ReportDateFilter {
  from?: string;
  to?: string;
  search?: string;
  categoryId?: string;
  warehouseId?: string;
  departmentId?: string;
}

// 1. Sales by Customer
export interface SalesByCustomerRow {
  customerId: string;
  customerCode: string;
  customerName: string;
  phone?: string | null;
  invoiceCount: number;
  totalSales: number;
  totalPaid: number;
  balance: number;
}

// 2. Sales by Product
export interface SalesByProductRow {
  productId: string;
  sku: string;
  productName: string;
  categoryName: string;
  unitSymbol: string;
  quantitySold: number;
  totalSales: number;
  avgUnitPrice: number;
}

// 3. Sales by Salesperson (User)
export interface SalesBySalespersonRow {
  userId: string;
  userName: string;
  userEmail: string;
  invoiceCount: number;
  totalSales: number;
  avgInvoiceValue: number;
}

// 4. Purchases by Supplier
export interface PurchasesBySupplierRow {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  phone?: string | null;
  invoiceCount: number;
  totalPurchases: number;
  totalPaid: number;
  balance: number;
}

// 5. Inventory Valuation
export interface InventoryValuationRow {
  productId: string;
  sku: string;
  productName: string;
  categoryName: string;
  unitSymbol: string;
  currentStock: number;
  unitCost: number; // WAC
  totalValuation: number;
}

// 6. Stock Movement Summary
export interface StockMovementSummaryRow {
  productId: string;
  sku: string;
  productName: string;
  unitSymbol: string;
  openingStock: number;
  inQuantity: number;
  outQuantity: number;
  adjustmentQuantity: number;
  closingStock: number;
}

// 7. Profit by Product
export interface ProfitByProductRow {
  productId: string;
  sku: string;
  productName: string;
  categoryName: string;
  unitSymbol: string;
  quantitySold: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPercent: number;
}

// 8. HR Attendance Summary
export interface HrAttendanceSummaryRow {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  positionTitle: string;
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  attendanceRate: number;
}
