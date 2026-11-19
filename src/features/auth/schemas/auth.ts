import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح / Invalid email address"),
  password: z.string().min(1, "كلمة المرور مطلوبة / Password is required"),
  rememberMe: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(6, "كلمة المرور يجب ألا تقل عن 6 أحرف"),
  roleId: z.string().min(1, "يرجى اختيار الدور الوظيفي"),
  locale: z.enum(["ar", "en"]).default("ar"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  email: z.string().email("بريد إلكتروني غير صالح"),
  roleId: z.string().min(1, "يرجى اختيار الدور الوظيفي"),
  locale: z.enum(["ar", "en"]),
  isActive: z.boolean(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const resetPasswordSchema = z.object({
  userId: z.string(),
  newPassword: z.string().min(6, "كلمة المرور يجب ألا تقل عن 6 أحرف"),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const updateRolePermissionsSchema = z.object({
  roleId: z.string(),
  permissionIds: z.array(z.string()),
});

export type UpdateRolePermissionsInput = z.infer<typeof updateRolePermissionsSchema>;

export const createRoleSchema = z.object({
  name: z.string().min(2, "اسم الدور يجب أن يكون حرفين على الأقل"),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).optional(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "اسم الدور يجب أن يكون حرفين على الأقل"),
  description: z.string().optional(),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
