import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, QrCode, Check, Download, Loader2, Pencil, Trash2, GitBranch, UploadCloud, History, Search, Package } from '../lib/icons';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { useApiMutation } from '../lib/useApiMutation';
import { PageHead, Spinner, EmptyState, Drawer, Paginator, usePaged } from '../components/ui';
import { PERMISSIONS } from '@vlabel/shared';
import type { Product, Organization, Flow } from '@vlabel/shared';
import { useT, type Messages } from '../lib/i18n';

const MSG: Messages = {
  vi: {
    'toast.deleted': 'Đã xoá sản phẩm',
    'toast.synced': 'Đã đồng bộ lên Cổng truy xuất nguồn gốc quốc gia',
    'act.edit': 'Sửa',
    'act.trace': 'Truy xuất',
    'act.downloadQr': 'Tải QR',
    'act.view': 'Xem',
    'act.syncTitle': 'Đồng bộ lên Cổng truy xuất nguồn gốc quốc gia',
    'act.sync': 'Đồng bộ',
    'act.deleteTitle': 'Xoá sản phẩm',
    'confirm.delete': 'Xoá sản phẩm "{name}"?',
    eyebrow: 'Sản phẩm',
    title: 'Quản lý sản phẩm',
    subtitle: 'Gắn GTIN với tên & thông tin, gán Luồng truy xuất, tải QR',
    'search.ph': 'Tìm tên / GTIN / đơn vị…',
    create: 'Tạo sản phẩm',
    'empty.title': 'Chưa có sản phẩm',
    'empty.hint': 'Tạo sản phẩm bằng cách chọn GTIN từ VNPC.',
    'noMatch.title': 'Không tìm thấy sản phẩm phù hợp.',
    'noMatch.hint': 'Thử từ khoá khác cho tên, GTIN hoặc đơn vị.',
    'col.item': 'Mục',
    'col.product': 'Sản phẩm',
    'col.unit': 'Đơn vị',
    'col.mode': 'Chế độ',
    'col.flow': 'Luồng',
    'col.action': 'Hành động',
    notAssigned: 'Chưa gán',
    'mode.perLot': 'QR / lô',
    'mode.sharedShort': '1 QR chung',
    noFlow: 'Chưa gán Luồng',
    cancel: 'Huỷ',
    save: 'Lưu',
    'tr.saved': 'Đã cập nhật hồ sơ',
    'tr.deleted': 'Đã xoá hồ sơ',
    'tr.title': 'Dữ liệu truy xuất',
    'tr.editEvent': 'Sửa sự kiện:',
    'f.performer': 'Người thực hiện',
    'f.time': 'Thời gian',
    'f.location': 'Địa điểm',
    'f.action': 'Hành động',
    'tr.empty.title': 'Chưa có dữ liệu truy xuất',
    'tr.empty.hint': 'Sản phẩm này chưa có hồ sơ sự kiện nào.',
    'tr.event': 'Sự kiện {n}',
    'tr.deleteTitle': 'Xoá hồ sơ',
    'tr.deleteConfirm': 'Xoá hồ sơ này?',
    unknown: 'Chưa rõ',
    'ep.saved': 'Đã lưu sản phẩm',
    'ep.title': 'Sửa sản phẩm',
    'ep.name': 'Tên sản phẩm',
    'ep.desc': 'Mô tả',
    'ep.selectUnit': 'Chọn đơn vị',
    'ep.modeLabel': 'Chế độ QR truy xuất',
    'mode.shared.t': 'Dùng chung một QR',
    'mode.shared.d': 'Một QR cho sản phẩm, phân định bằng lô / ngày sản xuất.',
    'mode.perLot.t': 'Mỗi lô một QR riêng',
    'mode.perLot.d': 'Mỗi lô / ngày sản xuất có QR và truy xuất riêng.',
    'ep.flowLabel': 'Luồng truy xuất (một luồng)',
    'ep.events': '{n} sự kiện',
    'ep.unassignHint': 'Chưa chọn nghĩa là bỏ gán Luồng.',
    'ep.entererLabel': 'Người được kê khai luồng này',
    'ep.entererHint': 'Cấp quyền khai theo người ngay tại đây (hoặc tự động khi giao Lịch truy xuất).',
    'fe.removed': 'Đã gỡ',
    'fe.granted': 'Đã cấp quyền kê khai',
    'fe.empty': 'Chưa cấp cho ai. Tìm người bên dưới để cho phép kê khai.',
    'fe.searchPh': 'Tìm người để cho phép kê khai…',
    'fe.allow': 'Cho phép',
    'fe.notFound': 'Không tìm thấy.',
    'pq.byLot': 'QR theo lô',
    'pq.shared': 'QR dùng chung',
    'pq.lotLabel': 'Lô / ngày sản xuất',
    'pq.lotPh': 'Nhập lô để lấy QR riêng cho lô đó',
    'pq.downloadPng': 'Tải PNG',
    'pq.noteLot': 'Mỗi lô có QR riêng. Nhập lô ở trên để lấy đúng QR cho lô đó.',
    'pq.noteShared': 'Một QR dùng chung cho sản phẩm, phân định bằng lô khi kê khai.',
  },
  en: {
    'toast.deleted': 'Product deleted',
    'toast.synced': 'Synced to the National Traceability Portal',
    'act.edit': 'Edit',
    'act.trace': 'Trace',
    'act.downloadQr': 'Download QR',
    'act.view': 'View',
    'act.syncTitle': 'Sync to the National Traceability Portal',
    'act.sync': 'Sync',
    'act.deleteTitle': 'Delete product',
    'confirm.delete': 'Delete product "{name}"?',
    eyebrow: 'Product',
    title: 'Product management',
    subtitle: 'Bind GTIN to name & info, assign a traceability Flow, download QR',
    'search.ph': 'Search name / GTIN / organization…',
    create: 'Create product',
    'empty.title': 'No products yet',
    'empty.hint': 'Create a product by choosing a GTIN from VNPC.',
    'noMatch.title': 'No matching products found.',
    'noMatch.hint': 'Try a different keyword for name, GTIN or organization.',
    'col.item': 'Item',
    'col.product': 'Product',
    'col.unit': 'Organization',
    'col.mode': 'Mode',
    'col.flow': 'Flow',
    'col.action': 'Action',
    notAssigned: 'Not assigned',
    'mode.perLot': 'QR / lot',
    'mode.sharedShort': '1 shared QR',
    noFlow: 'No Flow assigned',
    cancel: 'Cancel',
    save: 'Save',
    'tr.saved': 'Record updated',
    'tr.deleted': 'Record deleted',
    'tr.title': 'Traceability data',
    'tr.editEvent': 'Edit event:',
    'f.performer': 'Performed by',
    'f.time': 'Time',
    'f.location': 'Location',
    'f.action': 'Action',
    'tr.empty.title': 'No traceability data',
    'tr.empty.hint': 'This product has no event records yet.',
    'tr.event': 'Event {n}',
    'tr.deleteTitle': 'Delete record',
    'tr.deleteConfirm': 'Delete this record?',
    unknown: 'Unknown',
    'ep.saved': 'Product saved',
    'ep.title': 'Edit product',
    'ep.name': 'Product name',
    'ep.desc': 'Description',
    'ep.selectUnit': 'Select organization',
    'ep.modeLabel': 'Traceability QR mode',
    'mode.shared.t': 'Share one QR',
    'mode.shared.d': 'One QR for the product, distinguished by lot / production date.',
    'mode.perLot.t': 'A separate QR per lot',
    'mode.perLot.d': 'Each lot / production date has its own QR and traceability.',
    'ep.flowLabel': 'Traceability Flow (one flow)',
    'ep.events': '{n} events',
    'ep.unassignHint': 'Selecting nothing unassigns the Flow.',
    'ep.entererLabel': 'People allowed to declare this flow',
    'ep.entererHint': 'Grant declaration permission per person right here (or automatically when assigning a Trace schedule).',
    'fe.removed': 'Removed',
    'fe.granted': 'Declaration permission granted',
    'fe.empty': 'Not granted to anyone. Find a person below to allow declaration.',
    'fe.searchPh': 'Find a person to allow declaration…',
    'fe.allow': 'Allow',
    'fe.notFound': 'Not found.',
    'pq.byLot': 'QR by lot',
    'pq.shared': 'Shared QR',
    'pq.lotLabel': 'Lot / production date',
    'pq.lotPh': 'Enter a lot to get a QR specific to that lot',
    'pq.downloadPng': 'Download PNG',
    'pq.noteLot': 'Each lot has its own QR. Enter a lot above to get the right QR for it.',
    'pq.noteShared': 'One shared QR for the product, distinguished by lot when declaring.',
  },
};

export default function Products() {
  const { can } = useAuth();
  const t = useT(MSG);
  const canEdit = can(PERMISSIONS.PRODUCT_UPDATE);
  const q = useQuery<Product[]>({ queryKey: ['products'], queryFn: () => api.get('/products').then((r) => r.data) });
  const [editProduct, setEditProduct] = useState<any | null>(null);
  const [qrProduct, setQrProduct] = useState<any | null>(null);
  const [traceProduct, setTraceProduct] = useState<any | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const paged = usePaged<any>(q.data ?? [], (p, ql) =>
    (p.name ?? '').toLowerCase().includes(ql) || (p.gtin ?? '').toLowerCase().includes(ql) || (p.organization?.name ?? '').toLowerCase().includes(ql), query, page);

  const del = useApiMutation((id: string) => api.delete(`/products/${id}`), {
    successMessage: t('toast.deleted'),
    invalidate: [['products']],
  });
  const sync = useApiMutation((id: string) => api.post(`/products/${id}/sync`), {
    successMessage: t('toast.synced'),
  });

  // Nhóm hành động dùng chung cho cả bảng (desktop) và card (mobile) — logic y nguyên
  const rowActions = (p: any) => (
    <>
      {canEdit && <button className="btn btn-sm" onClick={() => setEditProduct(p)}><Pencil size={13} />{t('act.edit')}</button>}
      <button className="btn btn-sm" onClick={() => setTraceProduct(p)}><History size={13} />{t('act.trace')}</button>
      <button className="btn btn-sm" onClick={() => setQrProduct(p)}><QrCode size={13} />{t('act.downloadQr')}</button>
      <a className="btn btn-sm" href={`/t/${p.gtin}`} target="_blank" rel="noreferrer">{t('act.view')}</a>
      {canEdit && <button className="btn btn-sm" title={t('act.syncTitle')} disabled={sync.isPending} onClick={() => sync.mutate(p.id)}><UploadCloud size={13} />{t('act.sync')}</button>}
      {canEdit && <button className="btn btn-sm btn-danger" title={t('act.deleteTitle')} onClick={() => { if (window.confirm(t('confirm.delete', { name: p.name }))) del.mutate(p.id); }}><Trash2 size={13} /></button>}
    </>
  );

  return (
    <>
      <PageHead eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')}
        actions={<>
          <div className="flex items-center gap-2 rounded-full px-3.5 h-10" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
            <Search size={15} className="text-[var(--muted)]" />
            <input className="bg-transparent outline-none text-sm" style={{ width: 200 }} placeholder={t('search.ph')} value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
          </div>
          {can(PERMISSIONS.PRODUCT_CREATE) && <Link to="/products/new" className="btn btn-primary"><Plus size={16} />{t('create')}</Link>}
        </>} />
      {q.isLoading ? <Spinner /> : (q.data?.length ?? 0) === 0 ? (
        <div className="card"><EmptyState title={t('empty.title')} hint={t('empty.hint')}
          action={can(PERMISSIONS.PRODUCT_CREATE) && <Link to="/products/new" className="btn btn-primary btn-sm"><Plus size={15} />{t('create')}</Link>} /></div>
      ) : (
        <div className="flex flex-col gap-3">
          {paged.total === 0 && <div className="card"><EmptyState title={t('noMatch.title')} hint={t('noMatch.hint')} /></div>}

          {paged.total > 0 && (
            <>
              {/* Sổ cái cho desktop */}
              <div className="hidden lg:block anim-in overflow-x-auto">
                <table className="ledger text-sm">
                  <thead><tr>
                    <th style={{ width: 52 }}>{t('col.item')}</th>
                    {[t('col.product'), t('col.unit'), t('col.mode'), t('col.flow'), t('col.action')].map((h) => <th key={h}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {paged.rows.map((p: any, i: number) => (
                      <tr key={p.id}>
                        <td><span className="ledger-idx">{String((paged.page - 1) * 10 + i + 1).padStart(2, '0')}</span></td>
                        <td>
                          <div className="flex items-center gap-3">
                            <ProductThumb />
                            <div className="min-w-0">
                              <b className="block truncate">{p.name}</b>
                              <div className="text-xs text-[var(--muted)] mono">{p.gtin}</div>
                              {p.description && <div className="text-[11.5px] text-[var(--faint)] truncate max-w-[280px]">{p.description}</div>}
                            </div>
                          </div>
                        </td>
                        <td><span className="text-[var(--ink-2)]">{p.organization?.name ?? <span className="text-[var(--faint)]">{t('notAssigned')}</span>}</span></td>
                        <td>
                          <span className={`chip ${p.traceMode === 'PER_LOT' ? 'chip-accent' : ''}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                            <QrCode size={11} />{p.traceMode === 'PER_LOT' ? t('mode.perLot') : t('mode.sharedShort')}
                          </span>
                        </td>
                        <td>
                          {(p.flows ?? []).length === 0
                            ? <span className="pill pill-warn"><i />{t('noFlow')}</span>
                            : <span className="chip"><GitBranch size={12} />{p.flows[0].flow.name}</span>}
                        </td>
                        <td>
                          <div className="flex gap-1.5 flex-wrap justify-end">{rowActions(p)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Card cho mobile */}
              <div className="flex flex-col gap-3 lg:hidden">
                {paged.rows.map((p: any) => (
                  <div key={p.id} className="card card-hover anim-in p-4 flex flex-col gap-3.5">
                    <div className="min-w-0 flex-1 flex flex-col gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <b className="text-[15px] tracking-tight">{p.name}</b>
                        <span className={`chip ${p.traceMode === 'PER_LOT' ? 'chip-accent' : ''}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                          <QrCode size={11} />{p.traceMode === 'PER_LOT' ? t('mode.perLot') : t('mode.sharedShort')}
                        </span>
                      </div>
                      {p.description && <div className="text-[13px] text-[var(--muted)] leading-relaxed">{p.description}</div>}
                      <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap text-[12.5px]">
                        <span className="mono text-[var(--muted)]"><span className="text-[var(--faint)] font-semibold uppercase tracking-wide text-[10.5px] mr-1.5">GTIN</span>{p.gtin}</span>
                        <span className="text-[var(--muted)]"><span className="text-[var(--faint)] font-semibold uppercase tracking-wide text-[10.5px] mr-1.5">{t('col.unit')}</span>{p.organization?.name ?? t('notAssigned')}</span>
                        {(p.flows ?? []).length === 0
                          ? <span className="pill pill-warn"><i />{t('noFlow')}</span>
                          : <span className="chip"><GitBranch size={12} />{p.flows[0].flow.name}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">{rowActions(p)}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          <Paginator page={paged.page} pageSize={10} total={paged.total} onPage={setPage} />
        </div>
      )}

      {editProduct && <EditProduct product={editProduct} onClose={() => setEditProduct(null)} />}
      {qrProduct && <ProductQr product={qrProduct} onClose={() => setQrProduct(null)} />}
      {traceProduct && <TraceRecords product={traceProduct} onClose={() => setTraceProduct(null)} />}
    </>
  );
}

/** Ô thumbnail vuông cho hàng sổ cái (Products chưa có ảnh nhãn → placeholder). */
function ProductThumb({ size = 40 }: { size?: number }) {
  return (
    <span className="rounded-xl grid place-items-center flex-none" style={{ width: size, height: size, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
      <Package size={size * 0.45} />
    </span>
  );
}

function toLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/** Xem & cập nhật dữ liệu truy xuất (event records) của một sản phẩm. */
function TraceRecords({ product, onClose }: { product: any; onClose: () => void }) {
  const t = useT(MSG);
  const recs = useQuery({ queryKey: ['records', product.id], queryFn: () => api.get('/event-records/by-product', { params: { productId: product.id } }).then((r) => r.data) });
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ performedByName: '', when: '', location: '', action: '', values: {} as Record<string, any> });

  const openEdit = (r: any) => {
    const values: Record<string, any> = {};
    (r.values ?? []).forEach((v: any) => { values[v.fieldKey] = v.valueJson; });
    setForm({ performedByName: r.performedByName ?? r.performedBy?.fullName ?? '', when: toLocalInput(r.performedAt), location: r.location ?? '', action: r.action ?? '', values });
    setEditing(r);
  };
  const save = useApiMutation(() => api.patch(`/event-records/${editing.id}`, {
      traceableItemId: editing.traceableItemId, flowVersionId: editing.flowVersionId, eventDefinitionId: editing.eventDefinitionId,
      performedByName: form.performedByName, performedAt: form.when ? new Date(form.when).toISOString() : undefined,
      location: form.location, action: form.action, values: form.values,
    }), {
    successMessage: t('tr.saved'),
    invalidate: [['records', product.id]],
    onSuccess: () => setEditing(null),
  });
  const del = useApiMutation((id: string) => api.delete(`/event-records/${id}`), { successMessage: t('tr.deleted'), invalidate: [['records', product.id]] });

  return (
    <Drawer open onClose={onClose} title={<><b>{t('tr.title')}</b><div className="text-xs text-[var(--muted)]">{product.name}</div></>}
      footer={editing ? <><button className="btn" onClick={() => setEditing(null)}>{t('cancel')}</button><div className="flex-1" /><button className="btn btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending && <Loader2 size={15} className="animate-spin" />}{t('save')}</button></> : undefined}>
      {recs.isLoading ? <Spinner /> : editing ? (
        <div>
          <div className="text-sm text-[var(--muted)] mb-3">{t('tr.editEvent')} <b className="text-[var(--ink)]">{editing.eventDefinition?.name}</b></div>
          <label className="block mb-3"><span className="label">{t('f.performer')}</span><input className="input" value={form.performedByName} onChange={(e) => setForm({ ...form, performedByName: e.target.value })} /></label>
          <label className="block mb-3"><span className="label">{t('f.time')}</span><input className="input" type="datetime-local" value={form.when} onChange={(e) => setForm({ ...form, when: e.target.value })} /></label>
          <label className="block mb-3"><span className="label">{t('f.location')}</span><input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
          <label className="block mb-3"><span className="label">{t('f.action')}</span><input className="input" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} /></label>
          {(editing.eventDefinition?.fields ?? []).map((f: any) => (
            <label key={f.id} className="block mb-3"><span className="label">{f.label}</span>
              <input className="input" value={form.values[f.key] ?? ''} onChange={(e) => setForm({ ...form, values: { ...form.values, [f.key]: e.target.value } })} /></label>
          ))}
        </div>
      ) : (recs.data?.length ?? 0) === 0 ? (
        <EmptyState title={t('tr.empty.title')} hint={t('tr.empty.hint')} />
      ) : (
        <div className="flex flex-col gap-2.5">
          {recs.data.map((r: any) => (
            <div key={r.id} className="card p-3.5 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="chip chip-accent flex-none">{t('tr.event', { n: r.eventDefinition?.order })}</span>
                <b className="text-[13.5px] flex-1 min-w-0 truncate">{r.eventDefinition?.name}</b>
                <button className="btn btn-sm" onClick={() => openEdit(r)}><Pencil size={12} />{t('act.edit')}</button>
                <button className="btn btn-sm btn-danger" title={t('tr.deleteTitle')} onClick={() => { if (window.confirm(t('tr.deleteConfirm'))) del.mutate(r.id); }}><Trash2 size={12} /></button>
              </div>
              <div className="text-[11.5px] text-[var(--muted)] flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span>{r.performedByName ?? r.performedBy?.fullName ?? t('unknown')}</span>
                <span className="text-[var(--faint)]">·</span>
                <span>{r.performedAt ? new Date(r.performedAt).toLocaleString('vi-VN') : t('unknown')}</span>
                <span className="text-[var(--faint)]">·</span>
                <span>{r.location ?? t('unknown')}</span>
              </div>
              {r.action && <div className="text-xs text-[var(--ink-2)]">{r.action}</div>}
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}

function EditProduct({ product, onClose }: { product: any; onClose: () => void }) {
  const t = useT(MSG);
  const orgs = useQuery<Organization[]>({ queryKey: ['orgs'], queryFn: () => api.get('/organizations').then((r) => r.data) });
  const flows = useQuery<Flow[]>({ queryKey: ['flows-all'], queryFn: () => api.get('/flows').then((r) => r.data) });
  const [name, setName] = useState(product.name ?? '');
  const [description, setDescription] = useState(product.description ?? '');
  const [organizationId, setOrganizationId] = useState(product.organizationId ?? '');
  const [flowId, setFlowId] = useState<string>(product.flows?.[0]?.flow.id ?? '');
  const [traceMode, setTraceMode] = useState(product.traceMode ?? 'SHARED');

  const save = useApiMutation(async () => {
      await api.patch(`/products/${product.id}`, { name, description, organizationId: organizationId || undefined, traceMode });
      await api.put(`/products/${product.id}/flows`, { flowIds: flowId ? [flowId] : [] });
    }, {
    successMessage: t('ep.saved'),
    invalidate: [['products']],
    onSuccess: () => onClose(),
  });

  return (
    <Drawer open onClose={onClose} title={<><b>{t('ep.title')}</b><div className="text-xs text-[var(--muted)] mono">{product.gtin}</div></>}
      footer={<><div className="flex-1" /><button className="btn" onClick={onClose}>{t('cancel')}</button>
        <button className="btn btn-primary" disabled={!name || save.isPending} onClick={() => save.mutate()}>{save.isPending && <Loader2 size={15} className="animate-spin" />}{t('save')}</button></>}>
      <label className="block mb-4"><span className="label">{t('ep.name')}</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="block mb-4"><span className="label">{t('ep.desc')}</span><textarea className="input min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      <label className="block mb-4"><span className="label">{t('col.unit')}</span>
        <select className="input" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
          <option value="">{t('ep.selectUnit')}</option>
          {(orgs.data ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </label>
      <span className="label">{t('ep.modeLabel')}</span>
      <div className="flex flex-col gap-2.5 mb-5">
        {[['SHARED', t('mode.shared.t'), t('mode.shared.d')], ['PER_LOT', t('mode.perLot.t'), t('mode.perLot.d')]].map(([val, title, desc]) => {
          const on = traceMode === val;
          return (
            <button key={val} onClick={() => setTraceMode(val)} className={`opt items-start ${on ? 'sel' : ''}`}>
              <span className="w-[18px] h-[18px] rounded-full grid place-items-center flex-none mt-0.5" style={{ border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border-strong)'}` }}>{on && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />}</span>
              <span><b className="text-[13.5px]">{title}</b><div className="text-[11.5px] text-[var(--muted)] leading-relaxed mt-0.5">{desc}</div></span>
            </button>
          );
        })}
      </div>
      <span className="label">{t('ep.flowLabel')}</span>
      {flows.isLoading ? <Spinner /> : (
        <div className="flex flex-col gap-2.5">
          {(flows.data ?? []).map((f) => {
            const on = flowId === f.id;
            return (
              <button key={f.id} className={`opt ${on ? 'sel' : ''}`} onClick={() => setFlowId(on ? '' : f.id)}>
                <span className="w-[18px] h-[18px] rounded-full grid place-items-center flex-none" style={{ border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border-strong)'}` }}>{on && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />}</span>
                <span className="iconbox" style={{ width: 30, height: 30 }}><GitBranch size={15} /></span>
                <span className="text-sm flex-1 font-semibold">{f.name}</span>
                <span className="chip flex-none">{t('ep.events', { n: f.versions?.[0]?.eventDefinitions?.length ?? 0 })}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="text-xs text-[var(--muted)] mt-2.5">{flowId ? '' : t('ep.unassignHint')}</div>

      {flowId && (
        <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <span className="label">{t('ep.entererLabel')}</span>
          <div className="text-[11.5px] text-[var(--muted)] mb-2">{t('ep.entererHint')}</div>
          <FlowEnterers flowId={flowId} />
        </div>
      )}
    </Drawer>
  );
}

function FlowEnterers({ flowId }: { flowId: string }) {
  const t = useT(MSG);
  const toast = useToast();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const perms = useQuery({ queryKey: ['flow-perms', flowId], queryFn: () => api.get(`/flows/${flowId}/permissions`).then((r) => r.data) });
  const search = useQuery({ queryKey: ['users-branch', q], enabled: q.trim().length > 0, queryFn: () => api.get('/users/branch', { params: { q } }).then((r) => r.data) });
  const inv = () => qc.invalidateQueries({ queryKey: ['flow-perms', flowId] });
  const add = useApiMutation((userId: string) => api.post(`/flows/${flowId}/permissions`, { userId }), {
    successMessage: t('fe.granted'),
    invalidate: [['flow-perms', flowId]],
    onSuccess: () => setQ(''),
  });
  const del = useMutation({ mutationFn: (id: string) => api.delete(`/flow-permissions/${id}`), onSuccess: () => { toast(t('fe.removed')); inv(); } });
  const flowPerms = (perms.data ?? []).filter((p: any) => !p.eventDefinitionId);
  const assigned = new Set(flowPerms.map((p: any) => p.user.id));
  const results = (search.data ?? []).filter((u: any) => !assigned.has(u.id));
  return (
    <div className="flex flex-col gap-2">
      {flowPerms.length === 0 && <p className="text-xs text-[var(--muted)]">{t('fe.empty')}</p>}
      {flowPerms.map((p: any) => (
        <div key={p.id} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ border: '1px solid var(--border)' }}>
          <div className="flex-1 min-w-0"><b className="text-[13px]">{p.user.fullName}</b><div className="text-[11px] text-[var(--muted)] truncate">{p.user.email}</div></div>
          <button className="btn btn-sm btn-danger" onClick={() => del.mutate(p.id)}><Trash2 size={12} /></button>
        </div>
      ))}
      <div className="flex items-center gap-2 rounded-full px-3.5 py-2" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
        <Search size={15} className="text-[var(--muted)]" />
        <input className="flex-1 bg-transparent outline-none text-sm" placeholder={t('fe.searchPh')} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {q.trim().length > 0 && (
        <div className="flex flex-col gap-1.5">
          {results.map((u: any) => (
            <div key={u.id} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ border: '1px solid var(--border)' }}>
              <div className="flex-1 min-w-0"><b className="text-[13px]">{u.fullName}</b><div className="text-[11px] text-[var(--muted)] truncate">{u.email}{u.organization?.name ? ` · ${u.organization.name}` : ''}</div></div>
              <button className="btn btn-sm btn-primary" onClick={() => add.mutate(u.id)}>{t('fe.allow')}</button>
            </div>
          ))}
          {!search.isLoading && results.length === 0 && <p className="text-xs text-[var(--muted)]">{t('fe.notFound')}</p>}
        </div>
      )}
    </div>
  );
}

function ProductQr({ product, onClose }: { product: any; onClose: () => void }) {
  const t = useT(MSG);
  const perLot = product.traceMode === 'PER_LOT';
  const [lot, setLot] = useState('');
  const qr = useQuery({ queryKey: ['product-qr', product.id, lot], queryFn: () => api.get(`/products/${product.id}/qr`, { params: { lot: lot || undefined } }).then((r) => r.data) });
  return (
    <Drawer open onClose={onClose} title={<><b>{perLot ? t('pq.byLot') : t('pq.shared')}</b><div className="text-xs text-[var(--muted)]">{product.name}</div></>}>
      {perLot && (
        <label className="block mb-3"><span className="label">{t('pq.lotLabel')}</span>
          <input className="input mono" value={lot} onChange={(e) => setLot(e.target.value)} placeholder={t('pq.lotPh')} /></label>
      )}
      {qr.isLoading ? <Spinner /> : (
        <div className="text-center">
          <div className="card inline-flex p-3 mx-auto">
            <img src={qr.data?.dataUrl} alt="QR" className="w-52 h-52 rounded-xl" />
          </div>
          <div className="mono text-[11px] text-[var(--faint)] mt-3.5 break-all px-2">{qr.data?.url}</div>
          <a className="btn btn-primary btn-lg mt-4" href={qr.data?.dataUrl} download={`qr-${product.gtin}${lot ? '-' + lot : ''}.png`}><Download size={16} />{t('pq.downloadPng')}</a>
          <p className="text-xs text-[var(--muted)] mt-3 leading-relaxed">{perLot ? t('pq.noteLot') : t('pq.noteShared')}</p>
        </div>
      )}
    </Drawer>
  );
}
