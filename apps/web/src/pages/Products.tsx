import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, QrCode, Check, Download, Loader2, Pencil, Trash2, GitBranch, UploadCloud, History } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { PageHead, Spinner, EmptyState, Drawer } from '../components/ui';
import { PERMISSIONS } from '@vlabel/shared';

export default function Products() {
  const { can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const canEdit = can(PERMISSIONS.PRODUCT_UPDATE);
  const q = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products').then((r) => r.data) });
  const [editProduct, setEditProduct] = useState<any | null>(null);
  const [qrProduct, setQrProduct] = useState<any | null>(null);
  const [traceProduct, setTraceProduct] = useState<any | null>(null);

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => { toast('Đã xoá sản phẩm'); qc.invalidateQueries({ queryKey: ['products'] }); },
    onError: (e) => toast(apiError(e), false),
  });
  const sync = useMutation({
    mutationFn: (id: string) => api.post(`/products/${id}/sync`),
    onSuccess: () => toast('Đã đồng bộ lên Cổng truy xuất nguồn gốc quốc gia'),
    onError: (e) => toast(apiError(e), false),
  });

  return (
    <>
      <PageHead title="Quản lý sản phẩm" subtitle="Gắn GTIN với tên & thông tin, gán Flow truy xuất, tải QR"
        actions={can(PERMISSIONS.PRODUCT_CREATE) && <Link to="/products/new" className="btn btn-primary"><Plus size={16} />Tạo sản phẩm</Link>} />
      {q.isLoading ? <Spinner /> : (q.data?.length ?? 0) === 0 ? (
        <div className="card"><EmptyState title="Chưa có sản phẩm" hint="Tạo sản phẩm bằng cách chọn GTIN từ VNPC."
          action={can(PERMISSIONS.PRODUCT_CREATE) && <Link to="/products/new" className="btn btn-primary btn-sm"><Plus size={15} />Tạo sản phẩm</Link>} /></div>
      ) : (
        <div className="flex flex-col gap-3">
          {q.data.map((p: any) => (
            <div key={p.id} className="card card-hover anim-in p-4 flex flex-col gap-3.5 lg:flex-row lg:items-center lg:gap-5">
              <div className="min-w-0 flex-1 flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <b className="text-[15px] tracking-tight">{p.name}</b>
                  <span className={`chip ${p.traceMode === 'PER_LOT' ? 'chip-accent' : ''}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                    <QrCode size={11} />{p.traceMode === 'PER_LOT' ? 'QR / lô' : '1 QR chung'}
                  </span>
                </div>
                {p.description && <div className="text-[13px] text-[var(--muted)] leading-relaxed">{p.description}</div>}
                <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap text-[12.5px]">
                  <span className="mono text-[var(--muted)]"><span className="text-[var(--faint)] font-semibold uppercase tracking-wide text-[10.5px] mr-1.5">GTIN</span>{p.gtin}</span>
                  <span className="text-[var(--muted)]"><span className="text-[var(--faint)] font-semibold uppercase tracking-wide text-[10.5px] mr-1.5">Đơn vị</span>{p.organization?.name ?? 'Chưa gán'}</span>
                  {(p.flows ?? []).length === 0
                    ? <span className="pill pill-warn"><i />Chưa gán Flow</span>
                    : <span className="chip"><GitBranch size={12} />{p.flows[0].flow.name}</span>}
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap lg:flex-none lg:justify-end">
                {canEdit && <button className="btn btn-sm" onClick={() => setEditProduct(p)}><Pencil size={13} />Sửa</button>}
                <button className="btn btn-sm" onClick={() => setTraceProduct(p)}><History size={13} />Truy xuất</button>
                <button className="btn btn-sm" onClick={() => setQrProduct(p)}><QrCode size={13} />Tải QR</button>
                <a className="btn btn-sm" href={`/t/${p.gtin}`} target="_blank" rel="noreferrer">Trang QR</a>
                {canEdit && <button className="btn btn-sm" title="Đồng bộ lên Cổng truy xuất nguồn gốc quốc gia" disabled={sync.isPending} onClick={() => sync.mutate(p.id)}><UploadCloud size={13} />Đồng bộ</button>}
                {canEdit && <button className="btn btn-sm btn-danger" title="Xoá sản phẩm" onClick={() => { if (window.confirm(`Xoá sản phẩm "${p.name}"?`)) del.mutate(p.id); }}><Trash2 size={13} /></button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {editProduct && <EditProduct product={editProduct} onClose={() => setEditProduct(null)} />}
      {qrProduct && <ProductQr product={qrProduct} onClose={() => setQrProduct(null)} />}
      {traceProduct && <TraceRecords product={traceProduct} onClose={() => setTraceProduct(null)} />}
    </>
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
  const toast = useToast();
  const qc = useQueryClient();
  const recs = useQuery({ queryKey: ['records', product.id], queryFn: () => api.get('/event-records/by-product', { params: { productId: product.id } }).then((r) => r.data) });
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ performedByName: '', when: '', location: '', action: '', values: {} as Record<string, any> });
  const inv = () => qc.invalidateQueries({ queryKey: ['records', product.id] });

  const openEdit = (r: any) => {
    const values: Record<string, any> = {};
    (r.values ?? []).forEach((v: any) => { values[v.fieldKey] = v.valueJson; });
    setForm({ performedByName: r.performedByName ?? r.performedBy?.fullName ?? '', when: toLocalInput(r.performedAt), location: r.location ?? '', action: r.action ?? '', values });
    setEditing(r);
  };
  const save = useMutation({
    mutationFn: () => api.patch(`/event-records/${editing.id}`, {
      traceableItemId: editing.traceableItemId, flowVersionId: editing.flowVersionId, eventDefinitionId: editing.eventDefinitionId,
      performedByName: form.performedByName, performedAt: form.when ? new Date(form.when).toISOString() : undefined,
      location: form.location, action: form.action, values: form.values,
    }),
    onSuccess: () => { toast('Đã cập nhật hồ sơ'); setEditing(null); inv(); },
    onError: (e) => toast(apiError(e), false),
  });
  const del = useMutation({ mutationFn: (id: string) => api.delete(`/event-records/${id}`), onSuccess: () => { toast('Đã xoá hồ sơ'); inv(); }, onError: (e) => toast(apiError(e), false) });

  return (
    <Drawer open onClose={onClose} title={<><b>Dữ liệu truy xuất</b><div className="text-xs text-[var(--muted)]">{product.name}</div></>}
      footer={editing ? <><button className="btn" onClick={() => setEditing(null)}>Huỷ</button><div className="flex-1" /><button className="btn btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending && <Loader2 size={15} className="animate-spin" />}Lưu</button></> : undefined}>
      {recs.isLoading ? <Spinner /> : editing ? (
        <div>
          <div className="text-sm text-[var(--muted)] mb-3">Sửa sự kiện: <b className="text-[var(--ink)]">{editing.eventDefinition?.name}</b></div>
          <label className="block mb-3"><span className="label">Người thực hiện (Who)</span><input className="input" value={form.performedByName} onChange={(e) => setForm({ ...form, performedByName: e.target.value })} /></label>
          <label className="block mb-3"><span className="label">Thời gian (When)</span><input className="input" type="datetime-local" value={form.when} onChange={(e) => setForm({ ...form, when: e.target.value })} /></label>
          <label className="block mb-3"><span className="label">Địa điểm (Where)</span><input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
          <label className="block mb-3"><span className="label">Hành động (What)</span><input className="input" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} /></label>
          {(editing.eventDefinition?.fields ?? []).map((f: any) => (
            <label key={f.id} className="block mb-3"><span className="label">{f.label}</span>
              <input className="input" value={form.values[f.key] ?? ''} onChange={(e) => setForm({ ...form, values: { ...form.values, [f.key]: e.target.value } })} /></label>
          ))}
        </div>
      ) : (recs.data?.length ?? 0) === 0 ? (
        <EmptyState title="Chưa có dữ liệu truy xuất" hint="Sản phẩm này chưa có hồ sơ sự kiện nào." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {recs.data.map((r: any) => (
            <div key={r.id} className="card p-3.5 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="chip chip-accent flex-none">Sự kiện {r.eventDefinition?.order}</span>
                <b className="text-[13.5px] flex-1 min-w-0 truncate">{r.eventDefinition?.name}</b>
                <button className="btn btn-sm" onClick={() => openEdit(r)}><Pencil size={12} />Sửa</button>
                <button className="btn btn-sm btn-danger" title="Xoá hồ sơ" onClick={() => { if (window.confirm('Xoá hồ sơ này?')) del.mutate(r.id); }}><Trash2 size={12} /></button>
              </div>
              <div className="text-[11.5px] text-[var(--muted)] flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span>{r.performedByName ?? r.performedBy?.fullName ?? 'Chưa rõ'}</span>
                <span className="text-[var(--faint)]">·</span>
                <span>{r.performedAt ? new Date(r.performedAt).toLocaleString('vi-VN') : 'Chưa rõ'}</span>
                <span className="text-[var(--faint)]">·</span>
                <span>{r.location ?? 'Chưa rõ'}</span>
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
  const toast = useToast();
  const qc = useQueryClient();
  const orgs = useQuery({ queryKey: ['orgs'], queryFn: () => api.get('/organizations').then((r) => r.data) });
  const flows = useQuery({ queryKey: ['flows-all'], queryFn: () => api.get('/flows').then((r) => r.data) });
  const [name, setName] = useState(product.name ?? '');
  const [description, setDescription] = useState(product.description ?? '');
  const [organizationId, setOrganizationId] = useState(product.organizationId ?? '');
  const [flowId, setFlowId] = useState<string>(product.flows?.[0]?.flow.id ?? '');
  const [traceMode, setTraceMode] = useState(product.traceMode ?? 'SHARED');

  const save = useMutation({
    mutationFn: async () => {
      await api.patch(`/products/${product.id}`, { name, description, organizationId: organizationId || undefined, traceMode });
      await api.put(`/products/${product.id}/flows`, { flowIds: flowId ? [flowId] : [] });
    },
    onSuccess: () => { toast('Đã lưu sản phẩm'); qc.invalidateQueries({ queryKey: ['products'] }); onClose(); },
    onError: (e) => toast(apiError(e), false),
  });

  return (
    <Drawer open onClose={onClose} title={<><b>Sửa sản phẩm</b><div className="text-xs text-[var(--muted)] mono">{product.gtin}</div></>}
      footer={<><div className="flex-1" /><button className="btn" onClick={onClose}>Huỷ</button>
        <button className="btn btn-primary" disabled={!name || save.isPending} onClick={() => save.mutate()}>{save.isPending && <Loader2 size={15} className="animate-spin" />}Lưu</button></>}>
      <label className="block mb-4"><span className="label">Tên sản phẩm</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="block mb-4"><span className="label">Mô tả</span><textarea className="input min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      <label className="block mb-4"><span className="label">Đơn vị</span>
        <select className="input" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
          <option value="">Chọn đơn vị</option>
          {(orgs.data ?? []).map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </label>
      <span className="label">Chế độ QR truy xuất</span>
      <div className="flex flex-col gap-2.5 mb-5">
        {[['SHARED', 'Dùng chung một QR', 'Một QR cho sản phẩm, phân định bằng lô / ngày sản xuất.'], ['PER_LOT', 'Mỗi lô một QR riêng', 'Mỗi lô / ngày sản xuất có QR và truy xuất riêng.']].map(([val, title, desc]) => {
          const on = traceMode === val;
          return (
            <button key={val} onClick={() => setTraceMode(val)} className={`opt items-start ${on ? 'sel' : ''}`}>
              <span className="w-[18px] h-[18px] rounded-full grid place-items-center flex-none mt-0.5" style={{ border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border-strong)'}` }}>{on && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />}</span>
              <span><b className="text-[13.5px]">{title}</b><div className="text-[11.5px] text-[var(--muted)] leading-relaxed mt-0.5">{desc}</div></span>
            </button>
          );
        })}
      </div>
      <span className="label">Flow truy xuất (một flow)</span>
      {flows.isLoading ? <Spinner /> : (
        <div className="flex flex-col gap-2.5">
          {(flows.data ?? []).map((f: any) => {
            const on = flowId === f.id;
            return (
              <button key={f.id} className={`opt ${on ? 'sel' : ''}`} onClick={() => setFlowId(on ? '' : f.id)}>
                <span className="w-[18px] h-[18px] rounded-full grid place-items-center flex-none" style={{ border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border-strong)'}` }}>{on && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />}</span>
                <span className="iconbox" style={{ width: 30, height: 30 }}><GitBranch size={15} /></span>
                <span className="text-sm flex-1 font-semibold">{f.name}</span>
                <span className="chip flex-none">{f.versions?.[0]?.eventDefinitions?.length ?? 0} sự kiện</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="text-xs text-[var(--muted)] mt-2.5">{flowId ? '' : 'Chưa chọn nghĩa là bỏ gán Flow.'}</div>
    </Drawer>
  );
}

function ProductQr({ product, onClose }: { product: any; onClose: () => void }) {
  const perLot = product.traceMode === 'PER_LOT';
  const [lot, setLot] = useState('');
  const qr = useQuery({ queryKey: ['product-qr', product.id, lot], queryFn: () => api.get(`/products/${product.id}/qr`, { params: { lot: lot || undefined } }).then((r) => r.data) });
  return (
    <Drawer open onClose={onClose} title={<><b>{perLot ? 'QR theo lô' : 'QR dùng chung'}</b><div className="text-xs text-[var(--muted)]">{product.name}</div></>}>
      {perLot && (
        <label className="block mb-3"><span className="label">Lô / ngày sản xuất</span>
          <input className="input mono" value={lot} onChange={(e) => setLot(e.target.value)} placeholder="Nhập lô để lấy QR riêng cho lô đó" /></label>
      )}
      {qr.isLoading ? <Spinner /> : (
        <div className="text-center">
          <div className="card inline-flex p-3 mx-auto">
            <img src={qr.data?.dataUrl} alt="QR" className="w-52 h-52 rounded-xl" />
          </div>
          <div className="mono text-[11px] text-[var(--faint)] mt-3.5 break-all px-2">{qr.data?.url}</div>
          <a className="btn btn-primary btn-lg mt-4" href={qr.data?.dataUrl} download={`qr-${product.gtin}${lot ? '-' + lot : ''}.png`}><Download size={16} />Tải PNG</a>
          <p className="text-xs text-[var(--muted)] mt-3 leading-relaxed">{perLot ? 'Mỗi lô có QR riêng. Nhập lô ở trên để lấy đúng QR cho lô đó.' : 'Một QR dùng chung cho sản phẩm, phân định bằng lô khi kê khai.'}</p>
        </div>
      )}
    </Drawer>
  );
}
