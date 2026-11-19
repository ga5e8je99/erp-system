import React from "react";
import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function RootNotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 antialiased">
        <div className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl border bg-card shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 ring-8 ring-teal-500/5">
            <FileQuestion className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-muted font-mono text-xs font-bold text-teal-700">
              404
            </span>
            <h2 className="text-xl font-bold tracking-tight">
              الصفحة غير موجودة | Page Not Found
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              تعذر العثور على المسار المطلوب في نظام مسار لإدارة الموارد.
              <br />
              Requested URL was not found in Masar ERP.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
            <Link
              href="/ar/dashboard"
              className="inline-flex items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800 transition-colors w-full sm:w-auto"
            >
              الذهاب للوحة التحكم
            </Link>
            <Link
              href="/en/dashboard"
              className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-xs font-medium hover:bg-accent transition-colors w-full sm:w-auto"
            >
              Go to Dashboard (EN)
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
