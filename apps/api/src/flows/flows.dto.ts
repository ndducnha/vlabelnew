import { z } from 'zod';
import { FIELD_TYPES } from '@vlabel/shared';

// Các schema mirror ĐÚNG inline body type cũ. `.passthrough()` để KHÔNG loại bỏ field lạ
// (giữ nguyên hành vi cho payload hợp lệ) — chỉ chặn body sai kiểu / thiếu field bắt buộc.

export const createFlowSchema = z
  .object({
    name: z.string(),
    code: z.string(),
    categoryId: z.string().optional(),
    organizationIds: z.array(z.string()).optional(),
  })
  .passthrough();
export type CreateFlowInput = z.infer<typeof createFlowSchema>;

export const updateFlowSchema = z
  .object({
    name: z.string().optional(),
    code: z.string().optional(),
    categoryId: z.string().optional(),
    organizationIds: z.array(z.string()).optional(),
  })
  .passthrough();
export type UpdateFlowInput = z.infer<typeof updateFlowSchema>;

export const addEventSchema = z
  .object({
    name: z.string(),
    code: z.string(),
    required: z.boolean().optional(),
    enterRoleKeys: z.array(z.string()).optional(),
    approveRoleKeys: z.array(z.string()).optional(),
  })
  .passthrough();
export type AddEventInput = z.infer<typeof addEventSchema>;

export const updateEventSchema = z
  .object({
    name: z.string().optional(),
    order: z.number().optional(),
    required: z.boolean().optional(),
    enterRoleKeys: z.array(z.string()).optional(),
    approveRoleKeys: z.array(z.string()).optional(),
  })
  .passthrough();
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const addFieldSchema = z
  .object({
    key: z.string(),
    label: z.string(),
    type: z.enum(FIELD_TYPES),
    required: z.boolean().optional(),
    publicVisible: z.boolean().optional(),
    options: z.array(z.string()).optional(),
  })
  .passthrough();
export type AddFieldInput = z.infer<typeof addFieldSchema>;

export const updateFieldSchema = z
  .object({
    label: z.string().optional(),
    required: z.boolean().optional(),
    publicVisible: z.boolean().optional(),
    options: z.array(z.string()).optional(),
  })
  .passthrough();
export type UpdateFieldInput = z.infer<typeof updateFieldSchema>;

export const assignPermissionSchema = z
  .object({
    userId: z.string(),
    eventDefinitionId: z.string().optional(),
  })
  .passthrough();
export type AssignPermissionInput = z.infer<typeof assignPermissionSchema>;
