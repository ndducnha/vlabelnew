import { z } from 'zod';

// Các schema mirror ĐÚNG inline body type cũ. `.passthrough()` để KHÔNG loại bỏ field lạ
// (giữ nguyên hành vi cho payload hợp lệ) — chỉ chặn body sai kiểu / thiếu field bắt buộc.

export const setStatusSchema = z
  .object({
    status: z.string(),
    recallReason: z.string().optional(),
  })
  .passthrough();
export type SetStatusInput = z.infer<typeof setStatusSchema>;

export const setBatchStatusSchema = z
  .object({
    status: z.string(),
    recallReason: z.string().optional(),
  })
  .passthrough();
export type SetBatchStatusInput = z.infer<typeof setBatchStatusSchema>;
