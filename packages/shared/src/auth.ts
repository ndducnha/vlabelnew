/** Người dùng đã xác thực — nguồn chân lý duy nhất, dùng chung api (JWT payload) + web + mobile. */
export interface AuthUser {
  sub: string; // user id
  tenantId: string;
  organizationId: string | null;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  scopeOrgIds: string[];
}
