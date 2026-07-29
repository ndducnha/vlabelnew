import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { VnpcApiClient, VnpcProduct } from './vnpc-api.client';

interface CacheEntry {
  data: unknown;
  expires: number;
}

/** Service VNPC: cache ngắn hạn, ghi log, fallback khi lỗi. */
@Injectable()
export class VnpcService {
  private readonly logger = new Logger(VnpcService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;

  constructor(
    private readonly client: VnpcApiClient,
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.ttlMs = Number(config.get('VNPC_CACHE_TTL', 300)) * 1000;
  }

  async search(q: string, tenantId?: string): Promise<{ items: VnpcProduct[]; fallback: boolean }> {
    // Cho phép q rỗng ở chế độ mock để hiển thị danh sách GTIN mẫu.
    if (!q?.trim() && !this.client.usingMock) return { items: [], fallback: false };
    const key = `search:${(q ?? '').trim().toLowerCase()}`;
    const cached = this.getCache<VnpcProduct[]>(key);
    if (cached) return { items: cached, fallback: false };

    const started = Date.now();
    try {
      const items = await this.client.search(q);
      this.setCache(key, items);
      await this.log(tenantId, 'search', q, null, 'OK', 200, Date.now() - started);
      return { items, fallback: false };
    } catch (err: any) {
      await this.log(tenantId, 'search', q, null, 'FALLBACK', null, Date.now() - started, err?.message);
      this.logger.error(`VNPC search fallback: ${err?.message}`);
      // fallback: trả rỗng để FE chuyển sang nhập tay
      return { items: [], fallback: true };
    }
  }

  async getByGtin(gtin: string, tenantId?: string): Promise<VnpcProduct | null> {
    const key = `gtin:${gtin}`;
    const cached = this.getCache<VnpcProduct>(key);
    if (cached) return cached;

    const started = Date.now();
    try {
      const product = await this.client.getByGtin(gtin);
      if (product) this.setCache(key, product);
      await this.log(tenantId, 'get', null, gtin, product ? 'OK' : 'ERROR', product ? 200 : 404, Date.now() - started);
      return product;
    } catch (err: any) {
      await this.log(tenantId, 'get', null, gtin, 'FALLBACK', null, Date.now() - started, err?.message);
      return null;
    }
  }

  private getCache<T>(key: string): T | null {
    const e = this.cache.get(key);
    if (e && e.expires > Date.now()) return e.data as T;
    if (e) this.cache.delete(key);
    return null;
  }
  private setCache(key: string, data: unknown) {
    this.cache.set(key, { data, expires: Date.now() + this.ttlMs });
  }

  private async log(
    tenantId: string | undefined, operation: string, query: string | null, gtin: string | null,
    status: string, httpStatus: number | null, durationMs: number, errorMessage?: string,
  ) {
    await this.prisma.vnpcSyncLog.create({
      data: { tenantId: tenantId ?? null, operation, query, gtin, status, httpStatus, durationMs, errorMessage: errorMessage ?? null },
    });
  }
}
