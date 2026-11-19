import { z } from "zod";
import { EmployeeStatus, AttendanceStatus, LeaveStatus } from "@prisma/client";

export const departmentSchema = z.object({
  name: z.string().min(2, "اسم القسم يجب ألا يقل عن حرفين"),
  code: z.string().min(2, "رمز القسم يجب ألا يقل عن حرفين").toUpperCase(),
  description: z.string().optional().nullable(),
});

export type DepartmentFormData = z.infer<typeof departmentSchema>;

export const positionSchema = z.object({
  title: z.string().min(2, "مسمى الوظيفة يجب ألا يقل عن حرفين"),
  code: z.string().min(2, "رمز الوظيفة يجب ألا يقل عن حرفين").toUpperCase(),
  departmentId: z.string().min(1, "يرجى اختيار القسم التابع له"),
});

export type PositionFormData = z.infer<typeof positionSchema>;

export const employeeSchema = z.object({
  fullName: z.string().min(3, "الاسم الكامل يجب ألا يقل عن 3 أحرف"),
  nationalId: z
    .string()
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z.string().optional().nullable().or(z.literal("")),
  email: z.string().email("البريد الإلكتروني غير صالح").optional().nullable().or(z.literal("")),
  hireDate: z.date(),
  departmentId: z.string().min(1, "يرجى اختيار القسم"),
  positionId: z.string().min(1, "يرجى اختيار المسمى الوظيفي"),
  baseSalary: z.number().min(0, "الراتب الأساسي لا يمكن أن يكون سالباً"),
  allowances: z.number().min(0, "البدلات لا يمكن أن تكون سالبة"),
  status: z.nativeEnum(EmployeeStatus),
  userId: z.string().optional().nullable().or(z.literal("")),
  notes: z.string().optional().nullable(),
  documentsNote: z.string().optional().nullable(),
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;

export const attendanceRowSchema = z.object({
  employeeId: z.string().min(1),
  status: z.nativeEnum(AttendanceStatus),
  checkIn: z.string().optional().nullable(),
  checkOut: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const attendanceBulkSchema = z.object({
  date: z.coerce.date(),
  records: z.array(attendanceRowSchema),
});

export type AttendanceBulkFormData = z.infer<typeof attendanceBulkSchema>;

export const manualCheckInOutSchema = z.object({
  employeeId: z.string().min(1, "يرجى تحديد الموظف"),
  date: z.date(),
  checkIn: z.string().optional().nullable(),
  checkOut: z.string().optional().nullable(),
  status: z.nativeEnum(AttendanceStatus),
  notes: z.string().optional().nullable(),
});

export type ManualCheckInOutFormData = z.infer<typeof manualCheckInOutSchema>;

export const leaveTypeSchema = z.object({
  name: z.string().min(2, "اسم نوع الإجازة يجب ألا يقل عن حرفين"),
  daysAllowed: z.number().int().min(1, "الرصيد السنوي يجب أن يكون يوماً واحداً على الأقل"),
  isPaid: z.boolean(),
});

export type LeaveTypeFormData = z.infer<typeof leaveTypeSchema>;

export const leaveRequestSchema = z.object({
  employeeId: z.string().min(1, "يرجى اختيار الموظف"),
  leaveTypeId: z.string().min(1, "يرجى اختيار نوع الإجازة"),
  startDate: z.date(),
  endDate: z.date(),
  reason: z.string().optional().nullable(),
}).refine(
  (data) => data.endDate >= data.startDate,
  {
    message: "تاريخ نهاية الإجازة يجب ألا يسبق تاريخ بدايتها",
    path: ["endDate"],
  }
);

export type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;

export const leaveApprovalSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum([LeaveStatus.APPROVED, LeaveStatus.REJECTED]),
  rejectionReason: z.string().optional().nullable(),
}).refine(
  (data) => {
    if (data.status === LeaveStatus.REJECTED && (!data.rejectionReason || data.rejectionReason.trim().length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: "يرجى توضيح سبب رفض الإجازة",
    path: ["rejectionReason"],
  }
);

export type LeaveApprovalFormData = z.infer<typeof leaveApprovalSchema>;

export const generatePayrollSchema = z.object({
  month: z.number().int().min(1).max(12, "الشهر يجب أن يكون بين 1 و 12"),
  year: z.number().int().min(2000).max(2100, "السنة غير صالحة"),
});

export type GeneratePayrollFormData = z.infer<typeof generatePayrollSchema>;

export const payPayrollSchema = z.object({
  runId: z.string().min(1),
  paymentAccountId: z.string().min(1, "يرجى اختيار حساب الدفع (الخزينة / البنك)"),
});

export type PayPayrollFormData = z.infer<typeof payPayrollSchema>;
