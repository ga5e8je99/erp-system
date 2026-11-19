import React from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, ArrowLeft, ArrowRight, Mail } from "lucide-react";

interface ForgotPasswordPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ForgotPasswordPage({ params }: ForgotPasswordPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("auth");
  const tCommon = await getTranslations("common");
  const isArabic = locale === "ar";
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/20 p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Building2 className="h-6 w-6" />
        </div>
        <span className="text-xl font-bold tracking-tight">{tCommon("appName")}</span>
      </div>

      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="space-y-1 text-start">
          <CardTitle className="text-xl font-bold">{t("forgotPasswordTitle")}</CardTitle>
          <CardDescription className="text-sm">
            {t("forgotPasswordDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4" action="/login">
            <div className="space-y-2 text-start">
              <Label htmlFor="email">{t("emailLabel")}</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  required
                />
                <Mail className="absolute end-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <Button type="submit" className="w-full">
              {t("sendResetLink")}
            </Button>
          </form>

          <div className="pt-2 text-center">
            <Button asChild variant="link" size="sm" className="gap-2">
              <Link href="/login">
                <BackIcon className="h-4 w-4" />
                <span>{t("backToLogin")}</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
