import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OrgScopeService } from '../organizations/org-scope.service';
import type { AuthUser } from '../common/types';
import { sanitizeHtml } from './supplementary-labels.util';

type Dto = {
  productId?: string; name?: string; scope?: string; batchCode?: string;
  manufacturingDate?: string; expiryDate?: string; packagingDate?: string; serial?: string; note?: string;
  contentHtml?: string; labelSize?: string; orientation?: string; logoUrl?: string;
};

const INCLUDE = { product: { select: { id: true, name: true, gtin: true, image: true, organization: { select: { name: true } } } } };

@Injectable()
export class SupplementaryLabelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: OrgScopeService,
    private readonly audit: AuditService,
  ) {}

  async list(user: AuthUser, f: { productId?: string; gtin?: string; lot?: string; mfgDate?: string; status?: string }) {
    const scopeWhere = await this.scope.orgWhere(user);
    return this.prisma.supplementaryLabel.findMany({
      where: {
        tenantId: user.tenantId, deletedAt: null,
        product: { ...scopeWhere, ...(f.gtin ? { gtin: { contains: f.gtin } } : {}) },
        ...(f.productId ? { productId: f.productId } : {}),
        ...(f.lot ? { batchCode: { contains: f.lot } } : {}),
        ...(f.status ? { status: f.status } : {}),
        ...(f.mfgDate ? { manufacturingDate: new Date(f.mfgDate) } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: INCLUDE,
    });
  }

  async get(user: AuthUser, id: string) {
    const row = await this.prisma.supplementaryLabel.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: { ...INCLUDE, versions: { orderBy: { versionNumber: 'desc' } } },
    });
    if (!row) throw new NotFoundException('Không tìm thấy nhãn phụ');
    return row;
  }

  private async assertProduct(user: AuthUser, productId: string) {
    const p = await this.prisma.product.findFirst({ where: { id: productId, tenantId: user.tenantId, deletedAt: null } });
    if (!p) throw new NotFoundException('Không tìm thấy sản phẩm');
    return p;
  }

  async create(user: AuthUser, dto: Dto) {
    if (!dto.productId) throw new NotFoundException('Thiếu sản phẩm');
    await this.assertProduct(user, dto.productId);
    const row = await this.prisma.supplementaryLabel.create({
      data: {
        tenantId: user.tenantId, productId: dto.productId, name: dto.name || 'Nhãn phụ mới',
        scope: dto.scope ?? 'ALL', batchCode: dto.batchCode ?? null,
        manufacturingDate: dto.manufacturingDate ? new Date(dto.manufacturingDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        packagingDate: dto.packagingDate ? new Date(dto.packagingDate) : null,
        serial: dto.serial ?? null, note: dto.note ?? null,
        contentHtml: sanitizeHtml(dto.contentHtml ?? ''),
        labelSize: dto.labelSize ?? '80x50', orientation: dto.orientation ?? 'portrait', logoUrl: dto.logoUrl ?? null,
        createdByUserId: user.sub,
      },
      include: INCLUDE,
    });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'CREATE', resource: 'supplementary_label', resourceId: row.id });
    return row;
  }

  async update(user: AuthUser, id: string, dto: Dto) {
    await this.get(user, id);
    return this.prisma.supplementaryLabel.update({
      where: { id },
      data: {
        name: dto.name, scope: dto.scope, batchCode: dto.batchCode,
        manufacturingDate: dto.manufacturingDate !== undefined ? (dto.manufacturingDate ? new Date(dto.manufacturingDate) : null) : undefined,
        expiryDate: dto.expiryDate !== undefined ? (dto.expiryDate ? new Date(dto.expiryDate) : null) : undefined,
        packagingDate: dto.packagingDate !== undefined ? (dto.packagingDate ? new Date(dto.packagingDate) : null) : undefined,
        serial: dto.serial, note: dto.note,
        contentHtml: dto.contentHtml !== undefined ? sanitizeHtml(dto.contentHtml) : undefined,
        labelSize: dto.labelSize, orientation: dto.orientation, logoUrl: dto.logoUrl,
      },
      include: INCLUDE,
    });
  }

  async clone(user: AuthUser, id: string) {
    const src = await this.get(user, id);
    return this.prisma.supplementaryLabel.create({
      data: {
        tenantId: user.tenantId, productId: src.productId, name: `${src.name} (bản sao)`,
        scope: src.scope, batchCode: src.batchCode, manufacturingDate: src.manufacturingDate, expiryDate: src.expiryDate,
        packagingDate: src.packagingDate, serial: src.serial, note: src.note, contentHtml: src.contentHtml,
        labelSize: src.labelSize, orientation: src.orientation, logoUrl: src.logoUrl, createdByUserId: user.sub,
      },
      include: INCLUDE,
    });
  }

  async setStatus(user: AuthUser, id: string, status: string) {
    const row = await this.get(user, id);
    if (!['draft', 'published', 'archived'].includes(status)) throw new NotFoundException('Trạng thái không hợp lệ');
    if (status === 'published') {
      await this.prisma.supplementaryLabelVersion.create({
        data: { labelId: id, versionNumber: row.version, contentHtml: row.contentHtml, createdByUserId: user.sub },
      });
      await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'PUBLISH', resource: 'supplementary_label', resourceId: id });
      return this.prisma.supplementaryLabel.update({ where: { id }, data: { status: 'published', version: row.version + 1 }, include: INCLUDE });
    }
    return this.prisma.supplementaryLabel.update({ where: { id }, data: { status }, include: INCLUDE });
  }

  async remove(user: AuthUser, id: string) {
    await this.get(user, id);
    await this.prisma.supplementaryLabel.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }
}
