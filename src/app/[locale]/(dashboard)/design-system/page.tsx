import React from "react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { DesignSystemView } from "@/features/design-system/components/design-system-view";

interface DesignSystemPageProps {
  params: Promise<{ locale: string }>;
}

export default async function DesignSystemPage({
  params,
}: DesignSystemPageProps) {
  // Dev-only leftover: return 404 in production
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { locale } = await params;
  setRequestLocale(locale);

  return <DesignSystemView />;
}
