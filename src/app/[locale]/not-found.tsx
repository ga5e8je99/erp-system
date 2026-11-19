import React from "react";
import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl border bg-card shadow-sm animate-in fade-in-50 duration-200">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-8 ring-primary/5">
          <FileQuestion className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-muted font-mono text-xs font-bold text-primary">
            404
          </span>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            الصفحة غير موجودة | Page Not Found
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            عذراً، الصفحة أو المستند الذي تحاول الوصول إليه غير موجود أو تم نقله.
            <br />
            Sorry, the page or resource you are looking for does not exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <Button asChild size="sm" className="w-full sm:w-auto text-xs gap-1.5">
            <Link href="/ar/dashboard">
              <span>الذهاب للوحة التحكم (عربي)</span>
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto text-xs gap-1.5">
            <Link href="/en/dashboard">
              <span>Go to Dashboard (EN)</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
