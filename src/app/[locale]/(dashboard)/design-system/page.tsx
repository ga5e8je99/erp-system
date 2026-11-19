import React from "react";
import { setRequestLocale } from "next-intl/server";
import { DesignSystemView } from "@/features/design-system/components/design-system-view";

interface DesignSystemPageProps {
  params: Promise<{ locale: string }>;
}

export default async function DesignSystemPage({
  params,
}: DesignSystemPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <DesignSystemView />;
}
