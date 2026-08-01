import { z } from 'zod';

// Các schema mirror ĐÚNG inline body type cũ. `.passthrough()` để KHÔNG loại bỏ field lạ
// (giữ nguyên hành vi cho payload hợp lệ) — chỉ chặn body sai kiểu / thiếu field bắt buộc.

export const updateProductSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
    dynamicAttributes: z.record(z.unknown()).optional(),
    organizationId: z.string().optional(),
    traceMode: z.string().optional(),
  })
  .passthrough();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
