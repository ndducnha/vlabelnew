import { z } from 'zod';

// Các schema mirror ĐÚNG inline body type cũ. `.passthrough()` để KHÔNG loại bỏ field lạ
// (giữ nguyên hành vi cho payload hợp lệ) — chỉ chặn body sai kiểu / thiếu field bắt buộc.

export const createUserSchema = z
  .object({
    email: z.string(),
    fullName: z.string(),
    password: z.string(),
    organizationId: z.string().optional(),
    roleKeys: z.array(z.string()).optional(),
    scopeOrgIds: z.array(z.string()).optional(),
  })
  .passthrough();
export type CreateUserInput = z.infer<typeof createUserSchema>;
