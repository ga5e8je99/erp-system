import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { clampPagination } from "@/lib/pagination";

export interface GetUsersParams {
  search?: string;
  roleId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export async function getUsersList(params: GetUsersParams = {}) {
  const { page, pageSize, skip, take } = clampPagination(params, 20);
  const { search, roleId, isActive } = params;

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (roleId) {
    where.roleId = roleId;
  }

  if (typeof isActive === "boolean") {
    where.isActive = isActive;
  }

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      skip,
      take,
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    users,
    total,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getRolesForSelect(limit = 50) {
  return db.role.findMany({
    take: limit,
    select: {
      id: true,
      name: true,
      description: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getRolesWithPermissions() {
  const [roles, permissions] = await Promise.all([
    db.role.findMany({
      take: 50,
      include: {
        permissions: {
          select: {
            permissionId: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.permission.findMany({
      take: 200,
      orderBy: [{ module: "asc" }, { key: "asc" }],
    }),
  ]);

  return { roles, permissions };
}
