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
import { AlertCircle, Loader2, KeyRound, Eye, EyeOff } from "lucide-react";

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || `/${locale}/dashboard`;

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
        setErrorMessage(t("serverError"));
        setIsLoading(false);
        return;
      }

      if (result.status && result.status >= 500) {
        setErrorMessage(t("serverError"));
        setIsLoading(false);
        return;
      }

      if (result.error) {
        const err = String(result.error || "");
        const code = String(result.code || "");
        if (
          err.includes("RATE_LIMITED") ||
          code.includes("rate_limited") ||
          code.includes("rate-limited")
        ) {
          const match = err.match(/RATE_LIMITED:(\d+)/i) || code.match(/(\d+)/);
          const seconds = match ? parseInt(match[1], 10) : 60;
          setErrorMessage(t("rateLimitedWithTime", { seconds }));
        } else if (
          result.status === 401 ||
          err === "CredentialsSignin" ||
          code === "credentials"
        ) {
          setErrorMessage(t("invalidCredentials"));
        } else {
          setErrorMessage(t("serverError"));
        }
        setIsLoading(false);
        return;
      }

      // Success: full navigation ensures server components pick up the new session cookie immediately
      window.location.href = callbackUrl;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("RATE_LIMITED")) {
        const match = msg.match(/RATE_LIMITED:(\d+)/i);
        const seconds = match ? parseInt(match[1], 10) : 60;
        setErrorMessage(t("rateLimitedWithTime", { seconds }));
      } else {
        setErrorMessage(t("serverError"));
      }
      setIsLoading(false);
    }
  };

  const isDev = process.env.NODE_ENV !== "production";

  const handleFillDemo = isDev
    ? () => {
        setValue("email", "admin@masar.local", { shouldValidate: true });
      }
    : undefined;

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-start">
        <h1 className="text-2xl font-bold tracking-tight">{t("loginTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("loginSubtitle")}</p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive animate-in fade-in-50 duration-200"
        >
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
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder={t("passwordPlaceholder")}
              disabled={isLoading}
              className="pe-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded p-1"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
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

      {/* Demo Credentials Helper Box (Local development only) */}
      {isDev && handleFillDemo && (
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
              {t("autoFill")}
            </Button>
          </div>
          <div className="mt-2 space-y-1 font-mono text-muted-foreground">
            <div>
              {t("emailLabel")}: <span className="text-foreground">admin@masar.local</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
