/** Zod schema dùng chung (FE validate trước, BE validate lại — không tin FE). */
import { z } from 'zod';
import { validateGtin } from './gtin';
import { FIELD_TYPES } from './enums';

export const gtinSchema = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => validateGtin(v).valid, (v) => ({ message: validateGtin(v).message ?? 'GTIN không hợp lệ' }));

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const createProductManualSchema = z.object({
  gtin: gtinSchema,
  name: z.string().min(1, 'Tên sản phẩm bắt buộc'),
  categoryId: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  description: z.string().optional(),
  image: z.string().url().optional(),
  dynamicAttributes: z.record(z.any()).optional(),
});
export type CreateProductManualInput = z.infer<typeof createProductManualSchema>;

export const importFromVnpcSchema = z.object({
  gtin: gtinSchema,
  organizationId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
});
export type ImportFromVnpcInput = z.infer<typeof importFromVnpcSchema>;

export const fieldDefSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(FIELD_TYPES),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  publicVisible: z.boolean().default(false),
  order: z.number().int().default(0),
});
export type FieldDef = z.infer<typeof fieldDefSchema>;

export const createTraceableItemSchema = z.object({
  gtin: gtinSchema,
  productId: z.string().uuid(),
  organizationId: z.string().uuid(),
  batchOrLot: z.string().optional(),
  serialNumber: z.string().optional(),
});
export type CreateTraceableItemInput = z.infer<typeof createTraceableItemSchema>;

export const eventRecordDraftSchema = z.object({
  traceableItemId: z.string().uuid(),
  flowVersionId: z.string().uuid(),
  eventDefinitionId: z.string().uuid(),
  performedByUserId: z.string().uuid().optional(),
  performedByName: z.string().optional(),
  organizationId: z.string().uuid().optional(),
  location: z.string().optional(),
  gpsLat: z.number().optional(),
  gpsLng: z.number().optional(),
  performedAt: z.string().datetime().optional(),
  action: z.string().optional(),
  values: z.record(z.any()).optional(),
  media: z.array(z.object({
    kind: z.string(),
    url: z.string(),
    fileName: z.string().optional(),
    mimeType: z.string().optional(),
    sizeBytes: z.number().optional(),
    publicVisible: z.boolean().optional(),
  })).optional(),
});
export type EventRecordDraftInput = z.infer<typeof eventRecordDraftSchema>;
