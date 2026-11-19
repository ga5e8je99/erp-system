"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComboboxAsync, ComboboxOption } from "@/components/shared/combobox-async";
import {
  SalesLineItemsEditor,
  type SalesLineItemState,
} from "./sales-line-items-editor";
import { calculateDocumentTotals } from "../services/sales-calculations";
import {
  createInvoiceAction,
  updateInvoiceAction,
} from "../actions/invoices";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

interface CustomerMeta {
  balance: number;
  creditLimit: number;
}

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: { id: string; name: string; code: string }[];
  initialCustomerId?: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    customerId: string;
    customer: { id: string; name: string; balance?: number; creditLimit?: number };
    warehouseId?: string;
    issueDate: Date | string;
    dueDate: Date | string;
    discount?: number;
    notes?: string | null;
    items: {
      id?: string;
      productId: string;
      product?: { name: string; sku: string; unit?: { symbol: string } };
      quantity: number;
      unitPrice: number;
      discount?: number;
      taxRate: number;
    }[];
  } | null;
  onSuccess?: () => void;
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  warehouses,
  initialCustomerId,
  invoice,
  onSuccess,
}: InvoiceFormDialogProps) {
  const t = useTranslations("sales.invoices");
  const tConfirm = useTranslations("confirm");
  const isEditing = Boolean(invoice?.id);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = React.useState(false);

  const [customerId, setCustomerId] = React.useState(
    invoice?.customerId || initialCustomerId || ""
  );
  const [customerOption, setCustomerOption] = React.useState<ComboboxOption | undefined>(
    invoice?.customer
      ? { value: invoice.customer.id, label: invoice.customer.name }
      : undefined
  );
  const [customerMeta, setCustomerMeta] = React.useState<CustomerMeta | null>(null);

  const [warehouseId, setWarehouseId] = React.useState(
    invoice?.warehouseId || warehouses[0]?.id || ""
  );

  const [issueDate, setIssueDate] = React.useState(
    invoice?.issueDate
      ? new Date(invoice.issueDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );

  const [dueDate, setDueDate] = React.useState(
    invoice?.dueDate
      ? new Date(invoice.dueDate).toISOString().split("T")[0]
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  const [invoiceDiscount, setInvoiceDiscount] = React.useState<number>(
    invoice?.discount ? Number(invoice.discount) : 0
  );

  const [notes, setNotes] = React.useState(invoice?.notes || "");
  const [items, setItems] = React.useState<SalesLineItemState[]>([]);

  React.useEffect(() => {
    if (open) {
      setCustomerId(invoice?.customerId || initialCustomerId || "");
      setCustomerOption(
        invoice?.customer
          ? { value: invoice.customer.id, label: invoice.customer.name }
          : undefined
      );
      setWarehouseId(invoice?.warehouseId || warehouses[0]?.id || "");
      setIssueDate(
        invoice?.issueDate
          ? new Date(invoice.issueDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setDueDate(
        invoice?.dueDate
          ? new Date(invoice.dueDate).toISOString().split("T")[0]
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      );
      setInvoiceDiscount(invoice?.discount ? Number(invoice.discount) : 0);
      setNotes(invoice?.notes || "");

      if (invoice?.items && invoice.items.length > 0) {
        setItems(
          invoice.items.map((it, idx) => ({
            id: it.id || `item-${idx}`,
            productId: it.productId,
            productName: it.product?.name || "",
            sku: it.product?.sku || "",
            unitSymbol: it.product?.unit?.symbol || "",
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            discount: Number(it.discount || 0),
            taxRate: Number(it.taxRate),
          }))
        );
      } else {
        setItems([]);
      }
    }
  }, [open, invoice, initialCustomerId, warehouses]);

  // Load customer options from API
  const loadCustomerOptions = React.useCallback(
    async (query: string): Promise<ComboboxOption[]> => {
      try {
        const res = await fetch(`/api/sales/customers/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.items || []).map(
          (c: {
            id: string;
            name: string;
            code: string;
            balance: number;
            creditLimit: number;
          }) => ({
            value: c.id,
            label: `${c.name} (${c.code})`,
            rawMeta: {
              balance: Number(c.balance),
              creditLimit: Number(c.creditLimit),
            },
          })
        );
      } catch {
        return [];
      }
    },
    []
  );

  // Compute live invoice total
  const totals = React.useMemo(() => {
    return calculateDocumentTotals({
      invoiceDiscount,
      items: items.map((i) => ({
        quantity: Number(i.quantity) || 0,
        unitPrice: Number(i.unitPrice) || 0,
        discount: Number(i.discount) || 0,
        taxRate: Number(i.taxRate) ?? 14,
      })),
    });
  }, [items, invoiceDiscount]);

  // Check credit limit warning
  const isCreditLimitWarning = React.useMemo(() => {
    if (!customerMeta) return false;
    const limit = customerMeta.creditLimit;
    if (limit <= 0) return false;
    return customerMeta.balance + totals.total > limit;
  }, [customerMeta, totals.total]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      toast.error("يرجى اختيار العميل أولاً");
      return;
    }

    if (!warehouseId) {
      toast.error("يرجى تحديد مستودع الصرف");
      return;
    }

    if (items.length === 0) {
      toast.error("يجب إضافة صنف واحد على الأقل في الفاتورة");
      return;
    }

    for (const line of items) {
      if (!line.productId) {
        toast.error("يرجى تحديد المنتج لجميع البنود");
        return;
      }
      if (line.quantity <= 0) {
        toast.error("الكمية يجب أن تكون أكبر من صفر لجميع البنود");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId,
        warehouseId,
        issueDate,
        dueDate,
        discount: Number(invoiceDiscount) || 0,
        notes: notes || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          discount: Number(i.discount || 0),
          taxRate: Number(i.taxRate || 14),
        })),
      };

      if (isEditing && invoice?.id) {
        const res = await updateInvoiceAction(invoice.id, payload);
        if (res.ok) {
          toast.success("تم تحديث الفاتورة بنجاح");
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(res.error || "فشل تحديث الفاتورة");
        }
      } else {
        const res = await createInvoiceAction(payload);
        if (res.ok) {
          toast.success(`تم إنشاء الفاتورة ${res.data.invoiceNumber} بنجاح`);
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(res.error || "فشل إنشاء الفاتورة");
        }
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormDirty = React.useMemo(() => {
    if (isEditing) {
      return (
        customerId !== (invoice?.customerId || "") ||
        warehouseId !== (invoice?.warehouseId || warehouses[0]?.id || "") ||
        notes !== (invoice?.notes || "") ||
        invoiceDiscount !== (invoice?.discount ? Number(invoice.discount) : 0)
      );
    }
    return Boolean(customerId || items.length > 0 || notes.trim() || invoiceDiscount > 0);
  }, [isEditing, customerId, warehouseId, notes, invoiceDiscount, items.length, invoice, warehouses]);

  const handleRequestClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (isFormDirty) {
        setShowDiscardConfirm(true);
        return;
      }
      onOpenChange(false);
    } else {
      onOpenChange(true);
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleRequestClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("editInvoice") : t("addInvoice")}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `تعديل بنود الفاتورة ${invoice?.invoiceNumber}`
              : "إنشاء مسودة فاتورة مبيعات جديدة. لن يتم خصم المخزون أو ترحيل القيود إلا بعد اعتمادها وإصدارها."}
          </DialogDescription>
        </DialogHeader>

        {isCreditLimitWarning && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              تحذير: إجمالي رصيد العميل الحالي (
              {customerMeta?.balance.toLocaleString()} ر.س) بالإضافة لقيمة هذه الفاتورة (
              {totals.total.toLocaleString()} ر.س) سيتجاوز الحد الائتماني المحدد (
              {customerMeta?.creditLimit.toLocaleString()} ر.س).
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Header Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="invoice-customer">{t("customer")} *</Label>
              <ComboboxAsync
                id="invoice-customer"
                aria-label={t("customer")}
                value={customerId}
                onChange={(val, opt) => {
                  setCustomerId(val);
                  setCustomerOption(opt);
                  const meta = (opt as unknown as { rawMeta?: CustomerMeta })?.rawMeta;
                  if (meta) setCustomerMeta(meta);
                }}
                loadOptions={loadCustomerOptions}
                placeholder="اختر العميل..."
                initialOption={customerOption}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="invoice-warehouse">{t("warehouse")} *</Label>
              <Select
                value={warehouseId}
                onValueChange={(val) => {
                  if (val) setWarehouseId(val);
                }}
              >
                <SelectTrigger id="invoice-warehouse">
                  <SelectValue placeholder="اختر مستودع الصرف..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="invoice-issue-date">{t("issueDate")} *</Label>
              <Input
                id="invoice-issue-date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="invoice-due-date">{t("dueDate")} *</Label>
              <Input
                id="invoice-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Line Items Editor with Live Prices and Stock */}
          <SalesLineItemsEditor
            items={items}
            onChange={setItems}
            invoiceDiscount={invoiceDiscount}
            onInvoiceDiscountChange={setInvoiceDiscount}
          />

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="invoice-notes">{t("notes")}</Label>
            <Textarea
              id="invoice-notes"
              placeholder="الشروط، طريقة السداد، ملاحظات التسليم..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleRequestClose(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "جاري الحفظ..."
                : isEditing
                ? "حفظ التعديلات"
                : "إنشاء مسودة الفاتورة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={showDiscardConfirm}
      onOpenChange={setShowDiscardConfirm}
      title={tConfirm("unsavedChangesTitle")}
      description={tConfirm("unsavedChangesMessage")}
      confirmText={tConfirm("discard")}
      cancelText={tConfirm("continueEditing")}
      variant="destructive"
      onConfirm={handleConfirmDiscard}
    />
  </>
  );
}
