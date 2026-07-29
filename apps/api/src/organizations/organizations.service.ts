import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ROLES } from '@vlabel/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/types';

export interface OrgNode {
  id: string; name: string; code: string; type: string; level: number;
  parentId: string | null; status: string; children: OrgNode[];
}

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  /** Chỉ SUPERADMIN được cấu hình đơn vị CẤP 1 (level 0). ADMIN chỉ được cấp ≥ 2. */
  private assertLevelEditable(user: AuthUser, level: number) {
    if (level === 0 && !user.roles.includes(ROLES.SUPERADMIN)) {
      throw new ForbiddenException('Chỉ superadmin được cấu hình tổ chức cấp 1 (cấp cao nhất)');
    }
  }

  /** Trả cây tổ chức của tenant (đa tầng, không hard-code số tầng). */
  async tree(user: AuthUser): Promise<OrgNode[]> {
    const orgs = await this.prisma.organization.findMany({
      where: { tenantId: user.tenantId, deletedAt: null },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
    const map = new Map<string, OrgNode>();
    orgs.forEach((o) => map.set(o.id, { id: o.id, name: o.name, code: o.code, type: o.type, level: o.level, parentId: o.parentId, status: o.status, children: [] }));
    const roots: OrgNode[] = [];
    map.forEach((node) => {
      if (node.parentId && map.has(node.parentId)) map.get(node.parentId)!.children.push(node);
      else roots.push(node);
    });
    return roots;
  }

  list(user: AuthUser) {
    return this.prisma.organization.findMany({
      where: { tenantId: user.tenantId, deletedAt: null },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Đổi cấp đơn vị:
   * - up (nâng cấp): chuyển lên làm con của "ông" (cha của cha) — cấp giảm 1.
   * - down (hạ cấp): chuyển vào làm con của đơn vị ngay phía trên cùng cấp — cấp tăng 1.
   * Cấp của toàn bộ nhánh con được dịch theo.
   */
  async changeLevel(user: AuthUser, id: string, direction: 'up' | 'down') {
    const org = await this.prisma.organization.findFirst({ where: { id, tenantId: user.tenantId, deletedAt: null } });
    if (!org) throw new NotFoundException('Không tìm thấy đơn vị');
    this.assertLevelEditable(user, org.level); // đổi cấp một đơn vị Cấp 1 → cần superadmin

    let newParentId: string | null;
    if (direction === 'up') {
      if (!org.parentId) return { ok: false, atEdge: true }; // đã ở cấp cao nhất
      const parent = await this.prisma.organization.findFirst({ where: { id: org.parentId, tenantId: user.tenantId } });
      newParentId = parent?.parentId ?? null;
    } else {
      const siblings = await this.prisma.organization.findMany({
        where: { tenantId: user.tenantId, parentId: org.parentId, deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
      const idx = siblings.findIndex((s) => s.id === id);
      if (idx <= 0) return { ok: false, atEdge: true }; // không có đơn vị phía trên để hạ vào
      newParentId = siblings[idx - 1].id;
    }

    const newParent = newParentId ? await this.prisma.organization.findFirst({ where: { id: newParentId, tenantId: user.tenantId } }) : null;
    const newLevel = newParent ? newParent.level + 1 : 0;
    const delta = newLevel - org.level;
    this.assertLevelEditable(user, newLevel); // nâng lên thành Cấp 1 → cần superadmin

    const descendants = await this.descendantIds(user.tenantId, id);
    await this.prisma.organization.update({ where: { id }, data: { parentId: newParentId, level: newLevel } });
    if (delta !== 0 && descendants.size) {
      const descs = await this.prisma.organization.findMany({ where: { id: { in: [...descendants] } }, select: { id: true, level: true } });
      for (const d of descs) await this.prisma.organization.update({ where: { id: d.id }, data: { level: d.level + delta } });
    }
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: `LEVEL_${direction.toUpperCase()}`, resource: 'organization', resourceId: id });
    return { ok: true, level: newLevel };
  }

  /** Xoá (soft delete) — chặn nếu còn đơn vị con. */
  async remove(user: AuthUser, id: string) {
    const org = await this.prisma.organization.findFirst({ where: { id, tenantId: user.tenantId, deletedAt: null } });
    if (!org) throw new NotFoundException('Không tìm thấy đơn vị');
    this.assertLevelEditable(user, org.level);
    const children = await this.prisma.organization.count({ where: { parentId: id, tenantId: user.tenantId, deletedAt: null } });
    if (children > 0) throw new BadRequestException('Vui lòng xoá hoặc chuyển các đơn vị con trước');
    await this.prisma.organization.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'DELETE', resource: 'organization', resourceId: id });
    return { ok: true };
  }

  /** Sắp xếp lên/xuống trong cùng cấp (cùng đơn vị cha). */
  async reorder(user: AuthUser, id: string, direction: 'up' | 'down') {
    const node = await this.prisma.organization.findFirst({ where: { id, tenantId: user.tenantId, deletedAt: null } });
    if (!node) throw new NotFoundException('Không tìm thấy đơn vị');
    this.assertLevelEditable(user, node.level);
    const siblings = await this.prisma.organization.findMany({
      where: { tenantId: user.tenantId, parentId: node.parentId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const idx = siblings.findIndex((s) => s.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return { ok: false, atEdge: true };
    // chuẩn hoá sortOrder tuần tự và hoán đổi 2 vị trí trong một lượt
    for (let i = 0; i < siblings.length; i++) {
      const order = i === idx ? swapIdx : i === swapIdx ? idx : i;
      if (siblings[i].sortOrder !== order) {
        await this.prisma.organization.update({ where: { id: siblings[i].id }, data: { sortOrder: order } });
      }
    }
    return { ok: true };
  }

  async create(user: AuthUser, dto: { name: string; code: string; type: string; parentId?: string }) {
    let level = 0;
    if (dto.parentId) {
      const parent = await this.prisma.organization.findFirst({ where: { id: dto.parentId, tenantId: user.tenantId } });
      if (!parent) throw new NotFoundException('Không tìm thấy đơn vị cha');
      level = parent.level + 1;
    }
    this.assertLevelEditable(user, level); // tạo đơn vị cấp 1 → cần superadmin
    const org = await this.prisma.organization.create({
      data: { tenantId: user.tenantId, name: dto.name, code: dto.code, type: dto.type, parentId: dto.parentId ?? null, level },
    });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'CREATE', resource: 'organization', resourceId: org.id });
    return org;
  }

  /** Di chuyển đơn vị sang cha khác (có chống tạo vòng lặp). */
  async move(user: AuthUser, id: string, newParentId: string | null) {
    const org = await this.prisma.organization.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!org) throw new NotFoundException('Không tìm thấy đơn vị');
    let level = 0;
    if (newParentId) {
      if (newParentId === id) throw new BadRequestException('Không thể chuyển đơn vị vào chính nó');
      if ((await this.descendantIds(user.tenantId, id)).has(newParentId)) {
        throw new BadRequestException('Không thể chuyển vào đơn vị con của chính nó');
      }
      const parent = await this.prisma.organization.findFirst({ where: { id: newParentId, tenantId: user.tenantId } });
      if (!parent) throw new NotFoundException('Không tìm thấy đơn vị cha');
      level = parent.level + 1;
    }
    this.assertLevelEditable(user, org.level);
    this.assertLevelEditable(user, level);
    const updated = await this.prisma.organization.update({ where: { id }, data: { parentId: newParentId, level } });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'MOVE', resource: 'organization', resourceId: id });
    return updated;
  }

  /** Tập hợp id các đơn vị con (mọi cấp) — có guard chống vòng lặp dữ liệu sẵn có. */
  private async descendantIds(tenantId: string, rootId: string): Promise<Set<string>> {
    const all = await this.prisma.organization.findMany({ where: { tenantId, deletedAt: null }, select: { id: true, parentId: true } });
    const childrenOf = new Map<string, string[]>();
    for (const o of all) {
      if (o.parentId) { const a = childrenOf.get(o.parentId) ?? []; a.push(o.id); childrenOf.set(o.parentId, a); }
    }
    const desc = new Set<string>();
    const stack = [rootId];
    while (stack.length) {
      const x = stack.pop()!;
      for (const c of childrenOf.get(x) ?? []) if (!desc.has(c)) { desc.add(c); stack.push(c); }
    }
    return desc;
  }
}
