import { ConfigService } from '@nestjs/config';
import { VnpcApiClient } from './vnpc-api.client';

/** Config giả: VNPC_API_URL rỗng → client chạy chế độ mock (fallback). */
function fakeConfig(): ConfigService {
  return { get: (key: string, def?: unknown) => (key === 'VNPC_API_URL' ? '' : def) } as unknown as ConfigService;
}

describe('VnpcApiClient (mock provider)', () => {
  const client = new VnpcApiClient(fakeConfig());

  it('bật mock khi không cấu hình VNPC_API_URL', () => {
    expect(client.usingMock).toBe(true);
  });

  it('tìm theo tên sản phẩm', async () => {
    const res = await client.search('gạo');
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].name.toLowerCase()).toContain('gạo');
  });

  it('tìm theo GTIN', async () => {
    const res = await client.search('8935001234562');
    expect(res.some((p) => p.gtin === '8935001234562')).toBe(true);
  });

  it('lấy sản phẩm theo GTIN hợp lệ', async () => {
    const p = await client.getByGtin('8938505970011');
    expect(p).not.toBeNull();
    expect(p?.name).toContain('ST25');
  });

  it('trả null cho GTIN không hợp lệ', async () => {
    expect(await client.getByGtin('123')).toBeNull();
  });
});
