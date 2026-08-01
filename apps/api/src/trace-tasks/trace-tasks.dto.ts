import { z } from 'zod';

// Các schema mirror ĐÚNG inline body type cũ. `.passthrough()` để KHÔNG loại bỏ field lạ
// (giữ nguyên hành vi cho payload hợp lệ) — chỉ chặn body sai kiểu / thiếu field bắt buộc.

export const createTraceTaskSchema = z
  .object({
    name: z.string().optional(),
    productId: z.string(),
    lot: z.string().optional(),
    flowId: z.string().optional(),
    organizationId: z.string().optional(),
    assignedUserId: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    note: z.string().optional(),
  })
  .passthrough();
export type CreateTraceTaskInput = z.infer<typeof createTraceTaskSchema>;
