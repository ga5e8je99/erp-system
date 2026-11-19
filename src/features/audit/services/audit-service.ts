import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface AuditLogFilters {
  page?: number;
  pageSize?: number;
  userId?: string;
  entity?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export async function getAuditLogs(filters: AuditLogFilters = {}) {
  const page = Math.max(1, Number(filters.page || 1));
  const pageSize = Math.max(1, Math.min(100, Number(filters.pageSize || 20)));
  const skip = (page - 1) * pageSize;

  const where: Prisma.AuditLogWhereInput = {};

  if (filters.userId && filters.userId !== "all") {
    where.userId = filters.userId;
  }

  if (filters.entity && filters.entity !== "all") {
    where.entity = filters.entity;
  }

  if (filters.action && filters.action !== "all") {
    where.action = filters.action;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) {
      where.createdAt.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      where.createdAt.lte = to;
    }
  }

  if (filters.search) {
    const q = filters.search.trim();
    where.OR = [
      { entity: { contains: q, mode: "insensitive" } },
      { entityId: { contains: q, mode: "insensitive" } },
      { action: { contains: q, mode: "insensitive" } },
      { ip: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [total, logs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return {
    logs,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getAuditFilterOptions() {
  const [users, distinctEntities, distinctActions] = await Promise.all([
    db.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    db.auditLog.findMany({
      select: { entity: true },
      distinct: ["entity"],
      orderBy: { entity: "asc" },
    }),
    db.auditLog.findMany({
      select: { action: true },
      distinct: ["action"],
      orderBy: { action: "asc" },
    }),
  ]);

  return {
    users,
    entities: distinctEntities.map((e) => e.entity).filter(Boolean),
    actions: distinctActions.map((a) => a.action).filter(Boolean),
  };
}
