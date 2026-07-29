import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { validateGtin } from '@vlabel/shared';
import type { CreateTraceableItemInput } from '@vlabel/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OrgScopeService } from '../organizations/org-scope.service';
import type { AuthUser } from '../common/types';

@Injectable()
export class TraceableItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly scope: OrgScopeService,
  ) {}

  async list(user: AuthUser, productId?: string) {
    const scopeWhere = await this.scope.orgWhere(user);
    return this.prisma.traceableItem.findMany({
      where: { tenantId: user.tenantId, deletedAt: null, ...scopeWhere, ...(productId ? { productId } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { name: true, gtin: true } } },
    });
  }

  /** Đảm bảo có Traceable Item cho (sản phẩm, lô). Không có lô = item mức sản phẩm. */
  async ensureForProduct(user: AuthUser, productId: string, lot?: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId: user.tenantId, deletedAt: null } });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    const existing = await this.prisma.traceableItem.findFirst({
      where: { tenantId: user.tenantId, productId, deletedAt: null, batchOrLot: lot ?? null }, orderBy: { createdAt: 'asc' },
      include: { product: { select: { name: true, gtin: true } } },
    });
    if (existing) return existing;
    return this.prisma.traceableItem.create({
      data: { tenantId: user.tenantId, organizationId: product.organizationId, productId, gtin: product.gtin, batchOrLot: lot ?? null },
      include: { product: { select: { name: true, gtin: true } } },
    });
  }

  /** Quét QR để kê khai: giải mã gtin/lot/serial → tìm lô tương ứng. */
  async resolve(user: AuthUser, gtin: string, lot?: string, serial?: string) {
    const item = await this.prisma.traceableItem.findFirst({
      where: {
        tenantId: user.tenantId, gtin, deletedAt: null,
        ...(lot ? { batchOrLot: lot } : {}),
        ...(serial ? { serialNumber: serial } : {}),
      },
      include: { product: { select: { name: true, gtin: true } } },
    });
    if (!item) throw new NotFoundException('Không tìm thấy lô cho mã QR này');
    return item;
  }

  async create(user: AuthUser, dto: CreateTraceableItemInput) {
    const r = validateGtin(dto.gtin);
    if (!r.valid) throw new BadRequestException(r.message ?? 'GTIN không hợp lệ');
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

    const item = await this.prisma.traceableItem.create({
      data: {
        tenantId: user.tenantId, organizationId: dto.organizationId, productId: dto.productId,
        gtin: r.normalized, batchOrLot: dto.batchOrLot ?? null, serialNumber: dto.serialNumber ?? null,
      },
    });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'CREATE', resource: 'traceable_item', resourceId: item.id });
    return item;
  }
}
