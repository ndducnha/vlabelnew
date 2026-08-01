import { z } from 'zod';

// Các schema mirror ĐÚNG inline body type cũ. `.passthrough()` để KHÔNG loại bỏ field lạ
// (giữ nguyên hành vi cho payload hợp lệ) — chỉ chặn body sai kiểu / thiếu field bắt buộc.

export const createOrganizationSchema = z
  .object({
    name: z.string(),
    code: z.string(),
    type: z.string(),
    parentId: z.string().optional(),
  })
  .passthrough();
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
