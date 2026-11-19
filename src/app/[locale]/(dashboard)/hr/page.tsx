import { redirect } from "next/navigation";

interface HrIndexProps {
  params: Promise<{ locale: string }>;
}

export default async function HrIndexPage({ params }: HrIndexProps) {
  const { locale } = await params;
  redirect(`/${locale}/hr/employees`);
}
