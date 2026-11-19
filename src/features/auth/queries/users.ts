import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface GetUsersParams {
  search?: string;
  roleId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export async function getUsersList(params: GetUsersParams = {}) {
  const { search, roleId, isActive, page = 1, pageSize = 20 } = params;

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
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    users,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getRolesForSelect() {
  return db.role.findMany({
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
      orderBy: [{ module: "asc" }, { key: "asc" }],
    }),
  ]);

  return { roles, permissions };
}
