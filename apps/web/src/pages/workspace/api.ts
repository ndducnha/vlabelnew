// Lớp nối API thật cho Workspace. Đọc dữ liệu thật và trả về model đúng shape cho canvas,
// kèm các hàm mutate gọi thẳng endpoint backend.
import { api } from '../../lib/api';
import { appendixGroupByCode } from '@vlabel/shared';
import type { Workspace, WSField } from './mockWorkspace';

export async function loadProducts() {
  return (await api.get('/products')).data as any[];
}

export async function loadWorkspace(productId: string): Promise<Workspace> {
  const [prodRes, labelRes, orgsRes, usersRes, tasksRes, qrRes] = await Promise.all([
    api.get(`/products/${productId}`),
    api.get(`/elabels/${productId}`),
    api.get('/organizations'),
    api.get('/users'),
    api.get('/trace-tasks'),
    api.get(`/products/${productId}/qr`).catch(() => ({ data: {} })),
  ]);
  const product = prodRes.data;
  const qrDataUrl = (qrRes as any).data?.dataUrl as string | undefined;
  const label = labelRes.data;
  const orgs = orgsRes.data as any[];
  const users = usersRes.data as any[];
  const tasks = tasksRes.data as any[];

  const flowRef = product.flows?.[0]?.flow;
  let flow: Workspace['traceability']['flow'] = { id: '', versionId: '', name: 'Chưa gán flow', events: [] };
  if (flowRef) {
    const fd = (await api.get(`/flows/${flowRef.id}`)).data;
    const ver = fd.versions?.[0];
    flow = {
      id: fd.id, versionId: ver?.id ?? '', name: fd.name,
      responsible: (fd.orgLinks ?? []).map((l: any) => l.organization?.name).filter(Boolean),
      events: (ver?.eventDefinitions ?? []).map((ev: any) => ({
        id: ev.id, name: ev.name, code: ev.code, order: ev.order,
        public: (ev.publicConfig ?? {}) as any,
        fields: (ev.fields ?? []).map((f: any): WSField => ({ id: f.id, label: f.label, type: f.type, required: !!f.required, display: !!f.publicVisible, origin: 'event' })),
      })),
    };
  }

  // E-Label groups từ nhãn thật
  const groups: Workspace['elabel']['groups'] = [];
  groups.push({
    id: 'g-common', name: 'Nội dung bắt buộc (NĐ 37)', fields: [
      { id: 'lf-netContent', label: 'Định lượng', type: 'text', required: false, display: true, origin: 'label', value: label.netContent ?? '' },
      { id: 'lf-ingredients', label: 'Thành phần', type: 'textarea', required: true, display: true, origin: 'label', value: label.ingredients ?? '' },
      { id: 'lf-usageInstructions', label: 'Hướng dẫn sử dụng', type: 'textarea', required: false, display: true, origin: 'label', value: label.usageInstructions ?? '' },
      { id: 'lf-storageInstructions', label: 'Hướng dẫn bảo quản', type: 'textarea', required: false, display: true, origin: 'label', value: label.storageInstructions ?? '' },
      { id: 'lf-safetyWarnings', label: 'Cảnh báo an toàn', type: 'textarea', required: false, display: true, origin: 'label', value: label.safetyWarnings ?? '' },
    ],
  });
  const grp = appendixGroupByCode(label.appendixGroup);
  const av = label.appendixAttributes ?? {};
  groups.push({
    id: 'g-appendix', name: grp ? `Phụ lục I: ${grp.name}` : 'Nhóm hàng hóa (chọn)', readOnly: true, pick: true, groupCode: label.appendixGroup ?? '',
    fields: grp ? grp.fields.map((f): WSField => ({ id: `ax-${f.key}`, label: f.label, type: f.type, required: !!f.required, display: true, origin: 'label', value: av[f.key] ?? '' })) : [],
  });
  const attrs = Array.isArray(label.labelAttributes) ? label.labelAttributes : [];
  groups.push({
    id: 'g-extra', name: 'Thông tin khác', fields: attrs.map((a: any, i: number): WSField => ({ id: `attr-${i}`, label: a.field_name ?? `Trường ${i + 1}`, type: 'text', required: false, display: true, origin: 'label', value: a.field_value ?? '' })),
  });

  return {
    productId,
    qr: { gtin: product.gtin, product: product.name, dataUrl: qrDataUrl },
    traceability: { flow },
    elabel: { groups },
    modules: [
      { id: 'mod-org', kind: 'org', label: 'Tổ chức', items: orgs.slice(0, 12).map((o: any) => ({ id: o.id, label: o.name, meta: 'Cấp ' + ((o.level ?? 0) + 1) })) },
      { id: 'mod-user', kind: 'user', label: 'User', items: users.slice(0, 12).map((u: any) => ({ id: u.id, label: u.fullName, meta: u.email })) },
      { id: 'mod-batch', kind: 'batch', label: 'Batch', items: (label.batches ?? []).map((b: any) => ({ id: b.id, label: b.batchCode })) },
      { id: 'mod-schedule', kind: 'schedule', label: 'Lịch truy xuất', items: tasks.slice(0, 12).map((t: any) => ({ id: t.id, label: t.name || t.product?.name || 'Nhiệm vụ', meta: t.assignedUser?.fullName })) },
    ],
  };
}

// ── Mutations (API thật) ──
export const wsApi = {
  addEvent: (versionId: string, name: string) => api.post(`/flow-versions/${versionId}/events`, { name, code: 'EV_' + Date.now().toString(36).toUpperCase() }),
  updateEvent: (id: string, dto: any) => api.patch(`/event-definitions/${id}`, dto),
  deleteEvent: (id: string) => api.delete(`/event-definitions/${id}`),
  addField: (eventId: string, label: string) => api.post(`/event-definitions/${eventId}/fields`, { key: 'f_' + Date.now().toString(36), label, type: 'text' }),
  updateField: (id: string, dto: any) => api.patch(`/event-fields/${id}`, dto),
  deleteField: (id: string) => api.delete(`/event-fields/${id}`),
  patchLabel: (productId: string, dto: any) => api.patch(`/elabels/${productId}`, dto),
  addTask: (dto: any) => api.post('/trace-tasks', dto),
  deleteTask: (id: string) => api.delete(`/trace-tasks/${id}`),
};
