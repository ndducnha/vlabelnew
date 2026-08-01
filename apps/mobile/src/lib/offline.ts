import * as SecureStore from 'expo-secure-store';
import { api } from './api';

// Bản ghi khai báo chờ gửi (offline-first). Media lưu bằng URI cục bộ, upload khi đồng bộ.
export interface PendingRecord {
  clientId: string;
  productId: string; lot?: string;
  flowVersionId: string; eventDefinitionId: string;
  location?: string; gpsLat?: number; gpsLng?: number;
  performedAt?: string; action?: string; performerName?: string;
  values: Record<string, any>;
  mediaUris: { uri: string; name?: string; type?: string }[];
}

const KEY = 'vlabel.pending.v1';

async function read(): Promise<PendingRecord[]> {
  try { const s = await SecureStore.getItemAsync(KEY); return s ? JSON.parse(s) : []; } catch { return []; }
}
async function write(list: PendingRecord[]) { await SecureStore.setItemAsync(KEY, JSON.stringify(list)); }

export async function addPending(rec: PendingRecord) { const list = await read(); list.push(rec); await write(list); }
export async function pendingCount() { return (await read()).length; }

async function uploadOne(m: { uri: string; name?: string; type?: string }) {
  const fd = new FormData();
  fd.append('file', { uri: m.uri, name: m.name ?? 'photo.jpg', type: m.type ?? 'image/jpeg' } as any);
  const { data } = await api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data; // { url, ... }
}

/** Gửi một bản ghi lên backend: đảm bảo item → upload media → tạo → submit. */
export async function submitRecord(rec: PendingRecord) {
  const { data: item } = await api.post('/traceable-items/ensure', { productId: rec.productId, lot: rec.lot || undefined });
  const media: any[] = [];
  for (const m of rec.mediaUris) { try { const up = await uploadOne(m); media.push({ kind: 'image', url: up.url, fileName: up.fileName, mimeType: up.mimeType, sizeBytes: up.sizeBytes, publicVisible: true }); } catch { /* skip media lỗi */ } }
  const { data: draft } = await api.post('/event-records', {
    traceableItemId: item.id, flowVersionId: rec.flowVersionId, eventDefinitionId: rec.eventDefinitionId,
    location: rec.location, gpsLat: rec.gpsLat, gpsLng: rec.gpsLng, performedAt: rec.performedAt,
    action: rec.action, performedByName: rec.performerName || undefined, values: rec.values, media,
  });
  await api.post(`/event-records/${draft.id}/submit`);
  return draft.id;
}

/** Thử gửi toàn bộ hàng chờ; xoá khỏi hàng chờ nếu thành công (tránh gửi trùng). */
export async function flushQueue(): Promise<{ ok: number; fail: number }> {
  const list = await read();
  if (list.length === 0) return { ok: 0, fail: 0 };
  const remain: PendingRecord[] = [];
  let ok = 0, fail = 0;
  for (const rec of list) {
    try { await submitRecord(rec); ok++; }
    catch { remain.push(rec); fail++; }
  }
  await write(remain);
  return { ok, fail };
}
