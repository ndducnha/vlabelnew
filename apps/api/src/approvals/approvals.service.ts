import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/types';

type Action = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'LOCK';
const TARGET: Record<Action, string> = {
  APPROVE: 'APPROVED', REJECT: 'REJECTED', REQUEST_CHANGES: 'CHANGES_REQUESTED', LOCK: 'LOCKED',
};

@Injectable()
export class ApprovalsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  pending(user: AuthUser) {
    return this.prisma.eventRecord.findMany({
      where: { tenantId: user.tenantId, status: 'SUBMITTED', deletedAt: null },
      orderBy: { updatedAt: 'asc' },
      include: {
        values: true,
        eventDefinition: { select: { name: true, fields: true } },
        traceableItem: { select: { gtin: true, batchOrLot: true, product: { select: { name: true } } } },
        enteredBy: { select: { fullName: true } },
        media: true,
      },
    });
  }

  /** Hồ sơ đã duyệt (để khoá dữ liệu sau duyệt). */
  approved(user: AuthUser) {
    return this.prisma.eventRecord.findMany({
      where: { tenantId: user.tenantId, status: { in: ['APPROVED', 'LOCKED'] }, deletedAt: null },
      orderBy: { updatedAt: 'desc' }, take: 50,
      include: {
        values: true,
        eventDefinition: { select: { name: true, fields: true } },
        traceableItem: { select: { gtin: true, batchOrLot: true, product: { select: { name: true } } } },
        enteredBy: { select: { fullName: true } },
        media: true,
      },
    });
  }

  private async transition(user: AuthUser, id: string, action: Action, comment?: string) {
    const rec = await this.prisma.eventRecord.findFirst({ where: { id, tenantId: user.tenantId, deletedAt: null } });
    if (!rec) throw new NotFoundException('Không tìm thấy hồ sơ');

    if (action === 'LOCK' && rec.status !== 'APPROVED') throw new BadRequestException('Chỉ khóa hồ sơ đã duyệt');
    if (action !== 'LOCK' && rec.status !== 'SUBMITTED') throw new BadRequestException('Hồ sơ không ở trạng thái chờ duyệt');

    const toStatus = TARGET[action] as any;
    const updated = await this.prisma.eventRecord.update({
      where: { id },
      data: {
        status: toStatus,
        approvedByUserId: action === 'APPROVE' ? user.sub : rec.approvedByUserId,
        lockedAt: action === 'LOCK' ? new Date() : rec.lockedAt,
      },
    });
    await this.prisma.approvalHistory.create({
      data: { eventRecordId: id, actorUserId: user.sub, action, comment: comment ?? null, fromStatus: rec.status, toStatus },
    });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action, resource: 'event_record', resourceId: id, meta: { comment } });
    return updated;
  }

  approve(user: AuthUser, id: string, comment?: string) { return this.transition(user, id, 'APPROVE', comment); }
  reject(user: AuthUser, id: string, comment?: string) { return this.transition(user, id, 'REJECT', comment); }
  requestChanges(user: AuthUser, id: string, comment?: string) { return this.transition(user, id, 'REQUEST_CHANGES', comment); }
  lock(user: AuthUser, id: string) { return this.transition(user, id, 'LOCK'); }
}
