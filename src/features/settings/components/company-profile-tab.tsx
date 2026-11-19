"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { FullCompanySettingsInput } from "../schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, Building2, Loader2 } from "lucide-react";
import { useLocale } from "next-intl";
import { toast } from "sonner";

interface CompanyProfileTabProps {
  form: UseFormReturn<FullCompanySettingsInput>;
}

export function CompanyProfileTab({ form }: CompanyProfileTabProps) {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const [isUploading, setIsUploading] = React.useState(false);

  const logoUrl = form.watch("logoUrl");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error(isArabic ? "حجم الملف يتجاوز 2 ميجابايت" : "File exceeds 2MB limit");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.ok && data.url) {
        form.setValue("logoUrl", data.url, { shouldDirty: true });
        toast.success(isArabic ? "تم رفع الشعار بنجاح" : "Logo uploaded successfully");
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch {
      toast.error(isArabic ? "حدث خطأ أثناء رفع الشعار" : "Error uploading logo");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Logo Upload Box */}
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl border-border bg-muted/20 text-center space-y-3">
          <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border bg-background shadow-xs">
            {logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoUrl}
                alt="Company Logo"
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <Building2 className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          <div>
            <Label
              htmlFor="logo-file-input"
              className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{isArabic ? "جاري الرفع..." : "Uploading..."}</span>
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  <span>{isArabic ? "رفع شعار الشركة" : "Upload Logo"}</span>
                </>
              )}
            </Label>
            <input
              id="logo-file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              PNG, JPG, WEBP • Max 2MB
            </p>
          </div>
          {logoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => form.setValue("logoUrl", null, { shouldDirty: true })}
              className="text-xs text-destructive h-7"
            >
              {isArabic ? "إزالة الشعار" : "Remove"}
            </Button>
          )}
        </div>

        {/* Company Fields */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs font-medium">
              {isArabic ? "اسم الشركة التجاري *" : "Company Trade Name *"}
            </Label>
            <Input
              {...form.register("name")}
              placeholder="شركة مسار للتجارة والتوزيع"
              className="text-xs h-9"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {isArabic ? "رقم السجل التجاري" : "Commercial Register"}
            </Label>
            <Input
              {...form.register("commercialRegister")}
              placeholder="1010123456"
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {isArabic ? "الرقم الضريبي (VAT / Tax ID)" : "Tax Number (VAT ID)"}
            </Label>
            <Input
              {...form.register("taxNumber")}
              placeholder="300123456700003"
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {isArabic ? "رقم الهاتف" : "Phone Number"}
            </Label>
            <Input
              {...form.register("phone")}
              placeholder="+20 100 000 0000"
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {isArabic ? "البريد الإلكتروني الرسمي" : "Email Address"}
            </Label>
            <Input
              type="email"
              {...form.register("email")}
              placeholder="info@masar-erp.com"
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {isArabic ? "الموقع الإلكتروني" : "Website URL"}
            </Label>
            <Input
              {...form.register("website")}
              placeholder="https://masar-erp.com"
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {isArabic ? "العنوان التجاري" : "Business Address"}
            </Label>
            <Input
              {...form.register("address")}
              placeholder="القاهرة، مصر"
              className="text-xs h-9"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
