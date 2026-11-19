import {
  PurchaseOrderStatus,
  PurchaseInvoiceStatus,
  PurchaseReturnStatus,
  PaymentMethod,
} from "@prisma/client";
import type { getSupplierById } from "../queries/suppliers";

export type SupplierWithCounts = {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxNumber: string | null;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  _count: {
    orders: number;
    receipts: number;
    invoices: number;
    payments: number;
    returns: number;
  };
};

export type SupplierDetailPayload = NonNullable<
  Awaited<ReturnType<typeof getSupplierById>>
>;

export type SupplierStatementEntry = {
  id: string;
  date: Date;
  type: "INVOICE" | "PAYMENT" | "RETURN";
  referenceNumber: string;
  description: string;
  debit: number; // Payments, Returns (reduces liability to supplier)
  credit: number; // Invoices / Bills (increases liability to supplier)
  runningBalance: number;
};

export type PurchaseOrderPayload = {
  id: string;
  poNumber: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  issueDate: Date;
  expectedDate: Date | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  supplier: {
    id: string;
    code: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    taxNumber: string | null;
  };
  receipts: {
    id: string;
    receiptNumber: string;
    receiveDate: Date;
    _count?: { items: number };
  }[];
  invoices: {
    id: string;
    invoiceNumber: string;
    status: PurchaseInvoiceStatus;
    total: number;
  }[];
  items: {
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    product: {
      id: string;
      name: string;
      sku: string;
      costPrice: number;
      unit?: { symbol: string } | null;
    };
  }[];
};

export type GoodsReceiptPayload = {
  id: string;
  receiptNumber: string;
  poId: string | null;
  supplierId: string;
  warehouseId: string;
  receiveDate: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  supplier: {
    id: string;
    code: string;
    name: string;
  };
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
  po: {
    id: string;
    poNumber: string;
    status: PurchaseOrderStatus;
  } | null;
  items: {
    id: string;
    productId: string;
    quantity: number;
    unitCost: number;
    product: {
      id: string;
      name: string;
      sku: string;
      unit?: { symbol: string } | null;
    };
  }[];
};

export type PurchaseInvoicePayload = {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  poId: string | null;
  receiptId: string | null;
  status: PurchaseInvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  supplier: {
    id: string;
    code: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    taxNumber: string | null;
  };
  po: {
    id: string;
    poNumber: string;
  } | null;
  receipt: {
    id: string;
    receiptNumber: string;
  } | null;
  payments: {
    id: string;
    paymentNumber: string;
    amount: number;
    date: Date;
    method: PaymentMethod;
  }[];
  items: {
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    product: {
      id: string;
      name: string;
      sku: string;
      unit?: { symbol: string } | null;
    };
  }[];
};

export type SupplierPaymentPayload = {
  id: string;
  paymentNumber: string;
  supplierId: string;
  invoiceId: string | null;
  amount: number;
  method: PaymentMethod;
  date: Date;
  reference: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  supplier: {
    id: string;
    code: string;
    name: string;
  };
  invoice: {
    id: string;
    invoiceNumber: string;
    total: number;
    paidAmount: number;
  } | null;
};

export type PurchaseReturnPayload = {
  id: string;
  returnNumber: string;
  supplierId: string;
  invoiceId: string | null;
  warehouseId: string | null;
  status: PurchaseReturnStatus;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  supplier: {
    id: string;
    code: string;
    name: string;
  };
  invoice: {
    id: string;
    invoiceNumber: string;
  } | null;
  warehouse: {
    id: string;
    code: string;
    name: string;
  } | null;
  items: {
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    taxAmount: number;
    total: number;
    product: {
      id: string;
      name: string;
      sku: string;
      unit?: { symbol: string } | null;
    };
  }[];
};
