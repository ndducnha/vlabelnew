import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { FieldType } from '@vlabel/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/types';

@Injectable()
export class FlowsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async list(user: AuthUser, opts?: { q?: string; organizationId?: string; page?: number; pageSize?: number }) {
    const where: any = { tenantId: user.tenantId, deletedAt: null };
    if (opts?.organizationId) where.orgLinks = { some: { organizationId: opts.organizationId } };
    if (opts?.q) where.OR = [{ name: { contains: opts.q, mode: 'insensitive' } }, { code: { contains: opts.q, mode: 'insensitive' } }];
    const include = {
      orgLinks: { include: { organization: { select: { id: true, name: true } } } },
      versions: {
        orderBy: { version: 'desc' as const },
        include: { eventDefinitions: { orderBy: { order: 'asc' as const }, include: { fields: { orderBy: { order: 'asc' as const } } } } },
      },
      _count: { select: { products: true } },
    };
    // Có phân trang khi truyền page (màn quản lý); ngược lại trả toàn bộ (wizard/kê khai).
    if (opts?.page) {
      const page = Math.max(1, Number(opts.page));
      const pageSize = Math.min(50, Math.max(1, Number(opts.pageSize ?? 10)));
      const [items, total] = await Promise.all([
        this.prisma.flow.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
        this.prisma.flow.count({ where }),
      ]);
      return { items, total, page, pageSize };
    }
    return this.prisma.flow.findMany({ where, include, orderBy: { createdAt: 'desc' } });
  }

  async get(user: AuthUser, id: string) {
    const flow = await this.prisma.flow.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: {
        orgLinks: { include: { organization: { select: { id: true, name: true } } } },
        versions: { orderBy: { version: 'desc' }, include: { eventDefinitions: { orderBy: { order: 'asc' }, include: { fields: { orderBy: { order: 'asc' } } } } } },
      },
    });
    if (!flow) throw new NotFoundException('Không tìm thấy Flow');
    return flow;
  }

  // ───────── Authoring (Manager) ─────────
  async createFlow(user: AuthUser, dto: { name: string; code: string; categoryId?: string; organizationIds?: string[] }) {
    const orgIds = await this.validOrgIds(user, dto.organizationIds);
    const flow = await this.prisma.flow.create({
      data: {
        tenantId: user.tenantId, name: dto.name, code: dto.code, categoryId: dto.categoryId ?? null,
        versions: { create: { version: 1, isPublished: false } },
        orgLinks: orgIds.length ? { create: orgIds.map((organizationId) => ({ organizationId })) } : undefined,
      },
      include: { versions: true, orgLinks: { include: { organization: { select: { id: true, name: true } } } } },
    });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'CREATE', resource: 'flow', resourceId: flow.id });
    return flow;
  }

  /** Lọc org id hợp lệ trong tenant. */
  private async validOrgIds(user: AuthUser, ids?: string[]): Promise<string[]> {
    if (!ids?.length) return [];
    const orgs = await this.prisma.organization.findMany({ where: { id: { in: ids }, tenantId: user.tenantId, deletedAt: null }, select: { id: true } });
    return orgs.map((o) => o.id);
  }

  /** Xoá (soft delete) Flow. Trả về số tổ chức flow đang thuộc để cảnh báo. */
  async deleteFlow(user: AuthUser, flowId: string) {
    const flow = await this.prisma.flow.findFirst({ where: { id: flowId, tenantId: user.tenantId, deletedAt: null }, include: { orgLinks: true } });
    if (!flow) throw new NotFoundException('Không tìm thấy Flow');
    const productCount = await this.prisma.productFlow.count({ where: { flowId } });
    // Dọn sạch liên kết để không còn sản phẩm nào trỏ tới flow đã xoá (tránh kê khai lỗi).
    await this.prisma.$transaction([
      this.prisma.productFlow.deleteMany({ where: { flowId } }),
      this.prisma.flowPermission.deleteMany({ where: { flowId } }),
      this.prisma.flowOrganization.deleteMany({ where: { flowId } }),
      this.prisma.flow.update({ where: { id: flowId }, data: { deletedAt: new Date() } }),
    ]);
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'DELETE', resource: 'flow', resourceId: flowId, meta: { orgCount: flow.orgLinks.length, productCount } });
    return { ok: true, orgCount: flow.orgLinks.length, productCount };
  }

  async updateFlow(user: AuthUser, flowId: string, dto: { name?: string; code?: string; categoryId?: string; organizationIds?: string[] }) {
    const flow = await this.prisma.flow.findFirst({ where: { id: flowId, tenantId: user.tenantId, deletedAt: null } });
    if (!flow) throw new NotFoundException('Không tìm thấy Flow');
    if (dto.code && dto.code !== flow.code) {
      const dup = await this.prisma.flow.findFirst({ where: { tenantId: user.tenantId, code: dto.code, deletedAt: null } });
      if (dup) throw new BadRequestException('Mã Flow đã tồn tại');
    }
    await this.prisma.flow.update({
      where: { id: flowId },
      data: { name: dto.name, code: dto.code, categoryId: dto.categoryId },
    });
    // Gán lại danh sách tổ chức (nhiều-nhiều) nếu có truyền
    if (dto.organizationIds) {
      const orgIds = await this.validOrgIds(user, dto.organizationIds);
      await this.prisma.flowOrganization.deleteMany({ where: { flowId } });
      for (const organizationId of orgIds) await this.prisma.flowOrganization.create({ data: { flowId, organizationId } });
    }
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'UPDATE', resource: 'flow', resourceId: flowId });
    return this.get(user, flowId);
  }

  /** Nhân bản toàn bộ Flow (bản version mới nhất + sự kiện + trường). */
  async cloneFlow(user: AuthUser, flowId: string) {
    const flow = await this.prisma.flow.findFirst({
      where: { id: flowId, tenantId: user.tenantId, deletedAt: null },
      include: {
        orgLinks: true,
        versions: { orderBy: { version: 'desc' }, take: 1, include: { eventDefinitions: { orderBy: { order: 'asc' }, include: { fields: { orderBy: { order: 'asc' } } } } } },
      },
    });
    if (!flow) throw new NotFoundException('Không tìm thấy Flow');

    // mã duy nhất: <code>-COPY, -COPY2, ...
    let code = `${flow.code}-COPY`;
    for (let i = 2; await this.prisma.flow.findFirst({ where: { tenantId: user.tenantId, code, deletedAt: null } }); i++) {
      code = `${flow.code}-COPY${i}`;
    }

    const src = flow.versions[0];
    const created = await this.prisma.flow.create({
      data: {
        tenantId: user.tenantId, name: `${flow.name} (bản sao)`, code, categoryId: flow.categoryId,
        publicConfig: flow.publicConfig as any,
        orgLinks: flow.orgLinks.length ? { create: flow.orgLinks.map((l) => ({ organizationId: l.organizationId })) } : undefined,
        versions: {
          create: {
            version: 1, isPublished: false,
            eventDefinitions: src ? {
              create: src.eventDefinitions.map((ev) => ({
                name: ev.name, code: ev.code, order: ev.order, required: ev.required, allowRepeat: ev.allowRepeat,
                enterRoleKeys: ev.enterRoleKeys as any, approveRoleKeys: ev.approveRoleKeys as any,
                preconditions: ev.preconditions as any, suggestionConfig: ev.suggestionConfig as any, publicConfig: ev.publicConfig as any,
                fields: { create: ev.fields.map((f) => ({ key: f.key, label: f.label, type: f.type, required: f.required, options: f.options as any, order: f.order, publicVisible: f.publicVisible })) },
              })),
            } : undefined,
          },
        },
      },
      include: { versions: { include: { eventDefinitions: { include: { fields: true } } } } },
    });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'CLONE', resource: 'flow', resourceId: created.id, meta: { from: flowId } });
    return created;
  }

  private async assertFlowVersion(user: AuthUser, flowVersionId: string) {
    const v = await this.prisma.flowVersion.findFirst({ where: { id: flowVersionId, flow: { tenantId: user.tenantId } } });
    if (!v) throw new NotFoundException('Không tìm thấy phiên bản Flow');
    return v;
  }

  async addEvent(user: AuthUser, flowVersionId: string, dto: { name: string; code: string; required?: boolean; enterRoleKeys?: string[]; approveRoleKeys?: string[] }) {
    await this.assertFlowVersion(user, flowVersionId);
    const count = await this.prisma.eventDefinition.count({ where: { flowVersionId } });
    return this.prisma.eventDefinition.create({
      data: {
        flowVersionId, name: dto.name, code: dto.code, order: count + 1,
        required: dto.required ?? true,
        enterRoleKeys: (dto.enterRoleKeys ?? []) as any,
        approveRoleKeys: (dto.approveRoleKeys ?? []) as any,
      },
      include: { fields: true },
    });
  }

  private async assertEvent(user: AuthUser, eventId: string) {
    const ev = await this.prisma.eventDefinition.findFirst({ where: { id: eventId, flowVersion: { flow: { tenantId: user.tenantId } } } });
    if (!ev) throw new NotFoundException('Không tìm thấy Event');
    return ev;
  }

  async updateEvent(user: AuthUser, eventId: string, dto: { name?: string; order?: number; required?: boolean; enterRoleKeys?: string[]; approveRoleKeys?: string[]; publicConfig?: Record<string, boolean> }) {
    await this.assertEvent(user, eventId);
    return this.prisma.eventDefinition.update({
      where: { id: eventId },
      data: {
        name: dto.name, order: dto.order, required: dto.required,
        enterRoleKeys: dto.enterRoleKeys ? (dto.enterRoleKeys as any) : undefined,
        approveRoleKeys: dto.approveRoleKeys ? (dto.approveRoleKeys as any) : undefined,
        publicConfig: dto.publicConfig ? (dto.publicConfig as any) : undefined,
      },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
  }

  async deleteEvent(user: AuthUser, eventId: string) {
    const ev = await this.assertEvent(user, eventId);
    await this.prisma.eventField.deleteMany({ where: { eventDefinitionId: eventId } });
    await this.prisma.flowPermission.deleteMany({ where: { eventDefinitionId: eventId } });
    await this.prisma.eventDefinition.delete({ where: { id: eventId } });
    // Đánh lại số thứ tự sự kiện cho liền mạch (1, 2, 3, …)
    const remaining = await this.prisma.eventDefinition.findMany({
      where: { flowVersionId: ev.flowVersionId }, orderBy: { order: 'asc' },
    });
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].order !== i + 1) {
        await this.prisma.eventDefinition.update({ where: { id: remaining[i].id }, data: { order: i + 1 } });
      }
    }
    return { ok: true };
  }

  async addField(user: AuthUser, eventId: string, dto: { key: string; label: string; type: FieldType; required?: boolean; publicVisible?: boolean; options?: string[] }) {
    await this.assertEvent(user, eventId);
    const count = await this.prisma.eventField.count({ where: { eventDefinitionId: eventId } });
    return this.prisma.eventField.create({
      data: {
        eventDefinitionId: eventId, key: dto.key, label: dto.label, type: dto.type,
        required: dto.required ?? false, publicVisible: dto.publicVisible ?? false,
        options: (dto.options ?? []) as any, order: count,
      },
    });
  }

  private async assertField(user: AuthUser, fieldId: string) {
    const f = await this.prisma.eventField.findFirst({ where: { id: fieldId, eventDefinition: { flowVersion: { flow: { tenantId: user.tenantId } } } } });
    if (!f) throw new NotFoundException('Không tìm thấy field');
    return f;
  }

  /** Dùng cho cả sửa field lẫn bật/tắt hiển thị công khai (public visibility). */
  async updateField(user: AuthUser, fieldId: string, dto: { label?: string; required?: boolean; publicVisible?: boolean; options?: string[] }) {
    await this.assertField(user, fieldId);
    return this.prisma.eventField.update({
      where: { id: fieldId },
      data: { label: dto.label, required: dto.required, publicVisible: dto.publicVisible, options: dto.options ? (dto.options as any) : undefined },
    });
  }

  async deleteField(user: AuthUser, fieldId: string) {
    await this.assertField(user, fieldId);
    await this.prisma.eventField.delete({ where: { id: fieldId } });
    return { ok: true };
  }

  async publish(user: AuthUser, flowId: string) {
    const flow = await this.prisma.flow.findFirst({ where: { id: flowId, tenantId: user.tenantId }, include: { versions: { orderBy: { version: 'desc' }, take: 1 } } });
    if (!flow || !flow.versions[0]) throw new NotFoundException('Không tìm thấy Flow');
    await this.prisma.flowVersion.update({ where: { id: flow.versions[0].id }, data: { isPublished: true } });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'PUBLISH', resource: 'flow', resourceId: flowId });
    return { ok: true };
  }

  // ───────── Phân quyền theo luồng (ai khai flow/event nào) ─────────
  listPermissions(user: AuthUser, flowId: string) {
    return this.prisma.flowPermission.findMany({
      where: { flowId, tenantId: user.tenantId },
      include: { user: { select: { id: true, fullName: true, email: true } }, eventDefinition: { select: { name: true } } },
    });
  }

  async assignPermission(user: AuthUser, flowId: string, dto: { userId: string; eventDefinitionId?: string }) {
    const flow = await this.prisma.flow.findFirst({ where: { id: flowId, tenantId: user.tenantId } });
    if (!flow) throw new NotFoundException('Không tìm thấy Flow');
    const existing = await this.prisma.flowPermission.findFirst({
      where: { userId: dto.userId, flowId, eventDefinitionId: dto.eventDefinitionId ?? null },
    });
    if (existing) return existing;
    return this.prisma.flowPermission.create({
      data: { tenantId: user.tenantId, userId: dto.userId, flowId, eventDefinitionId: dto.eventDefinitionId ?? null },
    });
  }

  async removePermission(user: AuthUser, permId: string) {
    const p = await this.prisma.flowPermission.findFirst({ where: { id: permId, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Không tìm thấy phân quyền');
    await this.prisma.flowPermission.delete({ where: { id: permId } });
    return { ok: true };
  }

  /**
   * Event mà user được phép nhập trong 1 flow version.
   * Cho phép nếu: (a) role của user nằm trong enterRoleKeys, HOẶC (b) user được gán FlowPermission.
   */
  async entryEvents(user: AuthUser, flowVersionId: string) {
    const version = await this.prisma.flowVersion.findFirst({ where: { id: flowVersionId, flow: { tenantId: user.tenantId } } });
    if (!version) return [];
    const defs = await this.prisma.eventDefinition.findMany({
      where: { flowVersionId }, orderBy: { order: 'asc' }, include: { fields: { orderBy: { order: 'asc' } } },
    });
    const perms = await this.prisma.flowPermission.findMany({ where: { userId: user.sub, flowId: version.flowId } });
    const allFlow = perms.some((p) => !p.eventDefinitionId);
    const allowedEventIds = new Set(perms.filter((p) => p.eventDefinitionId).map((p) => p.eventDefinitionId));
    return defs.filter((d) => {
      const roles = (d.enterRoleKeys as string[]) ?? [];
      const byRole = roles.some((r) => user.roles.includes(r));
      const byPerm = allFlow || allowedEventIds.has(d.id);
      return byRole || byPerm;
    });
  }
}
