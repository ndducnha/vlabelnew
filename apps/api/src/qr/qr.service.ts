import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { validateGtin } from '@vlabel/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/types';

@Injectable()
export class QrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  private base() {
    return this.config.get<string>('PUBLIC_BASE_URL', 'http://localhost:5173');
  }

  private buildUrl(gtin: string, lot?: string | null, serial?: string | null) {
    const q = new URLSearchParams();
    if (lot) q.set('lot', lot);
    if (serial) q.set('serial', serial);
    const qs = q.toString();
    return `/t/${gtin}${qs ? `?${qs}` : ''}`; // KHÔNG dùng database id trong URL (§12)
  }

  list(user: AuthUser, gtin?: string) {
    return this.prisma.qrCode.findMany({
      where: { tenantId: user.tenantId, ...(gtin ? { gtin } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { scanLogs: true } } },
    });
  }

  async generate(user: AuthUser, dto: { gtin: string; lot?: string; serial?: string; quantity?: number; traceableItemId?: string }) {
    const r = validateGtin(dto.gtin);
    if (!r.valid) throw new BadRequestException(r.message ?? 'GTIN không hợp lệ');
    const qty = Math.min(Math.max(dto.quantity ?? 1, 1), 10000);

    const data = Array.from({ length: qty }, (_, i) => {
      const serial = qty > 1 && !dto.serial ? `${Date.now().toString(36)}-${i + 1}` : dto.serial ?? null;
      return {
        tenantId: user.tenantId, gtin: r.normalized, lot: dto.lot ?? null, serial,
        publicUrl: this.buildUrl(r.normalized, dto.lot, serial), traceableItemId: dto.traceableItemId ?? null,
      };
    });
    await this.prisma.qrCode.createMany({ data });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'GENERATE_QR', resource: 'qr_code', meta: { gtin: r.normalized, quantity: qty } });
    return { generated: qty, gtin: r.normalized };
  }

  /** Import hàng loạt từ CSV: mỗi dòng `gtin,lot,serial,quantity` (dòng header tùy chọn). */
  async importCsv(user: AuthUser, csv: string) {
    const lines = (csv ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let rows = 0, generated = 0, skipped = 0;
    for (const line of lines) {
      const [gtin, lot, serial, qtyStr] = line.split(',').map((s) => s?.trim());
      if (!gtin || gtin.toLowerCase() === 'gtin') continue; // bỏ header
      if (!validateGtin(gtin).valid) { skipped++; continue; }
      const res = await this.generate(user, { gtin, lot: lot || undefined, serial: serial || undefined, quantity: qtyStr ? Number(qtyStr) : 1 });
      rows++; generated += res.generated;
    }
    return { rows, generated, skipped };
  }

  async png(user: AuthUser, id: string) {
    const qr = await this.prisma.qrCode.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!qr) throw new NotFoundException('Không tìm thấy QR');
    const dataUrl = await QRCode.toDataURL(`${this.base()}${qr.publicUrl}`, { margin: 1, width: 512 });
    return { id: qr.id, url: `${this.base()}${qr.publicUrl}`, dataUrl };
  }

  async assign(user: AuthUser, id: string, traceableItemId: string) {
    const qr = await this.prisma.qrCode.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!qr) throw new NotFoundException('Không tìm thấy QR');
    await this.prisma.qrCode.update({ where: { id }, data: { traceableItemId } });
    await this.prisma.qrAssignment.upsert({
      where: { qrCodeId: id }, update: { traceableItemId }, create: { qrCodeId: id, traceableItemId },
    });
    return { ok: true };
  }

  async setStatus(user: AuthUser, id: string, status: 'LOCKED' | 'REVOKED' | 'ACTIVE') {
    const qr = await this.prisma.qrCode.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!qr) throw new NotFoundException('Không tìm thấy QR');
    const updated = await this.prisma.qrCode.update({ where: { id }, data: { status } });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: `QR_${status}`, resource: 'qr_code', resourceId: id });
    return updated;
  }

  scanLogs(user: AuthUser, id: string) {
    return this.prisma.qrScanLog.findMany({
      where: { qrCodeId: id, qrCode: { tenantId: user.tenantId } },
      orderBy: { createdAt: 'desc' }, take: 200,
    });
  }
}
