import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PERMISSIONS } from '@vlabel/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/types';

const INCLUDE = {
  product: { select: { id: true, name: true, gtin: true } },
  assignedUser: { select: { id: true, fullName: true, email: true } },
  organization: { select: { name: true } },
  flow: { select: { id: true, name: true } },
};

@Injectable()
export class TraceTasksService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  /** Data-entry chỉ thấy nhiệm vụ của mình; quản lý thấy tất cả (trừ khi mine=1). */
  list(user: AuthUser, mine: boolean) {
    const isManager = user.permissions.includes(PERMISSIONS.FLOW_MANAGE);
    const where: any = { tenantId: user.tenantId, deletedAt: null };
    if (mine || !isManager) where.assignedUserId = user.sub;
    return this.prisma.traceTask.findMany({ where, orderBy: [{ status: 'asc' }, { endDate: 'asc' }], include: INCLUDE });
  }

  async create(user: AuthUser, dto: { name?: string; productId: string; lot?: string; flowId?: string; organizationId?: string; assignedUserId: string; startDate: string; endDate: string; note?: string }) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId, deletedAt: null } });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    const assignee = await this.prisma.user.findFirst({ where: { id: dto.assignedUserId, tenantId: user.tenantId, deletedAt: null } });
    if (!assignee) throw new NotFoundException('Không tìm thấy người được giao');

    const task = await this.prisma.traceTask.create({
      data: {
        tenantId: user.tenantId, name: dto.name ?? null, productId: dto.productId, lot: dto.lot ?? null,
        flowId: dto.flowId ?? null, organizationId: dto.organizationId ?? null, assignedUserId: dto.assignedUserId,
        startDate: new Date(dto.startDate), endDate: new Date(dto.endDate), note: dto.note ?? null, createdByUserId: user.sub,
      },
      include: INCLUDE,
    });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'CREATE', resource: 'trace_task', resourceId: task.id, meta: { assignedUserId: dto.assignedUserId } });
    return task;
  }

  async updateStatus(user: AuthUser, id: string, status: string) {
    const task = await this.prisma.traceTask.findFirst({ where: { id, tenantId: user.tenantId, deletedAt: null } });
    if (!task) throw new NotFoundException('Không tìm thấy nhiệm vụ');
    const isManager = user.permissions.includes(PERMISSIONS.FLOW_MANAGE);
    if (task.assignedUserId !== user.sub && !isManager) throw new ForbiddenException('Không phải nhiệm vụ của bạn');
    return this.prisma.traceTask.update({ where: { id }, data: { status }, include: INCLUDE });
  }

  async remove(user: AuthUser, id: string) {
    const task = await this.prisma.traceTask.findFirst({ where: { id, tenantId: user.tenantId, deletedAt: null } });
    if (!task) throw new NotFoundException('Không tìm thấy nhiệm vụ');
    await this.prisma.traceTask.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'DELETE', resource: 'trace_task', resourceId: id });
    return { ok: true };
  }
}
