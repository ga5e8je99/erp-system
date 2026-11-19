import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Briefcase } from "lucide-react";
import { getDepartments, getPositions } from "@/features/hr/services/department-service";
import { DepartmentsTable } from "@/features/hr/components/departments-table";
import { PositionsTable } from "@/features/hr/components/positions-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hr.departments");
  return {
    title: `${t("title")} | Masar ERP`,
    description: t("description"),
  };
}

export default async function DepartmentsPage() {
  await requirePermission("hr.department.manage");
  const t = await getTranslations("hr.departments");

  const [departments, positions] = await Promise.all([
    getDepartments(),
    getPositions(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      <Tabs defaultValue="departments" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="departments" className="gap-2">
            <Building2 className="h-4 w-4" />
            الأقسام الإدارية ({departments.length})
          </TabsTrigger>
          <TabsTrigger value="positions" className="gap-2">
            <Briefcase className="h-4 w-4" />
            المسميات الوظيفية ({positions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="space-y-4">
          <DepartmentsTable departments={departments} />
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <PositionsTable
            positions={positions}
            departments={departments.map((d) => ({ id: d.id, name: d.name }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
