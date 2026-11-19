import { SalesQuotationStatus, SalesOrderStatus, SalesInvoiceStatus, PaymentMethod } from "@prisma/client";
import type { getCustomerById } from "../queries/customers";

export type CustomerWithCounts = {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxNumber: string | null;
  creditLimit: number;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  _count: {
    invoices: number;
    orders: number;
    quotations: number;
    payments: number;
  };
};

export type CustomerDetailPayload = NonNullable<Awaited<ReturnType<typeof getCustomerById>>>;

export type StatementOfAccountEntry = {
  id: string;
  date: Date;
  type: "INVOICE" | "PAYMENT" | "RETURN";
  referenceNumber: string;
  description: string;
  debit: number; // Charges to customer (Invoices)
  credit: number; // Reductions (Payments, Returns)
  runningBalance: number;
};

export type SalesQuotationPayload = {
  id: string;
  quotationNumber: string;
  customerId: string;
  status: SalesQuotationStatus;
  issueDate: Date;
  expiryDate: Date | null;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: string;
    code: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  orders: {
    id: string;
    orderNumber: string;
    status: SalesOrderStatus;
    total: number;
  }[];
  items: {
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
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

export type SalesOrderPayload = {
  id: string;
  orderNumber: string;
  customerId: string;
  quotationId: string | null;
  status: SalesOrderStatus;
  issueDate: Date;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: string;
    code: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  quotation?: {
    id: string;
    quotationNumber: string;
  } | null;
  invoices: {
    id: string;
    invoiceNumber: string;
    status: SalesInvoiceStatus;
    total: number;
    paidAmount: number;
  }[];
  items: {
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    product: {
      id: string;
      name: string;
      sku: string;
      costPrice?: number;
      unit?: { symbol: string } | null;
    };
  }[];
};

export type SalesInvoicePayload = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  orderId: string | null;
  status: SalesInvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: string;
    code: string;
    name: string;
    taxNumber: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
  };
  order?: {
    id: string;
    orderNumber: string;
  } | null;
  payments: {
    id: string;
    paymentNumber: string;
    amount: number;
    date: Date;
    method: PaymentMethod;
    reference: string | null;
  }[];
  returns: {
    id: string;
    returnNumber: string;
    total: number;
    subtotal: number;
    tax: number;
    status: string;
    createdAt: Date;
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
