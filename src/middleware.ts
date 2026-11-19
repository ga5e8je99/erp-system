import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing, type Locale } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const PUBLIC_PAGES = ["/login", "/forgot-password", "/forbidden"];

export default async function middleware(req: NextRequest) {
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

  // Check session cookie
  const sessionToken =
    req.cookies.get("__Secure-authjs.session-token")?.value ||
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("next-auth.session-token")?.value;

  const isAuthenticated = Boolean(sessionToken);

  // If user is authenticated and visits login, redirect to dashboard
  if (
    isAuthenticated &&
    (pathWithoutLocale === "/login" || pathWithoutLocale === "/forgot-password")
  ) {
    const dashboardUrl = new URL(`/${locale}/dashboard`, req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // If user is unauthenticated and visits a protected route, redirect to login with callbackUrl
  if (!isAuthenticated && !isPublicPage) {
    const loginUrl = new URL(`/${locale}/login`, req.url);
    loginUrl.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // Delegate to next-intl middleware
  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
