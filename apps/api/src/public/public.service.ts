import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import * as QRCode from 'qrcode';
import { validateGtin, appendixGroupByCode } from '@vlabel/shared';
import { sanitizeHtml, renderVars } from '../supplementary-labels/supplementary-labels.util';
import { PrismaService } from '../prisma/prisma.service';

/** Trả dữ liệu công khai cho trang tra cứu QR. Chỉ dữ liệu APPROVED/LOCKED + field public. */
@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async trace(gtin: string, lot?: string, serial?: string, ip?: string, ua?: string) {
    if (!validateGtin(gtin).valid) throw new NotFoundException('GTIN không hợp lệ');

    const product = await this.prisma.product.findFirst({
      where: { gtin, deletedAt: null, status: 'ACTIVE' },
      include: { organization: { select: { name: true } }, category: { select: { name: true } } },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

    const item = await this.prisma.traceableItem.findFirst({
      where: {
        gtin, tenantId: product.tenantId, deletedAt: null,
        ...(lot ? { batchOrLot: lot } : {}),
        ...(serial ? { serialNumber: serial } : {}),
      },
    });

    // Lô nhãn điện tử tương ứng (nếu quét theo lô)
    const batch = lot
      ? await this.prisma.productBatch.findFirst({ where: { productId: product.id, batchCode: lot, deletedAt: null } })
      : null;

    const records = item
      ? await this.prisma.eventRecord.findMany({
          where: { traceableItemId: item.id, status: { in: ['APPROVED', 'LOCKED'] }, deletedAt: null },
          include: {
            eventDefinition: { include: { fields: true } },
            values: true,
            media: { where: { publicVisible: true } },
            performedBy: { select: { fullName: true } },
            organization: { select: { name: true } },
          },
        })
      : [];

    // ghi lịch sử quét (nếu có QR khớp)
    const qr = await this.prisma.qrCode.findFirst({ where: { gtin, tenantId: product.tenantId, ...(lot ? { lot } : {}) } });
    if (qr) {
      await this.prisma.qrScanLog.create({
        data: { qrCodeId: qr.id, ipHash: ip ? createHash('sha256').update(ip).digest('hex').slice(0, 16) : null, userAgent: ua?.slice(0, 200) ?? null },
      });
    }

    const timeline = records
      .filter((r) => (r.eventDefinition.publicConfig as any)?.event !== false) // ẩn cả sự kiện nếu tắt
      .map((r) => {
        const cfg = (r.eventDefinition.publicConfig as any) ?? {};
        const publicKeys = new Set(r.eventDefinition.fields.filter((f) => f.publicVisible).map((f) => f.key));
        const info: Record<string, unknown> = {};
        for (const v of r.values) if (publicKeys.has(v.fieldKey)) info[v.fieldKey] = v.valueJson;
        return {
          event: r.eventDefinition.name,
          code: r.eventDefinition.code,
          order: r.eventDefinition.order,
          who: cfg.who === false ? null : (r.performedByName ?? r.performedBy?.fullName ?? null), // Who
          where: cfg.where === false ? null : (r.location ?? r.organization?.name ?? null), // Where
          when: cfg.when === false ? null : r.performedAt,                            // When
          action: r.action,                                                          // What (hành động)
          info,                                                                      // What (field tự cấu hình)
          media: cfg.media === false ? [] : r.media.map((m) => ({ kind: m.kind, url: m.url })), // How
          gps: cfg.where === false ? null : (r.gpsLat && r.gpsLng ? { lat: r.gpsLat, lng: r.gpsLng } : null),
        };
      })
      .sort((a, b) => a.order - b.order);

    return {
      verified: true,
      product: {
        gtin: product.gtin,
        name: product.name,
        image: product.image,
        description: product.description,
        category: product.category?.name ?? null,
        company: product.organization?.name ?? null,
      },
      item: item ? { batchOrLot: item.batchOrLot, serialNumber: item.serialNumber } : null,
      // Nhãn phụ (supplementary): chỉ hiện khi doanh nghiệp đã xuất bản và khớp phạm vi GTIN/lô/serial.
      supplementary: await this.resolveSupplementary(product, lot, serial),
      // Nhãn điện tử: chỉ trả khi đã công bố (published) hoặc thu hồi (recalled, kèm banner). Draft không công khai.
      label: ['published', 'recalled'].includes(product.elabelStatus)
        ? {
            status: product.elabelStatus,
            recallReason: product.elabelStatus === 'recalled' ? product.recallReason : null,
            brand: product.brand,
            countryOfOrigin: product.countryOfOrigin,
            hsCode: product.hsCode,
            targetMarket: product.targetMarket,
            supplier: product.supplier,
            riskLevel: product.riskLevel,
            netContent: product.netContent,
            ingredients: product.ingredients,
            usageInstructions: product.usageInstructions,
            storageInstructions: product.storageInstructions,
            safetyWarnings: product.safetyWarnings,
            portalConnected: product.portalConnected,
            appendixGroup: appendixGroupByCode(product.appendixGroup)?.name ?? null,
            appendixFields: (() => {
              const g = appendixGroupByCode(product.appendixGroup);
              const av = (product.appendixAttributes as any) ?? {};
              return g ? g.fields.map((f) => ({ label: f.label, value: av[f.key] })).filter((x) => x.value != null && x.value !== '') : [];
            })(),
            images: product.labelImages ?? [],
            certificates: product.certificates ?? [],
            attributes: product.labelAttributes ?? [],
            owner: product.ownerInfo ?? null,
            company: product.organization?.name ?? null,
            batch: batch
              ? {
                  batchCode: batch.batchCode,
                  manufacturingDate: batch.manufacturingDate,
                  totalQuantity: batch.totalQuantity,
                  status: batch.status,
                  traceabilityUrl: batch.traceabilityUrl,
                  attributes: batch.attributes ?? [],
                }
              : null,
          }
        : null,
      timeline,
    };
  }

  private async resolveSupplementary(product: any, lot?: string, serial?: string) {
    const list = await this.prisma.supplementaryLabel.findMany({ where: { productId: product.id, status: 'published', deletedAt: null } });
    if (!list.length) return null;
    const match =
      (lot ? list.find((s) => s.scope === 'BATCH' && s.batchCode === lot) : undefined) ??
      (serial ? list.find((s) => s.scope === 'ITEM' && s.serial === serial) : undefined) ??
      list.find((s) => s.scope === 'ALL') ?? list[0];
    if (!match) return null;
    const owner = (product.ownerInfo as any) ?? {};
    let qrImg = '';
    if (match.contentHtml.includes('{{qr_code}}')) {
      const base = process.env.PUBLIC_BASE_URL ?? 'http://localhost:5173';
      const url = `${base}/t/${product.gtin}${lot ? `?lot=${encodeURIComponent(lot)}` : ''}`;
      qrImg = `<img src="${await QRCode.toDataURL(url, { margin: 1, width: 200 })}" alt="QR" style="width:120px;height:120px" />`;
    }
    const html = sanitizeHtml(renderVars(match.contentHtml, {
      product_name: product.name, gtin: product.gtin, batch_number: lot ?? match.batchCode ?? '',
      manufacturing_date: match.manufacturingDate ? new Date(match.manufacturingDate).toLocaleDateString('vi-VN') : '',
      expiry_date: match.expiryDate ? new Date(match.expiryDate).toLocaleDateString('vi-VN') : '',
      manufacturer_name: owner.name ?? product.organization?.name ?? '', manufacturer_address: owner.address ?? '',
      origin: product.countryOfOrigin ?? '', qr_code: qrImg,
    }));
    return { name: match.name, html, size: match.labelSize, orientation: match.orientation };
  }
}
