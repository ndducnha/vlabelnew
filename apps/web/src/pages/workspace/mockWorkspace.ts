// Mô hình dữ liệu Workspace (mock JSON). Tách riêng để sau thay bằng API mà không đụng UI.

export type WSField = { id: string; label: string; type: string; required: boolean; display: boolean; value?: string; origin?: 'event' | 'label' };
export type WSGroup = { id: string; name: string; readOnly?: boolean; pick?: boolean; groupCode?: string; fields: WSField[] };
export type WSEvent = {
  id: string; name: string; code?: string; order?: number;
  public?: { who?: boolean; where?: boolean; when?: boolean; media?: boolean };
  fields?: WSField[];
  who?: string; organization?: string; location?: string; action?: string; data?: string; media?: string; time?: string; batch?: string;
};
export type WSFlow = { id: string; versionId?: string; name: string; responsible?: string[]; events: WSEvent[] };
export type WSModuleItem = { id?: string; label: string; meta?: string };
export type WSModule = { id: string; kind: string; label: string; items: WSModuleItem[] };

export interface Workspace {
  productId?: string;
  qr: { gtin: string; product: string; dataUrl?: string };
  traceability: { flow: WSFlow };
  elabel: { groups: WSGroup[] };
  modules: WSModule[];
}

export const FIELD_TYPES = ['text', 'textarea', 'number', 'date', 'select', 'image', 'file'];

export const mockWorkspace: Workspace = {
  qr: { gtin: '8931100000015', product: 'Paracetamol 500mg (vỉ 10 viên)' },
  traceability: {
    flow: {
      id: 'flow-duoc',
      name: 'Chuỗi sản xuất Dược phẩm',
      events: [
        { id: 'ev-1', name: 'Nhập nguyên liệu', who: 'Trần Dược', organization: 'Bộ phận Pha chế', location: 'Kho NVL Bình Dương', action: 'Nhập API Paracetamol', data: 'COA-2406', media: '1 ảnh', time: '2026-07-01', batch: 'LOT-PARA-2407' },
        { id: 'ev-2', name: 'Pha chế', who: 'Trần Dược', organization: 'Bộ phận Pha chế', location: 'NM Dược Bình Dương', action: 'Dập viên', data: 'Cỡ mẻ 200k', media: '', time: '2026-07-03', batch: 'LOT-PARA-2407' },
        { id: 'ev-3', name: 'Kiểm nghiệm', who: 'QA Nguyễn', organization: 'Bộ phận QA', location: 'Phòng QA', action: 'Đạt USP', data: 'Độ tinh khiết 99.6%', media: '', time: '2026-07-04', batch: 'LOT-PARA-2407' },
        { id: 'ev-4', name: 'Đóng gói', who: 'Người kê khai', organization: 'Bộ phận Đóng gói', location: 'Xưởng đóng gói', action: 'Ép vỉ 10 viên', data: 'HSD 2029-07-05', media: '1 ảnh', time: '2026-07-05', batch: 'LOT-PARA-2407' },
        { id: 'ev-5', name: 'Xuất kho', who: 'Thủ kho', organization: 'Kho', location: 'Kho thành phẩm', action: 'Xuất cho NPP', data: 'NPP Miền Nam', media: '', time: '2026-07-06', batch: 'LOT-PARA-2407' },
      ],
    },
  },
  elabel: {
    groups: [
      { id: 'g-dinhdanh', name: 'Định danh', fields: [
        { id: 'f-name', label: 'Tên sản phẩm', type: 'text', required: true, display: true },
        { id: 'f-brand', label: 'Nhãn hiệu', type: 'text', required: false, display: true },
        { id: 'f-net', label: 'Định lượng', type: 'text', required: true, display: true },
      ] },
      { id: 'g-thanhphan', name: 'Thành phần & thời hạn', fields: [
        { id: 'f-ing', label: 'Thành phần', type: 'textarea', required: true, display: true },
        { id: 'f-mfg', label: 'Ngày sản xuất', type: 'date', required: true, display: true },
        { id: 'f-exp', label: 'Hạn dùng', type: 'date', required: true, display: true },
      ] },
      { id: 'g-huongdan', name: 'Hướng dẫn & cảnh báo', fields: [
        { id: 'f-use', label: 'Hướng dẫn sử dụng', type: 'textarea', required: false, display: true },
        { id: 'f-warn', label: 'Cảnh báo an toàn', type: 'textarea', required: true, display: true },
      ] },
      { id: 'g-phuluc', name: 'Nhóm hàng hóa: Thuốc (Phụ lục I)', fields: [
        { id: 'f-active', label: 'Hoạt chất, hàm lượng', type: 'text', required: true, display: true },
        { id: 'f-reg', label: 'Số đăng ký (SĐK)', type: 'text', required: true, display: true },
        { id: 'f-form', label: 'Dạng bào chế', type: 'text', required: true, display: true },
      ] },
    ],
  },
  modules: [
    { id: 'mod-user', kind: 'user', label: 'User', items: [{ label: 'Superadmin' }, { label: 'Admin' }, { label: 'Quản lý' }, { label: 'Kê khai' }] },
    { id: 'mod-org', kind: 'org', label: 'Organization', items: [{ label: 'Tập đoàn Vlabel' }, { label: 'Dược phẩm' }, { label: 'Mỹ phẩm' }, { label: 'PCCC' }] },
    { id: 'mod-batch', kind: 'batch', label: 'Batch', items: [{ label: 'LOT-PARA-2407' }, { label: 'LOT-PARA-2408' }] },
    { id: 'mod-schedule', kind: 'schedule', label: 'Schedule', items: [{ label: 'Kê khai lô tháng 8' }, { label: 'Kê khai Amoxicillin' }] },
  ],
};

let _seq = 100;
export const nextId = (prefix: string) => `${prefix}-${++_seq}`;
