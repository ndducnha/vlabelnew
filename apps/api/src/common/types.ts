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
