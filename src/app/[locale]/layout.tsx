import type { Metadata } from "next";
import { Cairo, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Toaster } from "sonner";
import { routing, type Locale } from "@/i18n/routing";
import { AuthSessionProvider } from "@/components/shared/auth-session-provider";
import { ThemeProvider } from "@/components/shared/theme-provider";
import "@/app/globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Masar ERP - مسار",
  description: "Enterprise Resource Planning for Trading & Distribution",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const headerList = await headers();
  const nonce = headerList.get("x-nonce") ?? undefined;
  const isArabic = locale === "ar";
  const dir = isArabic ? "rtl" : "ltr";
  const activeFont = isArabic ? cairo : inter;

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${cairo.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body
        className={`${activeFont.className} min-h-screen bg-background text-foreground antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          nonce={nonce}
        >
          <AuthSessionProvider>
            <NextIntlClientProvider messages={messages}>
              {children}
              <Toaster
                position={isArabic ? "bottom-left" : "bottom-right"}
                richColors
                closeButton
              />
            </NextIntlClientProvider>
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
