// Địa điểm doanh nghiệp — lưu client-side (localStorage), thiết kế mở để sau tích hợp backend/GPS/IoT.
export interface Loc {
  id: string; name: string; code: string; type: string;
  address?: string; lat?: number | null; lng?: number | null;
  icon?: string; color?: string; note?: string;
}

export const LOC_TYPES: Record<string, { label: string; color: string }> = {
  factory: { label: 'Nhà máy', color: '#2E5BE8' },
  warehouse: { label: 'Kho', color: '#0E9AA7' },
  qc: { label: 'Trung tâm QC', color: '#D97706' },
  branch: { label: 'Chi nhánh', color: '#7C3AED' },
  office: { label: 'Văn phòng', color: '#475569' },
  dealer: { label: 'Đại lý', color: '#DB2777' },
  distributor: { label: 'Nhà phân phối', color: '#059669' },
  store: { label: 'Cửa hàng', color: '#E11D48' },
  other: { label: 'Điểm khác', color: '#6B7280' },
};

export const typeColor = (type?: string, override?: string) => override || LOC_TYPES[type ?? 'other']?.color || LOC_TYPES.other.color;

const LOC_KEY = 'vlabel.locations.v1';

const D = (name: string, code: string, type: string, lat: number, lng: number, address = ''): Loc =>
  ({ id: 'seed-' + code, name, code, type, address, lat, lng, note: '' });

// Khớp với chuỗi "địa điểm" trong dữ liệu Event demo (seed) để bản đồ có sẵn điểm.
export const DEFAULT_LOCATIONS: Loc[] = [
  D('Kho NVL Bình Dương', 'KHO-NVL-BD', 'warehouse', 10.95, 106.63, 'KCN VSIP, Bình Dương'),
  D('NM Dược Bình Dương', 'NM-DUOC-BD', 'factory', 10.98, 106.65, 'KCN VSIP, Bình Dương'),
  D('Phòng QA', 'PHONG-QA', 'qc', 10.982, 106.652),
  D('Bộ phận Đóng gói', 'BP-DG', 'factory', 10.981, 106.654),
  D('Kho thành phẩm', 'KHO-TP', 'warehouse', 11.0, 106.67),
  D('Kho NVL TP.HCM', 'KHO-NVL-HCM', 'warehouse', 10.74, 106.66, 'TP. Hồ Chí Minh'),
  D('Bộ phận Sản xuất', 'BP-SX', 'factory', 10.77, 106.69),
  D('Bộ phận Kiểm nghiệm', 'BP-KN', 'qc', 10.772, 106.692),
  D('Xưởng đóng gói', 'XUONG-DG', 'factory', 10.775, 106.695),
  D('Kho phân phối', 'KHO-PP', 'distributor', 10.8, 106.72),
  D('Kho vật tư', 'KHO-VT', 'warehouse', 10.93, 106.82, 'Biên Hòa, Đồng Nai'),
  D('Xưởng gia công', 'XUONG-GC', 'factory', 10.95, 106.84),
  D('Bộ phận Lắp ráp', 'BP-LR', 'factory', 10.952, 106.842),
  D('Bộ phận Kiểm định', 'BP-KD', 'qc', 10.954, 106.844),
  D('Trung tâm phân phối HCM', 'TT-PP-HCM', 'distributor', 10.78, 106.70, 'TP. Hồ Chí Minh'),
  D('Cửa hàng Guardian Q1', 'CH-GUARDIAN-Q1', 'store', 10.7769, 106.7009, 'Nguyễn Huệ, Q1, TP.HCM'),
];

export function loadLocations(): Loc[] {
  try { const s = localStorage.getItem(LOC_KEY); if (s) return JSON.parse(s); } catch { /* ignore */ }
  return DEFAULT_LOCATIONS;
}
export function saveLocations(list: Loc[]) { localStorage.setItem(LOC_KEY, JSON.stringify(list)); }

export function matchLocation(list: Loc[], name?: string | null): Loc | undefined {
  if (!name) return undefined;
  const n = name.trim().toLowerCase();
  return list.find((l) => l.name.trim().toLowerCase() === n);
}

// Haversine (km)
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
