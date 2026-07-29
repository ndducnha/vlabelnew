/** Enum & hằng số nghiệp vụ dùng chung. */

export const FIELD_TYPES = [
  'text', 'textarea', 'number', 'date', 'datetime',
  'select', 'multi-select', 'checkbox', 'boolean',
  'file', 'image', 'video', 'location', 'user', 'organization',
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const PRODUCT_SOURCE = { MANUAL: 'MANUAL', VNPC: 'VNPC' } as const;
export type ProductSource = (typeof PRODUCT_SOURCE)[keyof typeof PRODUCT_SOURCE];

/** Trạng thái Event Record (§8, §12). */
export const RECORD_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
  LOCKED: 'LOCKED',
} as const;
export type RecordStatus = (typeof RECORD_STATUS)[keyof typeof RECORD_STATUS];

export const QR_STATUS = {
  ACTIVE: 'ACTIVE',
  LOCKED: 'LOCKED',
  REVOKED: 'REVOKED',
} as const;
export type QrStatus = (typeof QR_STATUS)[keyof typeof QR_STATUS];

/** Loại đơn vị tổ chức — KHÔNG hard-code số tầng (§4). Chỉ gợi ý. */
export const ORG_TYPES = [
  'PROVINCE', 'GROUP', 'AUTHORITY',
  'COMPANY', 'MEMBER_COMPANY', 'PNL',
  'FACTORY', 'COOP', 'DEPARTMENT',
  'GROWING_AREA', 'LINE', 'WAREHOUSE',
] as const;
export type OrgType = (typeof ORG_TYPES)[number];
