import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type SequenceType =
  | "INVOICE"
  | "ORDER"
  | "QUOTATION"
  | "PURCHASE_ORDER"
  | "GOODS_RECEIPT"
  | "PURCHASE_INVOICE"
  | "CUSTOMER_PAYMENT"
  | "SUPPLIER_PAYMENT"
  | "SALES_RETURN"
  | "PURCHASE_RETURN"
  | "JOURNAL_ENTRY"
  | "EXPENSE"
  | "PAYROLL";

export interface GenerateNumberOptions {
  type: SequenceType | string;
  prefix?: string;
  year?: number;
  padding?: number;
  tx?: Prisma.TransactionClient;
}

const DEFAULT_PREFIXES: Record<string, string> = {
  INVOICE: "INV",
  ORDER: "SO",
  QUOTATION: "QTN",
  PURCHASE_ORDER: "PO",
  GOODS_RECEIPT: "GR",
  PURCHASE_INVOICE: "PINV",
  CUSTOMER_PAYMENT: "CPAY",
  SUPPLIER_PAYMENT: "SPAY",
  SALES_RETURN: "SRTN",
  PURCHASE_RETURN: "PRTN",
  JOURNAL_ENTRY: "JRN",
  JRN: "JRN",
  INV: "INV",
  SO: "SO",
  QUO: "QTN",
  PAY: "PAY",
  RTN: "RTN",
  EXPENSE: "EXP",
  PAYROLL: "PAY",
};

const TYPE_ALIASES: Record<string, string> = {
  JOURNAL_ENTRY: "JRN",
};

/**
 * Generates an atomic sequential document number (e.g., INV-2026-00001).
 * Can be run standalone or passed an existing Prisma transaction client `tx`.
 */
export async function getNextDocumentNumber(
  options: GenerateNumberOptions
): Promise<string> {
  const normalizedType = TYPE_ALIASES[options.type] ?? options.type;
  const year = options.year ?? new Date().getFullYear();
  const prefix =
    options.prefix ??
    DEFAULT_PREFIXES[normalizedType] ??
    DEFAULT_PREFIXES[options.type] ??
    normalizedType.substring(0, 3).toUpperCase();
  const padding = options.padding ?? 5;

  const execute = async (client: Prisma.TransactionClient) => {
    const sequence = await client.documentSequence.upsert({
      where: {
        type_year: {
          type: normalizedType,
          year,
        },
      },
      update: {
        nextNumber: {
          increment: 1,
        },
      },
      create: {
        type: normalizedType,
        prefix,
        year,
        padding,
        nextNumber: 2, // 1 is consumed immediately
      },
    });

    const currentNumber = sequence.nextNumber - 1;
    const formattedNumber = String(currentNumber).padStart(sequence.padding || padding, "0");

    return `${sequence.prefix}-${year}-${formattedNumber}`;
  };

  if (options.tx) {
    return execute(options.tx);
  }

  return db.$transaction(async (tx) => {
    return execute(tx);
  });
}
