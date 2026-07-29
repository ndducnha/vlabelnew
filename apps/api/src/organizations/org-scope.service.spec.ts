import { OrgScopeService } from './org-scope.service';

const ORGS = [
  { id: 'group', parentId: null },
  { id: 'company', parentId: 'group' },
  { id: 'factory', parentId: 'company' },
  { id: 'dept', parentId: 'factory' },
  { id: 'other', parentId: null },
];
const prisma = { organization: { findMany: async () => ORGS } } as any;

describe('OrgScopeService — subtree scope', () => {
  const svc = new OrgScopeService(prisma);

  it('không giới hạn khi user không có scope', async () => {
    expect(await svc.allowedOrgIds({ tenantId: 't', scopeOrgIds: [] } as any)).toBeNull();
  });

  it('mở rộng theo nhánh con VÀ tổ tiên (đường dọc)', async () => {
    const ids = await svc.allowedOrgIds({ tenantId: 't', scopeOrgIds: ['company'] } as any);
    expect(new Set(ids)).toEqual(new Set(['group', 'company', 'factory', 'dept']));
    expect(ids).not.toContain('other');
  });

  it('superadmin tầng 1 thấy toàn cây con', async () => {
    const ids = await svc.allowedOrgIds({ tenantId: 't', scopeOrgIds: ['group'] } as any);
    expect(new Set(ids)).toEqual(new Set(['group', 'company', 'factory', 'dept']));
  });

  it('orgWhere trả điều kiện in-list', async () => {
    const w = await svc.orgWhere({ tenantId: 't', scopeOrgIds: ['factory'] } as any);
    expect(w.organizationId?.in).toEqual(expect.arrayContaining(['factory', 'dept']));
  });
});
