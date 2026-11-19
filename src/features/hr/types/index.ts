import { EmployeeStatus, AttendanceStatus, LeaveStatus, PayrollStatus, Prisma } from "@prisma/client";

export type { EmployeeStatus, AttendanceStatus, LeaveStatus, PayrollStatus };

export interface DepartmentItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    employees: number;
    positions: number;
  };
}

export interface PositionItem {
  id: string;
  title: string;
  code: string;
  departmentId: string | null;
  department?: {
    id: string;
    name: string;
    code: string;
  } | null;
  _count?: {
    employees: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeListItem {
  id: string;
  code: string;
  fullName: string;
  nationalId: string | null;
  phone: string | null;
  email: string | null;
  hireDate: Date;
  departmentId: string;
  positionId: string;
  baseSalary: number | Prisma.Decimal;
  allowances: number | Prisma.Decimal;
  status: EmployeeStatus;
  userId: string | null;
  notes?: string | null;
  documentsNote?: string | null;
  department: {
    id: string;
    name: string;
    code: string;
  };
  position: {
    id: string;
    title: string;
    code: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeDetail extends EmployeeListItem {
  notes: string | null;
  documentsNote: string | null;
  attendances?: AttendanceRecord[];
  leaveRequests?: {
    id: string;
    startDate: Date;
    endDate: Date;
    reason: string | null;
    status: LeaveStatus;
    leaveType: {
      name: string;
    };
  }[];
  payslips?: {
    id: string;
    payrollRunId: string;
    baseSalary: number | Prisma.Decimal;
    allowances: number | Prisma.Decimal;
    deductions: number | Prisma.Decimal;
    absenceDays?: number;
    lateDays?: number;
    netSalary: number | Prisma.Decimal;
    isPaid: boolean;
    notes?: string | null;
    createdAt?: Date;
    payrollRun?: {
      id: string;
      runNumber: string;
      month: number;
      year: number;
    } | null;
  }[];
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  status: AttendanceStatus;
  notes: string | null;
  employee?: {
    id: string;
    code: string;
    fullName: string;
    department?: { name: string };
  };
}

export interface DailyAttendanceRow {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  positionTitle: string;
  attendanceId?: string;
  status: AttendanceStatus;
  checkIn: string | null; // HH:mm format
  checkOut: string | null; // HH:mm format
  notes: string | null;
}

export interface LeaveTypeItem {
  id: string;
  name: string;
  daysAllowed: number;
  isPaid: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    leaveRequests: number;
  };
}

export interface LeaveRequestItem {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  rejectionReason: string | null;
  status: LeaveStatus;
  approvedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  employee: {
    id: string;
    code: string;
    fullName: string;
    department?: { name: string };
  };
  leaveType: {
    id: string;
    name: string;
    daysAllowed: number;
    isPaid: boolean;
  };
}

export interface LeaveBalanceSummary {
  leaveTypeId: string;
  leaveTypeName: string;
  daysAllowed: number;
  isPaid: boolean;
  usedDays: number;
  remainingDays: number;
}

export interface PayslipItem {
  id: string;
  payrollRunId: string;
  employeeId: string;
  baseSalary: number | Prisma.Decimal;
  allowances: number | Prisma.Decimal;
  deductions: number | Prisma.Decimal;
  absenceDays: number;
  lateDays: number;
  netSalary: number | Prisma.Decimal;
  isPaid: boolean;
  notes?: string | null;
  payrollRun?: {
    id: string;
    runNumber: string;
    month: number;
    year: number;
    approvedAt?: Date | null;
    paidAt?: Date | null;
  } | null;
  employee: {
    id: string;
    code: string;
    fullName: string;
    nationalId: string | null;
    department: { name: string };
    position: { title: string };
  };
}

export interface PayrollRunListItem {
  id: string;
  runNumber: string;
  month: number;
  year: number;
  status: PayrollStatus;
  totalBaseSalary: number | Prisma.Decimal;
  totalAllowances: number | Prisma.Decimal;
  totalDeductions: number | Prisma.Decimal;
  totalNetSalary: number | Prisma.Decimal;
  processedAt: Date | null;
  approvedAt: Date | null;
  paidAt: Date | null;
  journalEntryId: string | null;
  paymentJournalEntryId: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    payslips: number;
  };
}

export interface PayrollRunDetail extends PayrollRunListItem {
  payslips: PayslipItem[];
}

export interface CalculatedEmployeePayroll {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  positionTitle: string;
  baseSalary: number;
  allowances: number;
  absenceDays: number;
  lateDays: number;
  absenceDeduction: number;
  lateDeduction: number;
  totalDeductions: number;
  netSalary: number;
}
