/** Hằng số RBAC dùng chung giữa API và Web. Format permission: `resource:action`. */

export const ROLES = {
  PLATFORM_ADMIN: 'PLATFORM_ADMIN', // Chủ nền tảng (SaaS): tạo & quản lý tenant
  SUPERADMIN: 'SUPERADMIN',         // Toàn quyền + cấu hình tổ chức CẤP 1 (cao nhất)
  ADMIN: 'ADMIN',                   // Toàn quyền + cấu hình tổ chức CẤP ≥ 2 (dưới cấp 1)
  MANAGER: 'MANAGER',               // Quản lý: flows, người dùng, phân quyền (không cấu hình tổ chức)
  DATA_ENTRY: 'DATA_ENTRY',         // Kê khai theo quyền được phân
} as const;
export type RoleKey = (typeof ROLES)[keyof typeof ROLES];

/** Các vai trò gán được cho tài khoản người dùng (không gồm PLATFORM_ADMIN). */
export const ASSIGNABLE_ROLES: RoleKey[] = [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.DATA_ENTRY];

export const ROLE_LABELS: Record<string, string> = {
  [ROLES.PLATFORM_ADMIN]: 'Platform Admin',
  [ROLES.SUPERADMIN]: 'Superadmin',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.MANAGER]: 'Quản lý',
  [ROLES.DATA_ENTRY]: 'Kê khai',
};

export const PERMISSIONS = {
  TENANT_MANAGE: 'tenant:manage',
  AUDIT_READ_ALL: 'audit:read_all',
  AUDIT_READ: 'audit:read',
  ORGANIZATION_MANAGE: 'organization:manage',
  USER_MANAGE: 'user:manage',
  ROLE_ASSIGN: 'role:assign',
  CATEGORY_MANAGE: 'category:manage',
  FIELD_MANAGE: 'field:manage',
  PRODUCT_READ: 'product:read',
  PRODUCT_CREATE: 'product:create',
  PRODUCT_UPDATE: 'product:update',
  VNPC_SEARCH: 'vnpc:search',
  PRODUCT_IMPORT_VNPC: 'product:import_vnpc',
  FLOW_MANAGE: 'flow:manage',
  EVENT_DEF_MANAGE: 'event_def:manage',
  TRACEABLE_ITEM_MANAGE: 'traceable_item:manage',
  QR_MANAGE: 'qr:manage',
  EVENT_RECORD_CREATE: 'event_record:create',
  EVENT_RECORD_SUBMIT: 'event_record:submit',
  EVENT_RECORD_APPROVE: 'event_record:approve',
  EVENT_RECORD_REJECT: 'event_record:reject',
  EVENT_RECORD_REQUEST_CHANGES: 'event_record:request_changes',
  EVENT_RECORD_LOCK: 'event_record:lock',
  PUBLIC_CONFIG_MANAGE: 'public_config:manage',
} as const;
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const P = PERMISSIONS;

// Quản lý: cấu hình gần như toàn bộ trừ cấu trúc TỔ CHỨC và TENANT.
const MANAGER_PERMS: Permission[] = [
  P.PRODUCT_READ, P.PRODUCT_CREATE, P.PRODUCT_UPDATE,
  P.VNPC_SEARCH, P.PRODUCT_IMPORT_VNPC,
  P.CATEGORY_MANAGE, P.FIELD_MANAGE,
  P.FLOW_MANAGE, P.EVENT_DEF_MANAGE,
  P.TRACEABLE_ITEM_MANAGE, P.QR_MANAGE,
  P.USER_MANAGE, P.ROLE_ASSIGN,
  P.EVENT_RECORD_CREATE, P.EVENT_RECORD_SUBMIT,
  P.EVENT_RECORD_APPROVE, P.EVENT_RECORD_REJECT, P.EVENT_RECORD_REQUEST_CHANGES, P.EVENT_RECORD_LOCK,
  P.PUBLIC_CONFIG_MANAGE, P.AUDIT_READ,
];

export const ROLE_PERMISSIONS: Record<RoleKey, Permission[]> = {
  [ROLES.PLATFORM_ADMIN]: [P.TENANT_MANAGE, P.AUDIT_READ_ALL, P.AUDIT_READ],
  [ROLES.DATA_ENTRY]: [P.PRODUCT_READ, P.TRACEABLE_ITEM_MANAGE, P.EVENT_RECORD_CREATE, P.EVENT_RECORD_SUBMIT],
  [ROLES.MANAGER]: MANAGER_PERMS,
  [ROLES.ADMIN]: [...MANAGER_PERMS, P.ORGANIZATION_MANAGE],
  // SUPERADMIN: full quyền mặc định mọi chỗ (gồm cả tenant + cấu hình tổ chức cấp 1).
  [ROLES.SUPERADMIN]: Object.values(PERMISSIONS),
};

export function permissionsForRoles(roleKeys: string[]): Set<Permission> {
  const out = new Set<Permission>();
  for (const key of roleKeys) {
    const perms = ROLE_PERMISSIONS[key as RoleKey];
    if (perms) perms.forEach((p) => out.add(p));
  }
  return out;
}
