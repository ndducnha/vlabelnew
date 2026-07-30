import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Trash2, Tag, Layers, Send, Undo2, ExternalLink, Download, QrCode, Pencil, CheckCircle2, XCircle, Globe, ShieldCheck, Search } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { PageHead, Spinner, EmptyState, Drawer, Paginator } from '../components/ui';
import { PERMISSIONS, APPENDIX_GROUPS, appendixGroupByCode } from '@vlabel/shared';

const STATUS: Record<string, { cls: string; label: string }> = {
  draft: { cls: 'pill-warn', label: 'Nháp' },
  published: { cls: 'pill-good', label: 'Đã công bố' },
  recalled: { cls: 'pill-bad', label: 'Thu hồi' },
};
const RISK = ['Chưa xác định', 'Cao', 'Trung bình', 'Thấp'];
const PUBLIC_BASE = (import.meta as any).env?.VITE_PUBLIC_BASE ?? window.location.origin;

export default function Elabels() {
  const { can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const canEdit = can(PERMISSIONS.PRODUCT_UPDATE);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<any>(null);
  const [batches, setBatches] = useState<any>(null);
  const pageSize = 10;

  const list = useQuery({ queryKey: ['elabels', status], queryFn: () => api.get('/elabels', { params: { status: status || undefined } }).then((r) => r.data) });
  const inv = () => qc.invalidateQueries({ queryKey: ['elabels'] });
  const filtered = (list.data ?? []).filter((p: any) => !q || p.name?.toLowerCase().includes(q.toLowerCase()) || (p.gtin ?? '').includes(q));
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const setSt = useMutation({
    mutationFn: ({ id, status, recallReason }: any) => api.post(`/elabels/${id}/status`, { status, recallReason }),
    onSuccess: (_d, v: any) => { toast(v.status === 'published' ? 'Đã công bố nhãn' : v.status === 'recalled' ? 'Đã thu hồi nhãn' : 'Đã chuyển nháp'); inv(); },
    onError: (e) => toast(apiError(e), false),
  });

  return (
    <>
      <PageHead title="Nhãn điện tử" subtitle="Soạn nội dung nhãn, quản lý lô, công bố và sinh QR cho người tiêu dùng quét"
        actions={<>
          <div className="flex items-center gap-2 rounded-full px-3.5 h-10" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
            <Search size={15} className="text-[var(--muted)]" />
            <input className="bg-transparent outline-none text-sm" style={{ width: 200 }} placeholder="Tìm sản phẩm theo tên / GTIN…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          <select className="input" style={{ width: 170 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Tất cả trạng thái</option>
            <option value="draft">Nháp</option>
            <option value="published">Đã công bố</option>
            <option value="recalled">Thu hồi</option>
          </select>
        </>} />

      {list.isLoading ? <Spinner /> : total === 0 ? (
        <div className="card anim-in"><EmptyState title={q ? 'Không tìm thấy sản phẩm' : 'Chưa có nhãn'} hint={q ? 'Thử từ khóa khác theo tên hoặc GTIN.' : 'Nhãn điện tử được tạo từ sản phẩm ở mục Quản lý sản phẩm. Vào đây để soạn nội dung nhãn và công bố.'} /></div>
      ) : (
        <>
          {/* Bảng cho màn hình lớn */}
          <div className="card overflow-hidden p-0 hidden md:block anim-in">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[var(--muted)]" style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wide">Nhãn</th><th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wide">Trạng thái</th>
                <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wide">Lô</th><th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wide text-right">Thao tác</th>
              </tr></thead>
              <tbody className="rows">
                {rows.map((p: any) => {
                  const s = STATUS[p.elabelStatus] ?? STATUS.draft;
                  return (
                    <tr key={p.id} className="card-hover">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="iconbox"><Tag size={17} /></span>
                          <div className="min-w-0"><b>{p.name}</b>{p.brand && <span className="text-[var(--muted)]"> · {p.brand}</span>}<div className="text-xs text-[var(--muted)] mono mt-0.5">GTIN {p.gtin}</div></div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><span className={`pill ${s.cls}`}><i />{s.label}</span></td>
                      <td className="px-5 py-3.5"><button className="btn btn-sm" onClick={() => setBatches(p)}><Layers size={13} />{p.batchCount} lô</button></td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1.5 justify-end flex-wrap">
                          <a className="btn btn-sm" href={`${PUBLIC_BASE}/t/${p.gtin}`} target="_blank" rel="noreferrer" title="Xem thử trang nhãn"><ExternalLink size={13} />Xem thử</a>
                          {canEdit && <button className="btn btn-sm" onClick={() => setEdit(p)}><Pencil size={13} />Soạn nhãn</button>}
                          {canEdit && p.elabelStatus !== 'published' && <button className="btn btn-sm btn-primary" onClick={() => setSt.mutate({ id: p.id, status: 'published' })}><Send size={13} />Công bố</button>}
                          {canEdit && p.elabelStatus === 'published' && <button className="btn btn-sm btn-danger" onClick={() => { const r = window.prompt('Lý do thu hồi:'); if (r !== null) setSt.mutate({ id: p.id, status: 'recalled', recallReason: r }); }}><Undo2 size={13} />Thu hồi</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Thẻ cho di động */}
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((p: any) => {
              const s = STATUS[p.elabelStatus] ?? STATUS.draft;
              return (
                <div key={p.id} className="card card-hover p-4 anim-in">
                  <div className="flex items-start gap-3">
                    <span className="iconbox"><Tag size={18} /></span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <b className="truncate">{p.name}</b>
                        <span className={`pill ${s.cls}`}><i />{s.label}</span>
                      </div>
                      {p.brand && <div className="text-sm text-[var(--muted)] mt-0.5">{p.brand}</div>}
                      <div className="text-xs text-[var(--muted)] mono mt-0.5">GTIN {p.gtin}</div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap mt-3.5">
                    <button className="btn btn-sm" onClick={() => setBatches(p)}><Layers size={14} />{p.batchCount} lô</button>
                    <a className="btn btn-sm" href={`${PUBLIC_BASE}/t/${p.gtin}`} target="_blank" rel="noreferrer" title="Xem thử trang nhãn"><ExternalLink size={14} />Xem thử</a>
                    {canEdit && <button className="btn btn-sm" onClick={() => setEdit(p)}><Pencil size={14} />Soạn nhãn</button>}
                    {canEdit && p.elabelStatus !== 'published' && <button className="btn btn-sm btn-primary" onClick={() => setSt.mutate({ id: p.id, status: 'published' })}><Send size={14} />Công bố</button>}
                    {canEdit && p.elabelStatus === 'published' && <button className="btn btn-sm btn-danger" onClick={() => { const r = window.prompt('Lý do thu hồi:'); if (r !== null) setSt.mutate({ id: p.id, status: 'recalled', recallReason: r }); }}><Undo2 size={14} />Thu hồi</button>}
                  </div>
                </div>
              );
            })}
          </div>
          <Paginator page={safePage} pageSize={pageSize} total={total} onPage={setPage} />
        </>
      )}

      {edit && <EditLabel product={edit} onClose={() => setEdit(null)} />}
      {batches && <BatchesDrawer product={batches} canEdit={canEdit} onClose={() => setBatches(null)} />}
    </>
  );
}

function EditLabel({ product, onClose }: { product: any; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const detail = useQuery({ queryKey: ['elabel', product.id], queryFn: () => api.get(`/elabels/${product.id}`).then((r) => r.data) });
  const d = detail.data;
  const [f, setF] = useState<any>(null);
  // khởi tạo form khi có dữ liệu
  if (d && !f) {
    const o = d.ownerInfo ?? {};
    setF({
      name: d.name ?? '', brand: d.brand ?? '', description: d.description ?? '', countryOfOrigin: d.countryOfOrigin ?? '',
      hsCode: d.hsCode ?? '', targetMarket: d.targetMarket ?? '', supplier: d.supplier ?? '', riskLevel: d.riskLevel ?? 0,
      netContent: d.netContent ?? '', ingredients: d.ingredients ?? '', usageInstructions: d.usageInstructions ?? '',
      storageInstructions: d.storageInstructions ?? '', safetyWarnings: d.safetyWarnings ?? '',
      appendixGroup: d.appendixGroup ?? '', appendixAttributes: (d.appendixAttributes && typeof d.appendixAttributes === 'object') ? d.appendixAttributes : {},
      owner: { name: o.name ?? '', tax_code: o.tax_code ?? '', address: o.address ?? '', representative: o.representative ?? '' },
      attributes: Array.isArray(d.labelAttributes) ? d.labelAttributes : [],
      images: Array.isArray(d.labelImages) ? d.labelImages : [],
      certificates: Array.isArray(d.certificates) ? d.certificates : [],
    });
  }

  const save = useMutation({
    mutationFn: () => api.patch(`/elabels/${product.id}`, {
      name: f.name, brand: f.brand, description: f.description, countryOfOrigin: f.countryOfOrigin, hsCode: f.hsCode,
      targetMarket: f.targetMarket, supplier: f.supplier, riskLevel: Number(f.riskLevel),
      netContent: f.netContent, ingredients: f.ingredients, usageInstructions: f.usageInstructions,
      storageInstructions: f.storageInstructions, safetyWarnings: f.safetyWarnings,
      appendixGroup: f.appendixGroup || null, appendixAttributes: f.appendixAttributes,
      ownerInfo: f.owner, labelAttributes: f.attributes, labelImages: f.images, certificates: f.certificates,
    }),
    onSuccess: () => { toast('Đã lưu nội dung nhãn'); qc.invalidateQueries({ queryKey: ['elabels'] }); qc.invalidateQueries({ queryKey: ['elabel', product.id] }); comp.refetch(); },
    onError: (e) => toast(apiError(e), false),
  });
  const comp = useQuery({ queryKey: ['elabel-compliance', product.id], queryFn: () => api.get(`/elabels/${product.id}/compliance`).then((r) => r.data) });
  const portalSync = useMutation({ mutationFn: () => api.post(`/elabels/${product.id}/portal-sync`), onSuccess: () => { toast('Đã kết nối Cổng truy xuất quốc gia'); comp.refetch(); qc.invalidateQueries({ queryKey: ['elabels'] }); }, onError: (e) => toast(apiError(e), false) });

  return (
    <Drawer open onClose={onClose} title={<><b>Soạn nhãn</b><div className="text-xs text-[var(--muted)] mono">GTIN {product.gtin}</div></>}
      footer={<><div className="flex-1" /><button className="btn" onClick={onClose}>Đóng</button><button className="btn btn-primary" disabled={!f || save.isPending} onClick={() => save.mutate()}>{save.isPending && <Loader2 size={15} className="animate-spin" />}Lưu</button></>}>
      {!f ? <Spinner /> : (
        <div className="flex flex-col gap-3.5 anim-in">
          {comp.data && <CompliancePanel data={comp.data} onSync={() => portalSync.mutate()} syncing={portalSync.isPending} />}
          <Section title="Thông tin cơ bản" />
          <div className="grid grid-cols-2 gap-3">
            <L label="Tên sản phẩm"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></L>
            <L label="Nhãn hiệu"><input className="input" value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} /></L>
          </div>
          <L label="Mô tả"><textarea className="input" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></L>
          <div className="grid grid-cols-2 gap-3">
            <L label="Xuất xứ"><input className="input" value={f.countryOfOrigin} onChange={(e) => setF({ ...f, countryOfOrigin: e.target.value })} /></L>
            <L label="Mã HS"><input className="input mono" value={f.hsCode} onChange={(e) => setF({ ...f, hsCode: e.target.value })} /></L>
            <L label="Thị trường mục tiêu"><input className="input" value={f.targetMarket} onChange={(e) => setF({ ...f, targetMarket: e.target.value })} /></L>
            <L label="Nhà cung cấp"><input className="input" value={f.supplier} onChange={(e) => setF({ ...f, supplier: e.target.value })} /></L>
          </div>
          <L label="Mức rủi ro"><select className="input" value={f.riskLevel} onChange={(e) => setF({ ...f, riskLevel: e.target.value })}>{RISK.map((r, i) => <option key={i} value={i}>{r}</option>)}</select></L>

          <Section title="Nội dung bắt buộc theo Nghị định 37/2026" />
          <L label="Định lượng (khối lượng/thể tích/số lượng)"><input className="input" value={f.netContent} onChange={(e) => setF({ ...f, netContent: e.target.value })} placeholder="VD: 50ml · 20 viên · 5kg" /></L>
          <L label="Thành phần / cấu tạo"><textarea className="input" rows={2} value={f.ingredients} onChange={(e) => setF({ ...f, ingredients: e.target.value })} /></L>
          <div className="grid grid-cols-2 gap-3">
            <L label="Hướng dẫn sử dụng"><textarea className="input" rows={2} value={f.usageInstructions} onChange={(e) => setF({ ...f, usageInstructions: e.target.value })} /></L>
            <L label="Hướng dẫn bảo quản"><textarea className="input" rows={2} value={f.storageInstructions} onChange={(e) => setF({ ...f, storageInstructions: e.target.value })} /></L>
          </div>
          <L label="Cảnh báo an toàn"><textarea className="input" rows={2} value={f.safetyWarnings} onChange={(e) => setF({ ...f, safetyWarnings: e.target.value })} placeholder="Bắt buộc với hàng rủi ro cao/trung bình" /></L>

          <Section title="Nhóm hàng hóa theo Phụ lục I (NĐ 37/2026)" />
          <L label="Nhóm hàng hóa">
            <select className="input" value={f.appendixGroup} onChange={(e) => setF({ ...f, appendixGroup: e.target.value })}>
              <option value="">— chọn nhóm hàng hóa —</option>
              {APPENDIX_GROUPS.map((g) => <option key={g.code} value={g.code}>{g.name}</option>)}
            </select>
          </L>
          {(() => {
            const grp = appendixGroupByCode(f.appendixGroup);
            if (!grp) return <p className="text-xs text-[var(--muted)]">Chọn nhóm hàng hóa để hiện các trường bắt buộc tương ứng.</p>;
            const setA = (k: string, v: string) => setF({ ...f, appendixAttributes: { ...f.appendixAttributes, [k]: v } });
            return grp.fields.map((fl) => (
              <L key={fl.key} label={`${fl.label}${fl.required ? ' *' : ''}`}>
                {fl.type === 'textarea'
                  ? <textarea className="input" rows={2} value={f.appendixAttributes[fl.key] ?? ''} onChange={(e) => setA(fl.key, e.target.value)} />
                  : <input className="input" type={fl.type === 'date' ? 'date' : fl.type === 'number' ? 'number' : 'text'} value={f.appendixAttributes[fl.key] ?? ''} onChange={(e) => setA(fl.key, e.target.value)} />}
              </L>
            ));
          })()}

          <Section title="Doanh nghiệp chịu trách nhiệm" />
          <div className="grid grid-cols-2 gap-3">
            <L label="Tên doanh nghiệp"><input className="input" value={f.owner.name} onChange={(e) => setF({ ...f, owner: { ...f.owner, name: e.target.value } })} /></L>
            <L label="Mã số thuế"><input className="input mono" value={f.owner.tax_code} onChange={(e) => setF({ ...f, owner: { ...f.owner, tax_code: e.target.value } })} /></L>
          </div>
          <L label="Địa chỉ"><input className="input" value={f.owner.address} onChange={(e) => setF({ ...f, owner: { ...f.owner, address: e.target.value } })} /></L>
          <L label="Người đại diện"><input className="input" value={f.owner.representative} onChange={(e) => setF({ ...f, owner: { ...f.owner, representative: e.target.value } })} /></L>

          <Section title="Thông tin khác" action={<button className="btn btn-sm" onClick={() => setF({ ...f, attributes: [...f.attributes, { field_name: '', field_value: '' }] })}><Plus size={13} />Thêm</button>} />
          {f.attributes.length === 0 && <p className="text-xs text-[var(--muted)]">Chưa có. Bấm Thêm để bổ sung trường tự do.</p>}
          {f.attributes.map((a: any, i: number) => (
            <div key={i} className="flex gap-2 items-start">
              <input className="input" style={{ flex: '0 0 38%' }} placeholder="Tên trường" value={a.field_name} onChange={(e) => { const n = [...f.attributes]; n[i] = { ...a, field_name: e.target.value }; setF({ ...f, attributes: n }); }} />
              <input className="input" placeholder="Nội dung" value={a.field_value} onChange={(e) => { const n = [...f.attributes]; n[i] = { ...a, field_value: e.target.value }; setF({ ...f, attributes: n }); }} />
              <button className="btn btn-sm btn-danger" onClick={() => setF({ ...f, attributes: f.attributes.filter((_: any, j: number) => j !== i) })}><Trash2 size={13} /></button>
            </div>
          ))}

          <Section title="Ảnh sản phẩm (dán link)" action={<button className="btn btn-sm" onClick={() => setF({ ...f, images: [...f.images, { url: '', note: '', source: 'elabel' }] })}><Plus size={13} />Thêm</button>} />
          {f.images.map((im: any, i: number) => (
            <div key={i} className="flex gap-2 items-start">
              <input className="input" placeholder="https://…" value={im.url} onChange={(e) => { const n = [...f.images]; n[i] = { ...im, url: e.target.value }; setF({ ...f, images: n }); }} />
              <button className="btn btn-sm btn-danger" onClick={() => setF({ ...f, images: f.images.filter((_: any, j: number) => j !== i) })}><Trash2 size={13} /></button>
            </div>
          ))}

          <Section title="Chứng nhận (dán link)" action={<button className="btn btn-sm" onClick={() => setF({ ...f, certificates: [...f.certificates, ''] })}><Plus size={13} />Thêm</button>} />
          {f.certificates.map((c: string, i: number) => (
            <div key={i} className="flex gap-2 items-start">
              <input className="input" placeholder="https://…" value={c} onChange={(e) => { const n = [...f.certificates]; n[i] = e.target.value; setF({ ...f, certificates: n }); }} />
              <button className="btn btn-sm btn-danger" onClick={() => setF({ ...f, certificates: f.certificates.filter((_: string, j: number) => j !== i) })}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}

function BatchesDrawer({ product, canEdit, onClose }: { product: any; canEdit: boolean; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const detail = useQuery({ queryKey: ['elabel', product.id], queryFn: () => api.get(`/elabels/${product.id}`).then((r) => r.data) });
  const inv = () => { qc.invalidateQueries({ queryKey: ['elabel', product.id] }); qc.invalidateQueries({ queryKey: ['elabels'] }); };
  const today = new Date().toISOString().slice(0, 10);
  const [nf, setNf] = useState({ batchCode: '', manufacturingDate: today, totalQuantity: '' });
  const [qr, setQr] = useState<any>(null);

  const add = useMutation({ mutationFn: () => api.post(`/elabels/${product.id}/batches`, { batchCode: nf.batchCode, manufacturingDate: nf.manufacturingDate, totalQuantity: nf.totalQuantity ? Number(nf.totalQuantity) : undefined, status: 'published' }), onSuccess: () => { toast('Đã thêm lô'); setNf({ batchCode: '', manufacturingDate: today, totalQuantity: '' }); inv(); }, onError: (e) => toast(apiError(e), false) });
  const setBs = useMutation({ mutationFn: ({ id, status, recallReason }: any) => api.post(`/elabels/${product.id}/batches/${id}/status`, { status, recallReason }), onSuccess: () => inv(), onError: (e) => toast(apiError(e), false) });
  const del = useMutation({ mutationFn: (id: string) => api.delete(`/elabels/${product.id}/batches/${id}`), onSuccess: () => { toast('Đã xoá lô'); inv(); }, onError: (e) => toast(apiError(e), false) });
  const loadQr = useMutation({ mutationFn: (id: string) => api.get(`/elabels/${product.id}/batches/${id}/qr`).then((r) => r.data), onSuccess: (data) => setQr(data), onError: (e) => toast(apiError(e), false) });

  const batches = detail.data?.batches ?? [];
  return (
    <Drawer open onClose={onClose} title={<><b>Lô của nhãn</b><div className="text-xs text-[var(--muted)]">{product.name}</div></>}>
      {canEdit && (
        <div className="card p-4 mb-3.5 anim-in" style={{ background: 'var(--surface)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="iconbox" style={{ width: 30, height: 30 }}><Plus size={16} /></span>
            <b className="text-[13.5px]">Thêm lô mới</b>
          </div>
          <div className="flex flex-col gap-2.5">
            <input className="input mono" placeholder="Số lô (VD: LOT-2408-01)" value={nf.batchCode} onChange={(e) => setNf({ ...nf, batchCode: e.target.value })} />
            <div className="grid grid-cols-2 gap-2.5">
              <input className="input" type="date" value={nf.manufacturingDate} onChange={(e) => setNf({ ...nf, manufacturingDate: e.target.value })} />
              <input className="input" type="number" placeholder="Số lượng" value={nf.totalQuantity} onChange={(e) => setNf({ ...nf, totalQuantity: e.target.value })} />
            </div>
            <button className="btn btn-primary btn-lg" disabled={!nf.batchCode || add.isPending} onClick={() => add.mutate()}>{add.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}Thêm lô</button>
          </div>
        </div>
      )}
      {detail.isLoading ? <Spinner /> : batches.length === 0 ? (
        <EmptyState title="Chưa có lô" hint="Thêm lô để sinh QR riêng cho từng đợt sản xuất." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {batches.map((b: any) => {
            const s = STATUS[b.status] ?? STATUS.draft;
            return (
              <div key={b.id} className="card card-hover p-3.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="w-9 h-9 rounded-xl grid place-items-center flex-none" style={{ background: 'var(--surface)', color: 'var(--muted)' }}><QrCode size={16} /></span>
                  <div className="flex-1 min-w-[130px]">
                    <b className="mono">{b.batchCode}</b>
                    <div className="text-xs text-[var(--muted)] mt-0.5">{b.manufacturingDate ? `NSX ${new Date(b.manufacturingDate).toLocaleDateString('vi-VN')}` : ''}{b.totalQuantity ? ` · SL ${b.totalQuantity}` : ''}</div>
                  </div>
                  <span className={`pill ${s.cls}`}><i />{s.label}</span>
                  <div className="flex gap-1.5">
                    <button className="btn btn-sm" title="QR lô" onClick={() => loadQr.mutate(b.id)}><QrCode size={13} /></button>
                    {canEdit && b.status === 'published' && <button className="btn btn-sm btn-danger" title="Thu hồi lô" onClick={() => { const r = window.prompt('Lý do thu hồi lô:'); if (r !== null) setBs.mutate({ id: b.id, status: 'recalled', recallReason: r }); }}><Undo2 size={13} /></button>}
                    {canEdit && b.status !== 'published' && <button className="btn btn-sm" title="Công bố lô" onClick={() => setBs.mutate({ id: b.id, status: 'published' })}><Send size={13} /></button>}
                    {canEdit && <button className="btn btn-sm btn-danger" title="Xoá lô" onClick={() => { if (window.confirm('Xoá lô?')) del.mutate(b.id); }}><Trash2 size={13} /></button>}
                  </div>
                </div>
                {qr?.batchCode === b.batchCode && (
                  <div className="text-center mt-3.5 pt-3.5 pop" style={{ borderTop: '1px solid var(--border)' }}>
                    <img src={qr.dataUrl} alt="QR" className="w-44 h-44 mx-auto rounded-2xl border p-2" style={{ borderColor: 'var(--border)', background: '#fff' }} />
                    <div className="mono text-[10.5px] text-[var(--faint)] mt-2.5 break-all">{qr.url}</div>
                    {qr.traceabilityUrl && <div className="text-[10.5px] text-[var(--muted)] mt-1 break-all">Cổng quốc gia: {qr.traceabilityUrl}</div>}
                    <a className="btn btn-sm btn-primary mt-2.5 inline-flex" href={qr.dataUrl} download={`qr-${product.gtin}-${b.batchCode}.png`}><Download size={13} />Tải PNG</a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}

function CompliancePanel({ data, onSync, syncing }: { data: any; onSync: () => void; syncing: boolean }) {
  const needPortal = data.items.find((i: any) => i.key === 'portal');
  const metCount = data.items.filter((i: any) => i.met).length;
  const total = data.items.length;
  const pct = total ? Math.round((metCount / total) * 100) : 0;
  return (
    <div className="card p-4" style={{ background: 'var(--surface)' }}>
      <div className="flex items-center gap-3 mb-3">
        <span className="iconbox" style={{ background: data.canPublish ? 'var(--good-soft)' : 'var(--warn-soft)', color: data.canPublish ? 'var(--good)' : 'var(--warn)' }}><ShieldCheck size={18} /></span>
        <div className="flex-1 min-w-0">
          <b className="text-[14px] block leading-tight">Tuân thủ Nghị định 37/2026</b>
          <span className="text-xs text-[var(--muted)]">{metCount}/{total} tiêu chí đạt</span>
        </div>
        <span className={`pill ${data.canPublish ? 'pill-good' : 'pill-warn'}`}><i />{data.canPublish ? 'Đủ điều kiện công bố' : 'Chưa đủ điều kiện'}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: data.canPublish ? 'var(--good)' : 'var(--warn)' }} />
      </div>
      <div className="flex flex-col gap-1.5">
        {data.items.map((it: any) => (
          <div key={it.key} className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
            {it.met ? <CheckCircle2 size={16} className="text-[var(--good)] flex-none" /> : <XCircle size={16} className={it.required ? 'text-[var(--danger)] flex-none' : 'text-[var(--faint)] flex-none'} />}
            <span className={`text-[12.5px] flex-1 min-w-0 ${it.met ? '' : 'text-[var(--muted)]'}`}>{it.label}</span>
            {it.met ? <span className="text-[11px] font-semibold text-[var(--good)]">Đạt</span> : it.required && <span className="pill pill-bad text-[10px] px-2 py-0">Bắt buộc</span>}
          </div>
        ))}
      </div>
      {needPortal && !needPortal.met && (
        <button className="btn btn-sm mt-3 w-full justify-center" disabled={syncing} onClick={onSync}>{syncing ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}Kết nối Cổng truy xuất quốc gia</button>
      )}
    </div>
  );
}

function Section({ title, action }: { title: string; action?: any }) {
  return <div className="flex items-center justify-between gap-2 mt-2 pb-1.5" style={{ borderBottom: '1px solid var(--border)' }}><div className="text-[11px] font-bold uppercase tracking-wider text-[var(--faint)]">{title}</div>{action}</div>;
}
function L({ label, children }: { label: string; children: any }) {
  return <label className="block"><span className="label">{label}</span>{children}</label>;
}
