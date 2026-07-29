import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { isValidGtin } from '@vlabel/shared';

export interface VnpcProduct {
  gtin: string;
  name: string;
  company?: string;
  brand?: string;
  description?: string;
  category?: string;
  image?: string;
  attributes?: Record<string, unknown>;
}

/** Dữ liệu mock để clone chạy được ngay khi chưa cấu hình VNPC_API_URL. */
const MOCK: VnpcProduct[] = [
  { gtin: '8938505970017', name: 'Gạo ST25 hữu cơ 5kg', company: 'Cty Lúa gạo Miền Tây', brand: 'ST Nông sản', category: 'Ngũ cốc', description: 'Gạo ST25 canh tác hữu cơ.', attributes: { weight: '5kg', origin: 'An Giang' } },
  { gtin: '8938505970024', name: 'Gạo ST25 túi 2kg', company: 'Cty Lúa gạo Miền Tây', brand: 'ST Nông sản', category: 'Ngũ cốc', attributes: { weight: '2kg' } },
  { gtin: '8935001234567', name: 'Cà phê Arabica Cầu Đất 500g', company: 'Cty Cà phê Tây Nguyên', brand: 'Cầu Đất', category: 'Đồ uống', attributes: { weight: '500g' } },
  { gtin: '8934567990021', name: 'Tôm sú sinh thái 1kg', company: 'Cty Thủy sản Cà Mau', brand: 'MinhPhu', category: 'Thủy sản', attributes: { weight: '1kg' } },
];

/**
 * Client gọi VNPC API. Ẩn API key khỏi frontend, có timeout & retry giới hạn.
 * Nếu không cấu hình VNPC_API_URL → dùng mock provider (fallback nhập tay vẫn hoạt động).
 */
@Injectable()
export class VnpcApiClient {
  private readonly logger = new Logger(VnpcApiClient.name);
  private readonly http?: AxiosInstance;
  private readonly maxRetry: number;
  readonly usingMock: boolean;

  constructor(private readonly config: ConfigService) {
    const baseURL = config.get<string>('VNPC_API_URL');
    this.maxRetry = Number(config.get('VNPC_MAX_RETRY', 2));
    this.usingMock = !baseURL;
    if (baseURL) {
      this.http = axios.create({
        baseURL,
        timeout: Number(config.get('VNPC_API_TIMEOUT', 10000)),
        headers: { 'X-API-Key': config.get<string>('VNPC_API_KEY', '') },
      });
    }
  }

  async search(q: string): Promise<VnpcProduct[]> {
    if (this.usingMock) {
      const query = q.trim().toLowerCase();
      return MOCK.filter(
        (p) => p.name.toLowerCase().includes(query) || p.gtin.includes(q) || (p.company ?? '').toLowerCase().includes(query),
      );
    }
    return this.withRetry(async () => {
      const { data } = await this.http!.get('/products', { params: { q } });
      return (data.items ?? data) as VnpcProduct[];
    });
  }

  async getByGtin(gtin: string): Promise<VnpcProduct | null> {
    if (!isValidGtin(gtin)) return null;
    if (this.usingMock) return MOCK.find((p) => p.gtin === gtin) ?? null;
    return this.withRetry(async () => {
      const { data } = await this.http!.get(`/products/${gtin}`);
      return (data as VnpcProduct) ?? null;
    });
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= this.maxRetry; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        this.logger.warn(`VNPC lỗi (lần ${attempt + 1}/${this.maxRetry + 1})`);
        if (attempt < this.maxRetry) await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
    }
    throw lastErr;
  }
}
