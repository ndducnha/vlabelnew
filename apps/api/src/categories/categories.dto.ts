import { z } from 'zod';
import { FIELD_TYPES } from '@vlabel/shared';

// Các schema mirror ĐÚNG inline body type cũ. `.passthrough()` để KHÔNG loại bỏ field lạ
// (giữ nguyên hành vi cho payload hợp lệ) — chỉ chặn body sai kiểu / thiếu field bắt buộc.

export const createCategorySchema = z
  .object({
    name: z.string(),
    code: z.string(),
  })
  .passthrough();
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const addFieldSchema = z
  .object({
    key: z.string(),
    label: z.string(),
    type: z.enum(FIELD_TYPES),
    required: z.boolean().optional(),
    options: z.array(z.string()).optional(),
    publicVisible: z.boolean().optional(),
  })
  .passthrough();
export type AddFieldInput = z.infer<typeof addFieldSchema>;
