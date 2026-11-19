import React from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, ArrowLeft, ArrowRight } from "lucide-react";

interface ForbiddenPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ForbiddenPage({ params }: ForbiddenPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("forbidden");
  const isArabic = locale === "ar";
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="max-w-md text-center shadow-lg">
        <CardHeader className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold">{t("title")}</CardTitle>
          <CardDescription className="text-sm">
            {t("description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {t("contactAdmin")}
          </p>

          <Button asChild className="w-full gap-2">
            <Link href="/dashboard">
              <span>{t("backToDashboard")}</span>
              <ArrowIcon className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
