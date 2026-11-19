import { redirect } from "@/i18n/routing";

export default async function SalesIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/sales/customers", locale });
}
