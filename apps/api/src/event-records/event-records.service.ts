import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PERMISSIONS, type EventRecordDraftInput } from '@vlabel/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/types';

@Injectable()
export class EventRecordsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  listMine(user: AuthUser) {
    return this.prisma.eventRecord.findMany({
      where: { tenantId: user.tenantId, enteredByUserId: user.sub, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      include: { eventDefinition: { select: { name: true } }, traceableItem: { select: { gtin: true, batchOrLot: true } } },
    });
  }

  async get(user: AuthUser, id: string) {
    const rec = await this.prisma.eventRecord.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: { values: true, media: true, eventDefinition: { include: { fields: true } }, approvals: { orderBy: { createdAt: 'asc' } } },
    });
    if (!rec) throw new NotFoundException('Không tìm thấy hồ sơ');
    return rec;
  }

  /** Gợi ý nhập liệu (§11): copy lần trước + auto user/org/time. */
  async suggestions(user: AuthUser, eventDefinitionId: string, traceableItemId?: string) {
    const previous = await this.prisma.eventRecord.findFirst({
      where: { tenantId: user.tenantId, eventDefinitionId, status: 'APPROVED', deletedAt: null },
      orderBy: { performedAt: 'desc' },
      include: { values: true },
    });
    const copyPrevious: Record<string, unknown> = {};
    if (previous) for (const v of previous.values) copyPrevious[v.fieldKey] = v.valueJson;
    return {
      performedByUserId: user.sub,
      organizationId: user.organizationId,
      performedAt: new Date().toISOString(),
      copyPrevious,
      hasPrevious: !!previous,
    };
  }

  private async assertEntryAllowed(user: AuthUser, eventDefinitionId: string) {
    const def = await this.prisma.eventDefinition.findFirst({
      where: { id: eventDefinitionId, flowVersion: { flow: { tenantId: user.tenantId } } },
      include: { flowVersion: { select: { flowId: true } } },
    });
    if (!def) throw new NotFoundException('Không tìm thấy Event');
    const roles = (def.enterRoleKeys as string[]) ?? [];
    const byRole = roles.some((r) => user.roles.includes(r));
    if (byRole) return def;
    // Phân quyền theo người: cấp toàn flow (eventDefinitionId null) hoặc riêng từng sự kiện.
    const perms = await this.prisma.flowPermission.findMany({ where: { userId: user.sub, flowId: def.flowVersion.flowId } });
    const byPerm = perms.some((p) => !p.eventDefinitionId || p.eventDefinitionId === eventDefinitionId);
    if (!byPerm) throw new ForbiddenException('Bạn chưa được cấp quyền kê khai sự kiện này');
    return def;
  }

  async createDraft(user: AuthUser, dto: EventRecordDraftInput) {
    await this.assertEntryAllowed(user, dto.eventDefinitionId);
    const item = await this.prisma.traceableItem.findFirst({ where: { id: dto.traceableItemId, tenantId: user.tenantId } });
    if (!item) throw new NotFoundException('Không tìm thấy lô/traceable item');

    const rec = await this.prisma.eventRecord.create({
      data: {
        tenantId: user.tenantId,
        organizationId: dto.organizationId ?? user.organizationId,
        traceableItemId: dto.traceableItemId,
        flowVersionId: dto.flowVersionId,
        eventDefinitionId: dto.eventDefinitionId,
        gtin: item.gtin,
        performedByUserId: dto.performedByUserId ?? user.sub,
        performedByName: dto.performedByName ?? null,
        enteredByUserId: user.sub,
        location: dto.location ?? null,
        gpsLat: dto.gpsLat ?? null,
        gpsLng: dto.gpsLng ?? null,
        performedAt: dto.performedAt ? new Date(dto.performedAt) : new Date(),
        action: dto.action ?? null,
        status: 'DRAFT',
        values: { create: Object.entries(dto.values ?? {}).map(([fieldKey, v]) => ({ fieldKey, valueJson: v as any })) },
        media: {
          create: (dto.media ?? []).map((m) => ({
            kind: m.kind, url: m.url, fileName: m.fileName ?? null,
            mimeType: m.mimeType ?? null, sizeBytes: m.sizeBytes ?? null,
            publicVisible: m.publicVisible ?? true,
          })),
        },
      },
      include: { values: true, media: true },
    });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'CREATE_DRAFT', resource: 'event_record', resourceId: rec.id });
    return rec;
  }

  /** Sửa hồ sơ truy xuất. Người nhập hoặc quản lý (flow:manage) đều sửa được, kể cả sau khi đã công khai. */
  async update(user: AuthUser, id: string, dto: EventRecordDraftInput) {
    const rec = await this.prisma.eventRecord.findFirst({ where: { id, tenantId: user.tenantId, deletedAt: null } });
    if (!rec) throw new NotFoundException('Không tìm thấy hồ sơ');
    const isManager = user.permissions.includes(PERMISSIONS.FLOW_MANAGE) || user.permissions.includes(PERMISSIONS.EVENT_DEF_MANAGE);
    if (rec.enteredByUserId !== user.sub && !isManager) throw new ForbiddenException('Không có quyền sửa hồ sơ này');
    if (rec.status === 'LOCKED') throw new BadRequestException('Hồ sơ đã khoá');

    await this.prisma.eventRecordValue.deleteMany({ where: { eventRecordId: id } });
    const updated = await this.prisma.eventRecord.update({
      where: { id },
      data: {
        performedByName: dto.performedByName ?? rec.performedByName,
        location: dto.location ?? rec.location,
        gpsLat: dto.gpsLat ?? rec.gpsLat,
        gpsLng: dto.gpsLng ?? rec.gpsLng,
        performedAt: dto.performedAt ? new Date(dto.performedAt) : rec.performedAt,
        action: dto.action ?? rec.action,
        values: { create: Object.entries(dto.values ?? {}).map(([fieldKey, v]) => ({ fieldKey, valueJson: v as any })) },
        ...(dto.media ? { media: { deleteMany: {}, create: dto.media.map((m) => ({ kind: m.kind, url: m.url, fileName: m.fileName ?? null, mimeType: m.mimeType ?? null, sizeBytes: m.sizeBytes ?? null, publicVisible: m.publicVisible ?? true })) } } : {}),
      },
      include: { values: true, media: true },
    });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'UPDATE_RECORD', resource: 'event_record', resourceId: id });
    return updated;
  }

  /** Danh sách hồ sơ truy xuất của một sản phẩm (mọi lô). */
  async listByProduct(user: AuthUser, productId: string) {
    return this.prisma.eventRecord.findMany({
      where: { tenantId: user.tenantId, traceableItem: { productId }, deletedAt: null },
      orderBy: [{ performedAt: 'asc' }],
      include: {
        eventDefinition: { select: { name: true, order: true, fields: { orderBy: { order: 'asc' } } } },
        values: true, media: true,
        performedBy: { select: { fullName: true } },
        traceableItem: { select: { batchOrLot: true } },
      },
    });
  }

  /** Xoá hồ sơ truy xuất (soft delete). */
  async remove(user: AuthUser, id: string) {
    const rec = await this.prisma.eventRecord.findFirst({ where: { id, tenantId: user.tenantId, deletedAt: null } });
    if (!rec) throw new NotFoundException('Không tìm thấy hồ sơ');
    const isManager = user.permissions.includes(PERMISSIONS.FLOW_MANAGE) || user.permissions.includes(PERMISSIONS.EVENT_DEF_MANAGE);
    if (rec.enteredByUserId !== user.sub && !isManager) throw new ForbiddenException('Không có quyền xoá hồ sơ này');
    await this.prisma.eventRecord.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'DELETE_RECORD', resource: 'event_record', resourceId: id });
    return { ok: true };
  }

  /** Hoàn tất kê khai: không cần duyệt nữa, dữ liệu công khai luôn (APPROVED). */
  async submit(user: AuthUser, id: string) {
    const rec = await this.prisma.eventRecord.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!rec) throw new NotFoundException('Không tìm thấy hồ sơ');
    if (rec.enteredByUserId !== user.sub) throw new ForbiddenException('Không phải hồ sơ của bạn');
    if (!['DRAFT', 'CHANGES_REQUESTED'].includes(rec.status)) throw new BadRequestException('Hồ sơ đã hoàn tất');

    const updated = await this.prisma.eventRecord.update({ where: { id }, data: { status: 'APPROVED', approvedByUserId: user.sub } });
    await this.prisma.approvalHistory.create({ data: { eventRecordId: id, actorUserId: user.sub, action: 'SUBMIT', fromStatus: rec.status, toStatus: 'APPROVED' } });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'DECLARE', resource: 'event_record', resourceId: id });
    return updated;
  }
}
