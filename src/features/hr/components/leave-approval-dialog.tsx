"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LeaveRequestItem } from "../types";
import { LeaveStatus } from "@prisma/client";
import { approveOrRejectLeaveRequestAction } from "../actions/leave-actions";

interface LeaveApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: LeaveRequestItem | null;
  mode: "APPROVE" | "REJECT";
}

export function LeaveApprovalDialog({
  open,
  onOpenChange,
  request,
  mode,
}: LeaveApprovalDialogProps) {
  const router = useRouter();
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    setRejectionReason("");
  }, [open]);

  if (!request) return null;

  const handleSubmit = async () => {
    if (mode === "REJECT" && !rejectionReason.trim()) {
      toast.error("يرجى إدخال سبب رفض طلب الإجازة");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await approveOrRejectLeaveRequestAction({
        requestId: request.id,
        status: mode === "APPROVE" ? LeaveStatus.APPROVED : LeaveStatus.REJECTED,
        rejectionReason: mode === "REJECT" ? rejectionReason.trim() : null,
      });

      if (res.ok) {
        toast.success(
          mode === "APPROVE"
            ? "تم اعتماد طلب الإجازة بنجاح"
            : "تم رفض طلب الإجازة وتوثيق السبب"
        );
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(res.error || "فشل تنفيذ الإجراء");
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "APPROVE" ? "اعتماد طلب الإجازة" : "رفض طلب الإجازة"}
          </DialogTitle>
          <DialogDescription>
            {mode === "APPROVE"
              ? `هل أنت متأكد من اعتماد طلب إجازة "${request.leaveType.name}" للموظف ${request.employee.fullName}؟`
              : `يرجى تحديد سبب رفض طلب إجازة "${request.leaveType.name}" للموظف ${request.employee.fullName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 space-y-3">
          <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">الفترة:</span>
              <span className="font-mono">
                {new Date(request.startDate).toLocaleDateString("ar-EG")} إلى{" "}
                {new Date(request.endDate).toLocaleDateString("ar-EG")}
              </span>
            </div>
            {request.reason && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">سبب الموظف:</span>
                <span>{request.reason}</span>
              </div>
            )}
          </div>

          {mode === "REJECT" && (
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">سبب الرفض *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="اذكر سبب الرفض لتوضيحه للموظف..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                disabled={isSubmitting}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            variant={mode === "APPROVE" ? "default" : "destructive"}
            onClick={handleSubmit}
            disabled={isSubmitting || (mode === "REJECT" && !rejectionReason.trim())}
          >
            {isSubmitting
              ? "جاري المعالجة..."
              : mode === "APPROVE"
              ? "تأكيد الاعتماد"
              : "تأكيد الرفض"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
