"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { loginSchema, type LoginInput } from "@/features/auth/schemas/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "@/i18n/routing";
import { AlertCircle, Loader2, KeyRound } from "lucide-react";

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || `/${locale}/dashboard`;

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

  const rememberMe = watch("rememberMe");

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
        callbackUrl,
      });

      if (!result) {
        setErrorMessage(t("invalidCredentials"));
        setIsLoading(false);
        return;
      }

      if (result.error) {
        if (result.error.includes("RATE_LIMITED") || result.code === "RATE_LIMITED") {
          setErrorMessage(t("rateLimited"));
        } else {
          setErrorMessage(t("invalidCredentials"));
        }
        setIsLoading(false);
        return;
      }

      // Success: full navigation ensures server components pick up the new session cookie immediately
      window.location.href = callbackUrl;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("RATE_LIMITED")) {
        setErrorMessage(t("rateLimited"));
      } else {
        setErrorMessage(t("invalidCredentials"));
      }
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setValue("email", "admin@masar.local", { shouldValidate: true });
    setValue("password", "Admin@12345", { shouldValidate: true });
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-start">
        <h1 className="text-2xl font-bold tracking-tight">{t("loginTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("loginSubtitle")}</p>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2 text-start">
          <Label htmlFor="email">{t("emailLabel")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            disabled={isLoading}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2 text-start">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("passwordLabel")}</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary underline-offset-4 hover:underline"
            >
              {t("forgotPassword")}
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder={t("passwordPlaceholder")}
            disabled={isLoading}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <Checkbox
              id="rememberMe"
              checked={rememberMe}
              onCheckedChange={(checked) => setValue("rememberMe", Boolean(checked))}
            />
            <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
              {t("rememberMe")}
            </Label>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
              {t("signingIn")}
            </>
          ) : (
            t("signInButton")
          )}
        </Button>
      </form>

      {/* Demo Credentials Helper Box */}
      <div className="rounded-lg border bg-muted/40 p-4 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-primary" />
            {t("demoCredentialsHint")}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleFillDemo}
            className="text-primary hover:text-primary/80"
          >
            Auto-fill
          </Button>
        </div>
        <div className="mt-2 space-y-1 font-mono text-muted-foreground">
          <div>
            Email: <span className="text-foreground">{t("demoCredentialsEmail")}</span>
          </div>
          <div>
            Password: <span className="text-foreground">{t("demoCredentialsPass")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
