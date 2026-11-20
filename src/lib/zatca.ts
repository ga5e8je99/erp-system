import QRCode from "qrcode";

/**
 * Standard ZATCA (Saudi Zakat, Tax and Customs Authority) E-Invoicing Phase 1/2 TLV encoder.
 * Tag 1: Seller's Name
 * Tag 2: VAT Registration Number
 * Tag 3: Time Stamp (ISO 8601)
 * Tag 4: Invoice Total (with VAT)
 * Tag 5: VAT Total
 */
export function generateZatcaTLV(
  sellerName: string,
  vatNumber: string,
  timestamp: string | Date,
  invoiceTotal: string | number,
  vatTotal: string | number
): string {
  const dateStr =
    typeof timestamp === "string"
      ? timestamp
      : timestamp instanceof Date
      ? timestamp.toISOString()
      : new Date().toISOString();

  const totalStr = Number(invoiceTotal || 0).toFixed(2);
  const vatStr = Number(vatTotal || 0).toFixed(2);

  function toTLV(tag: number, value: string): Buffer {
    const buf = Buffer.from(value, "utf-8");
    return Buffer.concat([Buffer.from([tag, buf.length]), buf]);
  }

  const parts = [
    toTLV(1, sellerName || "شركة مسار للتجارة والتوزيع ذ.م.م"),
    toTLV(2, vatNumber || "300098765400003"),
    toTLV(3, dateStr),
    toTLV(4, totalStr),
    toTLV(5, vatStr),
  ];

  return Buffer.concat(parts).toString("base64");
}

export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 256,
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });
}
