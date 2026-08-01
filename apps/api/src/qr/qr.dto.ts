import { z } from 'zod';

// Các schema mirror ĐÚNG inline body type cũ. `.passthrough()` để KHÔNG loại bỏ field lạ
// (giữ nguyên hành vi cho payload hợp lệ) — chỉ chặn body sai kiểu / thiếu field bắt buộc.

export const generateQrSchema = z
  .object({
    gtin: z.string(),
    lot: z.string().optional(),
    serial: z.string().optional(),
    quantity: z.number().optional(),
    traceableItemId: z.string().optional(),
  })
  .passthrough();
export type GenerateQrInput = z.infer<typeof generateQrSchema>;
