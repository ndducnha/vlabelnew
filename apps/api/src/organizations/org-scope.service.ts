import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types';

/**
 * Tính phạm vi tổ chức của user theo cây (subtree).
 * Superadmin cấp trên được thấy toàn bộ nhánh con của các đơn vị mình được gán.
 */
@Injectable()
export class OrgScopeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * null = toàn tenant (không giới hạn); ngược lại = danh sách org id được phép.
   * Gồm CẢ nhánh con (descendants) LẪN tổ tiên (ancestors) theo đường dọc,
   * để người ở bộ phận vẫn thấy sản phẩm/flow của tổ chức cấp trên trong cùng nhánh.
   */
  async allowedOrgIds(user: AuthUser): Promise<string[] | null> {
    if (!user.scopeOrgIds || user.scopeOrgIds.length === 0) return null;
    const all = await this.prisma.organization.findMany({
      where: { tenantId: user.tenantId, deletedAt: null },
      select: { id: true, parentId: true },
    });
    const byId = new Map(all.map((o) => [o.id, o]));
    const childrenOf = new Map<string, string[]>();
    for (const o of all) {
      if (o.parentId) {
        const arr = childrenOf.get(o.parentId) ?? [];
        arr.push(o.id);
        childrenOf.set(o.parentId, arr);
      }
    }
    const result = new Set<string>();
    // xuống: hậu duệ
    const stack = [...user.scopeOrgIds];
    while (stack.length) {
      const id = stack.pop()!;
      if (result.has(id)) continue;
      result.add(id);
      for (const c of childrenOf.get(id) ?? []) stack.push(c);
    }
    // lên: tổ tiên
    for (const id of user.scopeOrgIds) {
      let cur = byId.get(id);
      const seen = new Set<string>();
      while (cur && cur.parentId && !seen.has(cur.id)) {
        seen.add(cur.id);
        result.add(cur.parentId);
        cur = byId.get(cur.parentId);
      }
    }
    return [...result];
  }

  /** Điều kiện Prisma cho cột organizationId theo scope (rỗng nếu full tenant). */
  async orgWhere(user: AuthUser): Promise<{ organizationId?: { in: string[] } }> {
    const ids = await this.allowedOrgIds(user);
    return ids ? { organizationId: { in: ids } } : {};
  }

  async assertAccess(user: AuthUser, organizationId: string) {
    const ids = await this.allowedOrgIds(user);
    if (ids && !ids.includes(organizationId)) {
      throw new Error('Đơn vị nằm ngoài phạm vi được phân quyền');
    }
  }
}
