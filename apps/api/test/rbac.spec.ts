import { ROLES, PERMISSIONS, permissionsForRoles } from '@vlabel/shared';

describe('RBAC — role → permission', () => {
  it('Kê khai chỉ kê khai — không duyệt, không quản lý', () => {
    const p = permissionsForRoles([ROLES.DATA_ENTRY]);
    expect(p.has(PERMISSIONS.EVENT_RECORD_CREATE)).toBe(true);
    expect(p.has(PERMISSIONS.EVENT_RECORD_SUBMIT)).toBe(true);
    expect(p.has(PERMISSIONS.EVENT_RECORD_APPROVE)).toBe(false);
    expect(p.has(PERMISSIONS.USER_MANAGE)).toBe(false);
    expect(p.has(PERMISSIONS.FLOW_MANAGE)).toBe(false);
    expect(p.has(PERMISSIONS.ORGANIZATION_MANAGE)).toBe(false);
  });

  it('Quản lý: flows + người dùng + duyệt, KHÔNG cấu hình tổ chức', () => {
    const p = permissionsForRoles([ROLES.MANAGER]);
    [PERMISSIONS.FLOW_MANAGE, PERMISSIONS.USER_MANAGE, PERMISSIONS.ROLE_ASSIGN, PERMISSIONS.EVENT_RECORD_APPROVE,
      PERMISSIONS.QR_MANAGE, PERMISSIONS.CATEGORY_MANAGE, PERMISSIONS.PUBLIC_CONFIG_MANAGE]
      .forEach((x) => expect(p.has(x)).toBe(true));
    expect(p.has(PERMISSIONS.ORGANIZATION_MANAGE)).toBe(false);
    expect(p.has(PERMISSIONS.TENANT_MANAGE)).toBe(false);
  });

  it('Admin & Superadmin: có organization:manage (khác biệt Cấp 1 do service kiểm)', () => {
    expect(permissionsForRoles([ROLES.ADMIN]).has(PERMISSIONS.ORGANIZATION_MANAGE)).toBe(true);
    expect(permissionsForRoles([ROLES.SUPERADMIN]).has(PERMISSIONS.ORGANIZATION_MANAGE)).toBe(true);
    // Admin vẫn không có quyền tenant
    expect(permissionsForRoles([ROLES.ADMIN]).has(PERMISSIONS.TENANT_MANAGE)).toBe(false);
  });

  it('Platform Admin: quản lý tenant, không có quyền nghiệp vụ', () => {
    const p = permissionsForRoles([ROLES.PLATFORM_ADMIN]);
    expect(p.has(PERMISSIONS.TENANT_MANAGE)).toBe(true);
    expect(p.has(PERMISSIONS.PRODUCT_CREATE)).toBe(false);
    expect(p.has(PERMISSIONS.ORGANIZATION_MANAGE)).toBe(false);
  });
});
