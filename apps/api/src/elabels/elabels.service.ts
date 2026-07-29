import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OrgScopeService } from '../organizations/org-scope.service';
import { appendixGroupByCode } from '@vlabel/shared';
import type { AuthUser } from '../common/types';

type LabelDto = {
  name?: string; brand?: string; description?: string; countryOfOrigin?: string; hsCode?: string;
  targetMarket?: string; supplier?: string; riskLevel?: number;
  netContent?: string; ingredients?: string; usageInstructions?: string; storageInstructions?: string; safetyWarnings?: string;
  appendixGroup?: string; appendixAttributes?: Record<string, unknown>;
  labelImages?: unknown; certificates?: unknown; labelAttributes?: unknown; ownerInfo?: unknown;
};
type BatchDto = { batchCode?: string; manufacturingDate?: string; totalQuantity?: number; status?: string; attributes?: unknown };

@Injectable()
export class ElabelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: OrgScopeService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async list(user: AuthUser, status?: string) {
    const scopeWhere = await this.scope.orgWhere(user);
    const rows = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, deletedAt: null, ...scopeWhere, ...(status ? { elabelStatus: status } : {}) },
      orderBy: { updatedAt: 'desc' },
      include: { organization: { select: { name: true } }, _count: { select: { batches: { where: { deletedAt: null } } } } },
    });
    return rows.map(({ _count, ...p }) => ({ ...p, batchCount: _count.batches }));
  }

  async get(user: AuthUser, id: string) {
    const p = await this.prisma.product.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: { organization: { select: { name: true } }, batches: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } } },
    });
    if (!p) throw new NotFoundException('Không tìm thấy nhãn');
    return p;
  }

  async updateLabel(user: AuthUser, id: string, dto: LabelDto) {
    await this.assert(user, id);
    const p = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name, brand: dto.brand, description: dto.description, countryOfOrigin: dto.countryOfOrigin,
        hsCode: dto.hsCode, targetMarket: dto.targetMarket, supplier: dto.supplier,
        netContent: dto.netContent, ingredients: dto.ingredients, usageInstructions: dto.usageInstructions,
        storageInstructions: dto.storageInstructions, safetyWarnings: dto.safetyWarnings,
        appendixGroup: dto.appendixGroup,
        appendixAttributes: dto.appendixAttributes !== undefined ? (dto.appendixAttributes as any) : undefined,
        riskLevel: typeof dto.riskLevel === 'number' ? dto.riskLevel : undefined,
        labelImages: dto.labelImages !== undefined ? (dto.labelImages as any) : undefined,
        certificates: dto.certificates !== undefined ? (dto.certificates as any) : undefined,
        labelAttributes: dto.labelAttributes !== undefined ? (dto.labelAttributes as any) : undefined,
        ownerInfo: dto.ownerInfo !== undefined ? (dto.ownerInfo as any) : undefined,
      },
    });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'ELABEL_UPDATE', resource: 'product', resourceId: id });
    return p;
  }

  /**
   * Bộ tiêu chí tuân thủ Nghị định 37/2026/NĐ-CP để công bố nhãn.
   * required tùy mức rủi ro: cao (1) buộc truy xuất + kết nối cổng quốc gia; trung bình (2) buộc cảnh báo an toàn.
   */
  private complianceItems(p: any, publishedBatches: number) {
    const o = (p.ownerInfo as any) ?? {};
    const risk = p.riskLevel ?? 0;
    const group = appendixGroupByCode(p.appendixGroup);
    const av = (p.appendixAttributes as any) ?? {};
    const appendixMissing = group ? group.fields.filter((f) => f.required && !av[f.key]) : [];
    return [
      { key: 'name', label: 'Tên sản phẩm', met: !!p.name, required: true },
      { key: 'netContent', label: 'Định lượng (khối lượng/thể tích/số lượng)', met: !!p.netContent, required: false },
      { key: 'ingredients', label: 'Thành phần / cấu tạo', met: !!p.ingredients, required: true },
      { key: 'usage', label: 'Hướng dẫn sử dụng', met: !!p.usageInstructions, required: false },
      { key: 'storage', label: 'Hướng dẫn bảo quản', met: !!p.storageInstructions, required: false },
      { key: 'warnings', label: 'Cảnh báo an toàn', met: !!p.safetyWarnings, required: risk === 1 || risk === 2 },
      { key: 'owner', label: 'Tên và địa chỉ tổ chức chịu trách nhiệm', met: !!(o.name && o.address), required: true },
      { key: 'group', label: 'Phân nhóm hàng hóa (Phụ lục I)', met: !!group, required: true },
      { key: 'appendix', label: group ? `Đủ trường bắt buộc nhóm "${group.name}"` : 'Đủ trường bắt buộc theo nhóm hàng hóa', met: !!group && appendixMissing.length === 0, required: true },
      { key: 'trace', label: 'Có lô truy xuất nguồn gốc', met: publishedBatches > 0, required: risk === 1 },
      { key: 'portal', label: 'Đã kết nối Cổng truy xuất nguồn gốc quốc gia', met: !!p.portalConnected, required: risk === 1 },
    ];
  }

  async compliance(user: AuthUser, id: string) {
    const p = await this.assert(user, id);
    const publishedBatches = await this.prisma.productBatch.count({ where: { productId: id, deletedAt: null, status: 'published' } });
    const items = this.complianceItems(p, publishedBatches);
    const missing = items.filter((i) => i.required && !i.met);
    return { riskLevel: p.riskLevel ?? 0, portalConnected: p.portalConnected, canPublish: missing.length === 0, items, missing };
  }

  /** Kết nối / chia sẻ dữ liệu với Cổng truy xuất nguồn gốc quốc gia (mock, API thật sau). */
  async portalSync(user: AuthUser, id: string) {
    await this.assert(user, id);
    const updated = await this.prisma.product.update({ where: { id }, data: { portalConnected: true, portalSyncedAt: new Date() } });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'ELABEL_PORTAL_SYNC', resource: 'product', resourceId: id });
    return { ok: true, portalConnected: true, portalSyncedAt: updated.portalSyncedAt };
  }

  async setStatus(user: AuthUser, id: string, status: string, recallReason?: string) {
    const product = await this.assert(user, id);
    if (!['draft', 'published', 'recalled'].includes(status)) throw new NotFoundException('Trạng thái không hợp lệ');
    // Kiểm tra tuân thủ NĐ 37 trước khi công bố
    if (status === 'published') {
      const publishedBatches = await this.prisma.productBatch.count({ where: { productId: id, deletedAt: null, status: 'published' } });
      const missing = this.complianceItems(product, publishedBatches).filter((i) => i.required && !i.met);
      if (missing.length) throw new BadRequestException(`Chưa đủ điều kiện công bố theo NĐ 37: ${missing.map((m) => m.label).join(', ')}`);
    }
    const data: any = { elabelStatus: status };
    if (status === 'published') data.publishedAt = new Date();
    if (status === 'recalled') data.recallReason = recallReason ?? null;
    const updated = await this.prisma.product.update({ where: { id }, data });
    // Thu hồi sản phẩm ⇒ thu hồi cả lô con
    if (status === 'recalled') {
      await this.prisma.productBatch.updateMany({ where: { productId: id, deletedAt: null }, data: { status: 'recalled', recallReason: recallReason ?? null } });
    }
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: `ELABEL_${status.toUpperCase()}`, resource: 'product', resourceId: id });
    return updated;
  }

  // ── Lô ──
  async addBatch(user: AuthUser, id: string, dto: BatchDto) {
    const product = await this.assert(user, id);
    if (!dto.batchCode) throw new NotFoundException('Thiếu số lô');
    return this.prisma.productBatch.create({
      data: {
        tenantId: user.tenantId, productId: id, batchCode: dto.batchCode,
        manufacturingDate: dto.manufacturingDate ? new Date(dto.manufacturingDate) : null,
        totalQuantity: typeof dto.totalQuantity === 'number' ? dto.totalQuantity : null,
        status: dto.status ?? 'draft',
        attributes: (dto.attributes as any) ?? [],
        traceabilityUrl: this.buildLotUrl(product.gtin, dto.batchCode, (product.ownerInfo as any)?.tax_code),
      },
    });
  }

  async updateBatch(user: AuthUser, id: string, batchId: string, dto: BatchDto) {
    const product = await this.assert(user, id);
    await this.assertBatch(id, batchId);
    return this.prisma.productBatch.update({
      where: { id: batchId },
      data: {
        batchCode: dto.batchCode,
        manufacturingDate: dto.manufacturingDate !== undefined ? (dto.manufacturingDate ? new Date(dto.manufacturingDate) : null) : undefined,
        totalQuantity: dto.totalQuantity !== undefined ? (dto.totalQuantity as any) : undefined,
        attributes: dto.attributes !== undefined ? (dto.attributes as any) : undefined,
        ...(dto.batchCode ? { traceabilityUrl: this.buildLotUrl(product.gtin, dto.batchCode, (product.ownerInfo as any)?.tax_code) } : {}),
      },
    });
  }

  async setBatchStatus(user: AuthUser, id: string, batchId: string, status: string, recallReason?: string) {
    await this.assert(user, id);
    await this.assertBatch(id, batchId);
    if (!['draft', 'published', 'recalled'].includes(status)) throw new NotFoundException('Trạng thái không hợp lệ');
    return this.prisma.productBatch.update({ where: { id: batchId }, data: { status, recallReason: status === 'recalled' ? recallReason ?? null : null } });
  }

  async removeBatch(user: AuthUser, id: string, batchId: string) {
    await this.assert(user, id);
    await this.assertBatch(id, batchId);
    await this.prisma.productBatch.update({ where: { id: batchId }, data: { deletedAt: new Date() } });
    return { ok: true };
  }

  async batchQr(user: AuthUser, id: string, batchId: string) {
    const product = await this.assert(user, id);
    const batch = await this.assertBatch(id, batchId);
    const base = this.config.get<string>('PUBLIC_BASE_URL', 'http://localhost:5173');
    const url = `${base}/t/${product.gtin}?lot=${encodeURIComponent(batch.batchCode)}`;
    const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 512 });
    return { url, dataUrl, batchCode: batch.batchCode, traceabilityUrl: batch.traceabilityUrl };
  }

  private buildLotUrl(gtin: string, lot: string, taxCode?: string) {
    // GS1 Digital Link cho Cổng truy xuất quốc gia: host qr.txng.gov.vn, path /01/{gtin}/10/{lot}
    const base = this.config.get<string>('TXNG_QR_BASE', 'https://qr.txng.gov.vn');
    return `${base}/01/${gtin}/10/${encodeURIComponent(lot)}${taxCode ? `?8000=${taxCode}` : ''}`;
  }

  private async assert(user: AuthUser, id: string) {
    const p = await this.prisma.product.findFirst({ where: { id, tenantId: user.tenantId, deletedAt: null } });
    if (!p) throw new NotFoundException('Không tìm thấy nhãn');
    return p;
  }

  private async assertBatch(productId: string, batchId: string) {
    const b = await this.prisma.productBatch.findFirst({ where: { id: batchId, productId, deletedAt: null } });
    if (!b) throw new NotFoundException('Không tìm thấy lô');
    return b;
  }
}
