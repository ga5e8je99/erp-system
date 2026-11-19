"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useLocale } from "next-intl";
import {
  Database,
  Cloud,
  Terminal,
  ShieldCheck,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export function BackupTab() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const [copiedSnippet, setCopiedSnippet] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    toast.success(isArabic ? "تم نسخ الأمر إلى الحافظة" : "Command copied to clipboard");
    setTimeout(() => setCopiedSnippet(null), 2500);
  };

  const backupCommand = `pg_dump -h localhost -U masar -d masar_erp | gzip > masar_backup_$(date +%Y%m%d_%H%M%S).sql.gz`;
  const restoreCommand = `gunzip -c masar_backup_YYYYMMDD_HHMMSS.sql.gz | psql -h localhost -U masar -d masar_erp`;
  const cronSnippet = `0 2 * * * pg_dump -h localhost -U masar -d masar_erp | gzip > /backups/masar_$(date +\\%F).sql.gz && gsutil cp /backups/masar_$(date +\\%F).sql.gz gs://masar-erp-backups/daily/`;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="border-b pb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Database className="size-4 text-primary" />
          {isArabic ? "دليل واستراتيجية النسخ الاحتياطي (Backup & Disaster Recovery)" : "Database Backup & Disaster Recovery Guide"}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isArabic
            ? "إرشادات إدارة النسخ الاحتياطية لقاعدة بيانات PostgreSQL والربط مع التخزين السحابي"
            : "Production database snapshot procedures, automated cron schedules, and cloud archiving"}
        </p>
      </div>

      {/* Advisory Banner */}
      <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex gap-3 items-start">
        <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            {isArabic ? "ملاحظة أمان هامة حول النسخ الاحتياطي" : "Important Security Advisory"}
          </p>
          <p className="text-amber-800/90 dark:text-amber-300/80 leading-relaxed text-[11px]">
            {isArabic
              ? "يحتوي نظام Masar ERP على سجلات مالية وحسابات موظفين حساسة. احرص على تشفير ملفات النسخ الاحتياطي عند النقل والتخزين، وحفظ نسخة خارجية معزولة (Offsite Backup) واختبار إجراءات الاستعادة دورياً للتأكد من سلامة البيانات."
              : "Masar ERP stores critical financial and payroll data. Ensure backup archives are encrypted both at rest and in transit, archived to isolated offsite storage, and test restores quarterly to verify archive integrity."}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Manual Backup Command */}
        <div className="p-4 rounded-xl border bg-muted/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="size-4 text-muted-foreground" />
              <span className="text-xs font-semibold">
                {isArabic ? "1. إنشاء نسخة احتياطية فورية (pg_dump مضغوط)" : "1. On-Demand Compressed Backup"}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => copyToClipboard(backupCommand, "backup")}
            >
              {copiedSnippet === "backup" ? (
                <>
                  <Check className="size-3 text-emerald-600" />
                  <span>{isArabic ? "تم النسخ" : "Copied"}</span>
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  <span>{isArabic ? "نسخ الأمر" : "Copy"}</span>
                </>
              )}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {isArabic
              ? "يقوم هذا الأمر بتصدير كامل قاعدة البيانات بهيكلها وجداولها وبياناتها وضغطها بصيغة gzip."
              : "Generates a full transactional schema and data dump compressed with gzip."}
          </p>
          <pre className="p-3 bg-zinc-950 text-zinc-100 rounded-lg text-xs font-mono overflow-x-auto select-all">
            {backupCommand}
          </pre>
        </div>

        {/* Restore Command */}
        <div className="p-4 rounded-xl border bg-muted/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span className="text-xs font-semibold">
                {isArabic ? "2. استعادة قاعدة البيانات من ملف مضغوط" : "2. Database Restore from Archive"}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => copyToClipboard(restoreCommand, "restore")}
            >
              {copiedSnippet === "restore" ? (
                <>
                  <Check className="size-3 text-emerald-600" />
                  <span>{isArabic ? "تم النسخ" : "Copied"}</span>
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  <span>{isArabic ? "نسخ الأمر" : "Copy"}</span>
                </>
              )}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {isArabic
              ? "فك الضغط واستعادة كافة الجداول والقيود في قاعدة البيانات المحددة."
              : "Decompresses and feeds the SQL stream directly into the target PostgreSQL database."}
          </p>
          <pre className="p-3 bg-zinc-950 text-zinc-100 rounded-lg text-xs font-mono overflow-x-auto select-all">
            {restoreCommand}
          </pre>
        </div>

        {/* Cron Job Automation */}
        <div className="p-4 rounded-xl border bg-muted/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="size-4 text-sky-600" />
              <span className="text-xs font-semibold">
                {isArabic ? "3. جدولة يومية آلية مع التخزين السحابي (Cron & Cloud Sync)" : "3. Automated Daily Cron & Cloud Sync"}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => copyToClipboard(cronSnippet, "cron")}
            >
              {copiedSnippet === "cron" ? (
                <>
                  <Check className="size-3 text-emerald-600" />
                  <span>{isArabic ? "تم النسخ" : "Copied"}</span>
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  <span>{isArabic ? "نسخ الأمر" : "Copy"}</span>
                </>
              )}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {isArabic
              ? "مهمة مجدولة يومياً الساعة 02:00 صباحاً تقوم بالنسخ ورفع الأرشيف إلى Google Cloud Storage أو AWS S3."
              : "Configures a nightly 02:00 AM snapshot with automatic synchronization to remote cloud storage."}
          </p>
          <pre className="p-3 bg-zinc-950 text-zinc-100 rounded-lg text-xs font-mono overflow-x-auto select-all">
            {cronSnippet}
          </pre>
        </div>

        {/* RPO / RTO Recommendations */}
        <div className="p-4 rounded-xl border bg-muted/10 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <h4 className="font-semibold text-foreground">
              {isArabic ? "نقطة الاستعادة المستهدفة (RPO)" : "Recovery Point Objective (RPO)"}
            </h4>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              {isArabic
                ? "يُنصح بجدولة تفريغ يومي في أوقات انخفاض النشاط (Midnight)، مع تفعيل Write-Ahead Log (WAL) archiving لقواعد البيانات الكبيرة للوصول لـ Point-in-time Recovery."
                : "Nightly snapshots supplemented with WAL archiving enable Point-in-Time Recovery with sub-hour RPO."}
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-foreground">
              {isArabic ? "زمن الاستعادة المستهدف (RTO)" : "Recovery Time Objective (RTO)"}
            </h4>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              {isArabic
                ? "في بيئة الحاويات Docker، يتم تهيئة قاعدة بيانات جديدة وتشغيل سكريبت الاستعادة في أقل من 5 دقائق."
                : "In a containerized environment, spinning up a fresh database container and piping the backup completes in < 5 minutes."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
