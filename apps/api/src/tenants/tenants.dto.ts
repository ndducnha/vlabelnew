import { z } from 'zod';

// Các schema mirror ĐÚNG inline body type cũ. `.passthrough()` để KHÔNG loại bỏ field lạ
// (giữ nguyên hành vi cho payload hợp lệ) — chỉ chặn body sai kiểu / thiếu field bắt buộc.

export const createTenantSchema = z
  .object({
    name: z.string(),
    code: z.string(),
    rootOrgName: z.string().optional(),
    adminName: z.string(),
    adminEmail: z.string(),
    adminPassword: z.string(),
  })
  .passthrough();
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
