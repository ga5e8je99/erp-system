"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";
import { productCsvRowSchema, type ProductCsvRow } from "../schemas/inventory";
import { importProductsCsvAction } from "../actions/products";

interface ProductCsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ParsedRowResult {
  rowNum: number;
  data: Partial<ProductCsvRow>;
  isValid: boolean;
  errors: string[];
}

export function ProductCsvImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: ProductCsvImportDialogProps) {
  const t = useTranslations("inventory.csv");
  const tCommon = useTranslations("common");
  const [file, setFile] = React.useState<File | null>(null);
  const [rows, setRows] = React.useState<ParsedRowResult[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);

  const resetState = () => {
    setFile(null);
    setRows([]);
    setIsProcessing(false);
    setIsImporting(false);
  };

  React.useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  const parseCsvText = (text: string) => {
    setIsProcessing(true);
    try {
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        toast.error("الملف لا يحتوي على صفوف بيانات / CSV contains no data rows");
        setIsProcessing(false);
        return;
      }

      // Read header
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));
      const parsedResults: ParsedRowResult[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Split by comma ignoring commas inside quotes
        const values: string[] = [];
        let inQuote = false;
        let cur = "";

        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"' || char === "'") {
            inQuote = !inQuote;
          } else if (char === "," && !inQuote) {
            values.push(cur.trim().replace(/^["']|["']$/g, ""));
            cur = "";
          } else {
            cur += char;
          }
        }
        values.push(cur.trim().replace(/^["']|["']$/g, ""));

        const rowObj: Record<string, unknown> = {};
        headers.forEach((header, idx) => {
          rowObj[header] = values[idx] || undefined;
        });

        // Parse with Zod
        const parsed = productCsvRowSchema.safeParse(rowObj);
        if (parsed.success) {
          parsedResults.push({
            rowNum: i + 1,
            data: parsed.data,
            isValid: true,
            errors: [],
          });
        } else {
          const fieldErrors = parsed.error.flatten().fieldErrors;
          const errorMsgs = Object.entries(fieldErrors).map(
            ([field, msgs]) => `${field}: ${msgs?.join(", ")}`
          );
          parsedResults.push({
            rowNum: i + 1,
            data: rowObj as Partial<ProductCsvRow>,
            isValid: false,
            errors: errorMsgs,
          });
        }
      }

      setRows(parsedResults);
    } catch {
      toast.error("فشل قراءة ملف CSV. تأكد من سلامة التنسيق");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseCsvText(content);
    };
    reader.readAsText(selected);
  };

  const downloadSampleTemplate = () => {
    const csvContent =
      "name,sku,barcode,categoryName,unitName,costPrice,salePrice,taxRate,reorderLevel,initialStock,warehouseCode\n" +
      '"شاحن مكتبي 45W","EL-007","6221234567891","إلكترونيات وملحقات","قطعة",200,320,14,10,50,"WH-MAIN"\n' +
      '"ورق طباعة ممتاز A4","ST-006","","أدوات وقرطاسية مكتبية","كرتونة",450,600,14,15,30,"WH-MAIN"\n';

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "masar_products_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validRows = rows.filter((r) => r.isValid).map((r) => r.data as ProductCsvRow);
  const invalidRowsCount = rows.filter((r) => !r.isValid).length;

  const handleCommit = async () => {
    if (validRows.length === 0) return;
    setIsImporting(true);

    try {
      const res = await importProductsCsvAction(validRows);
      if (res.ok) {
        toast.success(t("importSuccess", { count: res.data.importedCount }));
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(res.error);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon("error"));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {t("importTitle")}
          </DialogTitle>
          <DialogDescription>{t("importDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 flex-1 overflow-y-auto">
          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/30 border rounded-lg">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={downloadSampleTemplate}
              >
                <Download className="h-4 w-4" />
                {t("downloadTemplate")}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Label
                htmlFor="csv-upload"
                className="cursor-pointer inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Upload className="h-4 w-4" />
                {file ? file.name : t("chooseFile")}
              </Label>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Preview Area */}
          {rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">{t("previewTitle")}</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-50/50">
                    <CheckCircle2 className="me-1 h-3 w-3" />
                    {t("validRows", { count: validRows.length })}
                  </Badge>
                  {invalidRowsCount > 0 && (
                    <Badge variant="destructive">
                      <AlertCircle className="me-1 h-3 w-3" />
                      {t("invalidRows", { count: invalidRowsCount })}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="border rounded-md overflow-x-auto max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الاسم</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>الوحدة</TableHead>
                      <TableHead>التكلفة</TableHead>
                      <TableHead>سعر البيع</TableHead>
                      <TableHead>الرصيد</TableHead>
                      <TableHead>المستودع</TableHead>
                      <TableHead>الملاحظات / الأخطاء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow
                        key={r.rowNum}
                        className={!r.isValid ? "bg-destructive/5" : undefined}
                      >
                        <TableCell className="font-mono text-xs">{r.rowNum}</TableCell>
                        <TableCell>
                          {r.isValid ? (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                              سليم
                            </Badge>
                          ) : (
                            <Badge variant="destructive">خطأ</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{r.data.name || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{r.data.sku || "(تلقائي)"}</TableCell>
                        <TableCell>{r.data.unitName || "—"}</TableCell>
                        <TableCell>{r.data.costPrice ?? 0}</TableCell>
                        <TableCell>{r.data.salePrice ?? 0}</TableCell>
                        <TableCell>{r.data.initialStock ?? 0}</TableCell>
                        <TableCell>{r.data.warehouseCode || "(الافتراضي)"}</TableCell>
                        <TableCell className="text-xs text-destructive">
                          {r.errors.join("; ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isImporting}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleCommit}
            disabled={isImporting || isProcessing || validRows.length === 0}
            className="gap-2"
          >
            {isImporting ? t("importing") : t("confirmImport")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
