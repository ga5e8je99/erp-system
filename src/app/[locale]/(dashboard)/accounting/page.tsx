import { redirect } from "@/i18n/routing";

export default async function AccountingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/accounting/accounts", locale });
}
