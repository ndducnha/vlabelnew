import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/types';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  list(user: AuthUser) {
    return this.prisma.user.findMany({
      where: { tenantId: user.tenantId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        roles: { include: { role: { select: { key: true, name: true } } } },
        organization: { select: { name: true } },
        scopes: true,
      },
    });
  }

  roles(user: AuthUser) {
    // Không cho gán PLATFORM_ADMIN (vai trò của chủ nền tảng).
    return this.prisma.role.findMany({
      where: { tenantId: user.tenantId, key: { not: 'PLATFORM_ADMIN' } },
      orderBy: { name: 'asc' },
    });
  }

  /** Đơn vị cấp 1 (level 0) tổ tiên của một đơn vị. */
  private async level1AncestorId(tenantId: string, orgId: string | null): Promise<string | null> {
    if (!orgId) return null;
    const all = await this.prisma.organization.findMany({ where: { tenantId, deletedAt: null }, select: { id: true, parentId: true } });
    const byId = new Map(all.map((o) => [o.id, o]));
    let cur = byId.get(orgId);
    const seen = new Set<string>();
    while (cur && cur.parentId && !seen.has(cur.id)) { seen.add(cur.id); cur = byId.get(cur.parentId); }
    return cur?.id ?? null;
  }

  private async branchOrgIds(tenantId: string, rootId: string): Promise<string[]> {
    const all = await this.prisma.organization.findMany({ where: { tenantId, deletedAt: null }, select: { id: true, parentId: true } });
    const childrenOf = new Map<string, string[]>();
    for (const o of all) if (o.parentId) { const a = childrenOf.get(o.parentId) ?? []; a.push(o.id); childrenOf.set(o.parentId, a); }
    const res = new Set<string>(); const stack = [rootId];
    while (stack.length) { const x = stack.pop()!; if (res.has(x)) continue; res.add(x); for (const c of childrenOf.get(x) ?? []) stack.push(c); }
    return [...res];
  }

  /** Người dùng CÙNG TỔ CHỨC CẤP 1 với người thao tác + tìm nhanh theo q (dùng cho phân quyền flow). */
  async listInBranch(user: AuthUser, q?: string) {
    const rootId = await this.level1AncestorId(user.tenantId, user.organizationId);
    const orgIds = rootId ? await this.branchOrgIds(user.tenantId, rootId) : null;
    return this.prisma.user.findMany({
      where: {
        tenantId: user.tenantId, deletedAt: null,
        ...(orgIds ? { organizationId: { in: orgIds } } : {}),
        ...(q ? { OR: [{ fullName: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : {}),
      },
      orderBy: { fullName: 'asc' },
      include: { organization: { select: { name: true } }, roles: { include: { role: { select: { key: true, name: true } } } } },
    });
  }

  /** Flow mà một user được phân quyền khai. */
  userFlowPermissions(user: AuthUser, userId: string) {
    return this.prisma.flowPermission.findMany({
      where: { tenantId: user.tenantId, userId },
      include: { flow: { select: { id: true, name: true } }, eventDefinition: { select: { name: true } } },
    });
  }

  async create(user: AuthUser, dto: { email: string; fullName: string; password: string; organizationId?: string; roleKeys?: string[]; scopeOrgIds?: string[] }) {
    const exists = await this.prisma.user.findFirst({ where: { tenantId: user.tenantId, email: dto.email } });
    if (exists) throw new BadRequestException('Email đã tồn tại trong tenant');

    const created = await this.prisma.user.create({
      data: {
        tenantId: user.tenantId,
        organizationId: dto.organizationId ?? null,
        email: dto.email,
        fullName: dto.fullName,
        passwordHash: bcrypt.hashSync(dto.password, 10),
      },
    });
    await this.assignRoles(user.tenantId, created.id, dto.roleKeys ?? []);
    for (const oid of dto.scopeOrgIds ?? []) {
      await this.prisma.userScope.create({ data: { userId: created.id, organizationId: oid } });
    }
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'CREATE', resource: 'user', resourceId: created.id, meta: { email: dto.email } });
    return { id: created.id };
  }

  async setRoles(user: AuthUser, userId: string, roleKeys: string[]) {
    const target = await this.prisma.user.findFirst({ where: { id: userId, tenantId: user.tenantId } });
    if (!target) throw new NotFoundException('Không tìm thấy người dùng');
    await this.prisma.userRole.deleteMany({ where: { userId } });
    await this.assignRoles(user.tenantId, userId, roleKeys);
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'ROLE_ASSIGN', resource: 'user', resourceId: userId, meta: { roleKeys } });
    return { ok: true };
  }

  private async assignRoles(tenantId: string, userId: string, roleKeys: string[]) {
    const roles = await this.prisma.role.findMany({ where: { tenantId, key: { in: roleKeys } } });
    for (const r of roles) {
      await this.prisma.userRole.create({ data: { userId, roleId: r.id } });
    }
  }
}
