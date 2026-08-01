import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { validateGtin } from '@vlabel/shared';
import type { CreateProductManualInput, ImportFromVnpcInput } from '@vlabel/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { VnpcService } from '../vnpc/vnpc.service';
import { OrgScopeService } from '../organizations/org-scope.service';
import type { AuthUser } from '../common/types';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vnpc: VnpcService,
    private readonly audit: AuditService,
    private readonly scope: OrgScopeService,
    private readonly config: ConfigService,
  ) {}

  /** Tra sản phẩm theo GTIN trong phạm vi của user (dùng khi quét QR). */
  async findByGtin(user: AuthUser, gtin: string) {
    const scopeWhere = await this.scope.orgWhere(user);
    const product = await this.prisma.product.findFirst({
      where: { tenantId: user.tenantId, gtin, deletedAt: null, ...scopeWhere },
      include: { organization: { select: { name: true } }, flows: { include: { flow: { select: { id: true, name: true } } } } },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm cho mã QR này trong phạm vi của bạn');
    return product;
  }

  /**
   * QR của sản phẩm. Không truyền lot: QR chung /t/{gtin} (chế độ SHARED).
   * Truyền lot: QR riêng cho lô /t/{gtin}?lot={lot} (chế độ PER_LOT).
   */
  async qrImage(user: AuthUser, id: string, lot?: string) {
    const product = await this.prisma.product.findFirst({ where: { id, tenantId: user.tenantId, deletedAt: null } });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    const base = this.config.get<string>('PUBLIC_BASE_URL', 'http://localhost:5173');
    const path = `/t/${product.gtin}${lot ? `?lot=${encodeURIComponent(lot)}` : ''}`;
    const url = `${base}${path}`;
    const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 512 });
    return { gtin: product.gtin, lot: lot ?? null, traceMode: product.traceMode, url, dataUrl };
  }

  async list(user: AuthUser, organizationId?: string) {
    const scopeWhere = await this.scope.orgWhere(user);
    return this.prisma.product.findMany({
      where: { tenantId: user.tenantId, deletedAt: null, ...scopeWhere, ...(organizationId ? { organizationId } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { category: true, organization: { select: { name: true } }, flows: { include: { flow: { select: { id: true, name: true } } } } },
    });
  }

  async get(user: AuthUser, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: { category: { include: { fields: true } }, organization: true, flows: { include: { flow: true } } },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    return product;
  }

  private assertGtin(gtin: string) {
    const r = validateGtin(gtin);
    if (!r.valid) throw new BadRequestException(r.message ?? 'GTIN không hợp lệ');
    return r.normalized;
  }

  /**
   * Lưu sản phẩm theo GTIN, xử lý ràng buộc unique (tenantId, gtin):
   * - Nếu đã có bản ĐANG hoạt động → báo trùng.
   * - Nếu chỉ còn bản đã xoá mềm → HỒI SINH bản đó (tránh vi phạm unique khi tạo mới).
   */
  private async saveProduct(user: AuthUser, gtin: string, data: any) {
    const existing = await this.prisma.product.findFirst({ where: { tenantId: user.tenantId, gtin } });
    if (existing && !existing.deletedAt) throw new ConflictException(`GTIN ${gtin} đã tồn tại trong tenant`);
    if (existing) {
      return this.prisma.product.update({ where: { id: existing.id }, data: { ...data, deletedAt: null } });
    }
    return this.prisma.product.create({ data: { tenantId: user.tenantId, gtin, ...data } });
  }

  private async assertOrgScope(user: AuthUser, organizationId: string) {
    const ids = await this.scope.allowedOrgIds(user);
    if (ids && !ids.includes(organizationId)) throw new BadRequestException('Đơn vị nằm ngoài phạm vi được phân quyền');
  }

  async createManual(user: AuthUser, dto: CreateProductManualInput) {
    const gtin = this.assertGtin(dto.gtin);
    await this.assertOrgScope(user, dto.organizationId);
    const product = await this.saveProduct(user, gtin, {
      organizationId: dto.organizationId, categoryId: dto.categoryId ?? null,
      name: dto.name, description: dto.description ?? null, image: dto.image ?? null,
      dynamicAttributes: (dto.dynamicAttributes ?? {}) as any, source: 'MANUAL',
    });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'CREATE', resource: 'product', resourceId: product.id, meta: { gtin } });
    return product;
  }

  async importFromVnpc(user: AuthUser, dto: ImportFromVnpcInput) {
    const gtin = this.assertGtin(dto.gtin);
    await this.assertOrgScope(user, dto.organizationId);
    const snapshot = await this.vnpc.getByGtin(gtin, user.tenantId);
    if (!snapshot) throw new BadRequestException('VNPC không có dữ liệu cho GTIN này, vui lòng nhập tay.');
    const product = await this.saveProduct(user, gtin, {
      organizationId: dto.organizationId, categoryId: dto.categoryId ?? null,
      name: snapshot.name, description: snapshot.description ?? null, image: snapshot.image ?? null,
      dynamicAttributes: (snapshot.attributes ?? {}) as any,
      source: 'VNPC', sourceReference: gtin, sourceSyncedAt: new Date(), sourceSnapshot: snapshot as any,
    });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'IMPORT_VNPC', resource: 'product', resourceId: product.id, meta: { gtin } });
    return product;
  }

  /** Gán MỘT Flow truy xuất cho sản phẩm (mỗi sản phẩm chỉ 1 flow). */
  async setFlows(user: AuthUser, productId: string, flowIds: string[]) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    await this.prisma.productFlow.deleteMany({ where: { productId } });
    const single = (flowIds ?? []).slice(0, 1); // chỉ giữ tối đa 1 flow
    const flow = single.length ? await this.prisma.flow.findFirst({ where: { id: single[0], tenantId: user.tenantId, deletedAt: null } }) : null;
    if (flow) await this.prisma.productFlow.create({ data: { productId, flowId: flow.id } });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'SET_FLOW', resource: 'product', resourceId: productId, meta: { flowId: flow?.id ?? null } });
    return { ok: true, flowId: flow?.id ?? null };
  }

  /** Gắn THÊM một Flow vào sản phẩm mà không gỡ các Flow hiện có (hỗ trợ nhiều Flow / sản phẩm). */
  async attachFlow(user: AuthUser, productId: string, flowId: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    const flow = await this.prisma.flow.findFirst({ where: { id: flowId, tenantId: user.tenantId, deletedAt: null } });
    if (!flow) throw new NotFoundException('Không tìm thấy Flow');
    const exists = await this.prisma.productFlow.findUnique({ where: { productId_flowId: { productId, flowId } } });
    if (!exists) await this.prisma.productFlow.create({ data: { productId, flowId } });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'ATTACH_FLOW', resource: 'product', resourceId: productId, meta: { flowId } });
    return { ok: true, flowId };
  }

  /** Gỡ một Flow khỏi sản phẩm (không ảnh hưởng các Flow khác). */
  async detachFlow(user: AuthUser, productId: string, flowId: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    await this.prisma.productFlow.deleteMany({ where: { productId, flowId } });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'DETACH_FLOW', resource: 'product', resourceId: productId, meta: { flowId } });
    return { ok: true };
  }

  /** Sửa thông tin cơ bản của sản phẩm (không đổi GTIN). */
  async update(user: AuthUser, id: string, dto: { name?: string; description?: string; dynamicAttributes?: Record<string, unknown>; organizationId?: string; traceMode?: string }) {
    const product = await this.prisma.product.findFirst({ where: { id, tenantId: user.tenantId, deletedAt: null } });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    if (dto.organizationId) await this.assertOrgScope(user, dto.organizationId);
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name, description: dto.description, organizationId: dto.organizationId,
        traceMode: dto.traceMode === 'PER_LOT' || dto.traceMode === 'SHARED' ? dto.traceMode : undefined,
        dynamicAttributes: dto.dynamicAttributes ? (dto.dynamicAttributes as any) : undefined,
      },
    });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'UPDATE', resource: 'product', resourceId: id });
    return updated;
  }

  /**
   * Đồng bộ / cập nhật dữ liệu truy xuất của sản phẩm lên CỔNG TRUY XUẤT NGUỒN GỐC QUỐC GIA.
   * (Khác VNPC — VNPC chỉ cấp GTIN.) Hiện mô phỏng thành công + ghi audit.
   */
  async syncToPortal(user: AuthUser, id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, tenantId: user.tenantId, deletedAt: null } });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    const syncedAt = new Date();
    // TODO: gọi API Cổng TXNG quốc gia để đẩy dữ liệu; hiện mô phỏng.
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'SYNC_TRACE_PORTAL', resource: 'product', resourceId: id, meta: { gtin: product.gtin } });
    return { ok: true, syncedAt: syncedAt.toISOString() };
  }

  /** Xoá (soft delete) sản phẩm. */
  async remove(user: AuthUser, id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, tenantId: user.tenantId, deletedAt: null } });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    await this.prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'DELETE', resource: 'product', resourceId: id });
    return { ok: true };
  }
}
