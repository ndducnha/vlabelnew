import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditInput {
  tenantId?: string | null;
  actorUserId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  meta?: Record<string, unknown>;
  ip?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditInput) {
    await this.prisma.auditLog.create({
      data: {
        tenantId: input.tenantId ?? null,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId ?? null,
        meta: (input.meta ?? {}) as any,
        ip: input.ip ?? null,
      },
    });
  }

  list(tenantId: string, take = 100) {
    return this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take,
      include: { actor: { select: { fullName: true, email: true } } },
    });
  }
}
