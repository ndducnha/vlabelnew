import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import type { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  async stats(@CurrentUser() user: AuthUser) {
    const t = user.tenantId;
    const [products, flows, pending, drafts, qr, scans] = await Promise.all([
      this.prisma.product.count({ where: { tenantId: t, deletedAt: null } }),
      this.prisma.flow.count({ where: { tenantId: t, deletedAt: null } }),
      this.prisma.eventRecord.count({ where: { tenantId: t, status: 'SUBMITTED', deletedAt: null } }),
      this.prisma.eventRecord.count({ where: { tenantId: t, status: 'DRAFT', deletedAt: null } }),
      this.prisma.qrCode.count({ where: { tenantId: t } }),
      this.prisma.qrScanLog.count({ where: { qrCode: { tenantId: t } } }),
    ]);
    return { products, flows, pendingApprovals: pending, drafts, qrCodes: qr, scans };
  }
}
