import { NextResponse, NextRequest } from "next/server";
import NextAuth from "next-auth";
import createMiddleware from "next-intl/middleware";
import { routing, type Locale } from "./i18n/routing";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);
const intlMiddleware = createMiddleware(routing);

const PUBLIC_PAGES = ["/login", "/forgot-password", "/forbidden"];

export default auth(async function middleware(req) {
  // Generate a cryptographically random nonce per request
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV !== "production";

  // Content Security Policy:
  // - In development: 'unsafe-eval' allowed for Next.js Fast Refresh/HMR
  // - In production: 'unsafe-eval' strictly removed
  // - Per-request nonce in script-src with 'strict-dynamic' to execute authorized scripts
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ""}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; ");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const { pathname } = req.nextUrl;

  const pathnameSegments = pathname.split("/").filter(Boolean);
  const maybeLocale = pathnameSegments[0];
  const isLocale = routing.locales.includes(maybeLocale as Locale);
  const locale = isLocale ? maybeLocale : routing.defaultLocale;
  const pathWithoutLocale = isLocale
    ? "/" + pathnameSegments.slice(1).join("/")
    : pathname;

  const isPublicPage =
    PUBLIC_PAGES.some(
      (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(p + "/")
    ) ||
    pathWithoutLocale === "/" ||
    pathname.startsWith("/api/auth");

  // Real Edge-compatible session validation from decrypted/verified Auth.js JWT
  const isAuthenticated = Boolean(req.auth?.user);

  // If user is authenticated and visits login, redirect to dashboard
  if (
    isAuthenticated &&
    (pathWithoutLocale === "/login" || pathWithoutLocale === "/forgot-password")
  ) {
    const dashboardUrl = new URL(`/${locale}/dashboard`, req.url);
    const redirectRes = NextResponse.redirect(dashboardUrl);
    redirectRes.headers.set("Content-Security-Policy", cspHeader);
    return redirectRes;
  }

  // If user is unauthenticated and visits a protected route, redirect to login with callbackUrl
  if (!isAuthenticated && !isPublicPage) {
    const loginUrl = new URL(`/${locale}/login`, req.url);
    loginUrl.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
    const redirectRes = NextResponse.redirect(loginUrl);
    redirectRes.headers.set("Content-Security-Policy", cspHeader);
    return redirectRes;
  }

  // Delegate to next-intl middleware with request headers containing nonce & CSP
  const response = intlMiddleware(
    new NextRequest(req, {
      headers: requestHeaders,
    })
  );

  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("x-nonce", nonce);

  return response;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
