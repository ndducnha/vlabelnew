import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Pencil, Copy, Trash2, ExternalLink, Send, Archive, ChevronLeft, ArrowRight, Check, Loader2,
  Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Link2, Image as ImageIcon, Undo2, Redo2, Eraser, Package, Eye, Minus, FilePlus2,
} from 'lucide-react';
import { api, apiError, fileUrl } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { PageHead, Spinner, EmptyState, SegmentedControl } from '../components/ui';
import { PERMISSIONS } from '@vlabel/shared';

const SCOPE: Record<string, string> = { ALL: 'Toàn bộ sản phẩm', BATCH: 'Theo lô', PRODUCTION: 'Theo ngày SX', ITEM: 'Theo đơn vị (serial)' };
const STATUS: Record<string, { cls: string; label: string }> = { draft: { cls: 'pill-warn', label: 'Nháp' }, published: { cls: 'pill-good', label: 'Đã xuất bản' }, archived: { cls: 'pill-neutral', label: 'Ngừng dùng' } };
const VARIABLES: [string, string][] = [['{{product_name}}', 'Tên SP'], ['{{gtin}}', 'GTIN'], ['{{batch_number}}', 'Số lô'], ['{{manufacturing_date}}', 'NSX'], ['{{expiry_date}}', 'HSD'], ['{{manufacturer_name}}', 'Nhà SX'], ['{{manufacturer_address}}', 'Địa chỉ'], ['{{origin}}', 'Xuất xứ'], ['{{qr_code}}', 'Mã QR']];
const TITLES: Record<string, string> = { product: 'Chọn sản phẩm', scope: 'Phạm vi áp dụng', content: 'Soạn trang nhãn phụ', publish: 'Lưu và xuất bản' };

// Mẫu trang web nhãn phụ (chèn nhanh, người dùng điền tiếp)
const WEB_TEMPLATE = `<h2>{{product_name}}</h2>
<p><b>GTIN:</b> {{gtin}}</p>
<h3>Thành phần</h3><p>Nhập thành phần sản phẩm…</p>
<h3>Công dụng</h3><p>Nhập công dụng…</p>
<h3>Hướng dẫn sử dụng</h3><p>Nhập hướng dẫn sử dụng…</p>
<h3>Hướng dẫn bảo quản</h3><p>Nhập hướng dẫn bảo quản…</p>
<h3>Cảnh báo an toàn</h3><p>Nhập cảnh báo (nếu có)…</p>
<h3>Xuất xứ & tổ chức chịu trách nhiệm</h3>
<p><b>Xuất xứ:</b> {{origin}}</p>
<p><b>Chịu trách nhiệm:</b> {{manufacturer_name}}</p>
<p><b>Địa chỉ:</b> {{manufacturer_address}}</p>`;

export default function Supplementary() {
  const { can } = useAuth();
  const canEdit = can(PERMISSIONS.PRODUCT_UPDATE);
  const [wizard, setWizard] = useState<any | null>(null);
  if (wizard) return <Wizard initial={wizard} onClose={() => setWizard(null)} />;
  return <ListView canEdit={canEdit} onNew={() => setWizard({})} onEdit={(l: any) => setWizard(l)} />;
}

function ListView({ canEdit, onNew, onEdit }: any) {
  const toast = useToast();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const list = useQuery({ queryKey: ['supp', status], queryFn: () => api.get('/supplementary-labels', { params: { status: status || undefined } }).then((r) => r.data) });
  const inv = () => qc.invalidateQueries({ queryKey: ['supp'] });
  const del = useMutation({ mutationFn: (id: string) => api.delete(`/supplementary-labels/${id}`), onSuccess: () => { toast('Đã xóa'); inv(); }, onError: (e) => toast(apiError(e), false) });
  const clone = useMutation({ mutationFn: (id: string) => api.post(`/supplementary-labels/${id}/clone`), onSuccess: () => { toast('Đã sao chép'); inv(); }, onError: (e) => toast(apiError(e), false) });
  const setSt = useMutation({ mutationFn: ({ id, s }: any) => api.post(`/supplementary-labels/${id}/status`, { status: s }), onSuccess: () => { toast('Đã cập nhật'); inv(); }, onError: (e) => toast(apiError(e), false) });

  const rows = (list.data ?? []).filter((r: any) => !q || r.name?.toLowerCase().includes(q.toLowerCase()) || r.product?.name?.toLowerCase().includes(q.toLowerCase()) || (r.product?.gtin ?? '').includes(q) || (r.batchCode ?? '').includes(q));
  const PUBLIC_BASE = window.location.origin;

  return (
    <>
      <PageHead title="Nhãn phụ" subtitle="Nhãn bổ sung (thường tiếng Việt) gắn theo sản phẩm/lô, hiển thị trên cùng mã QR"
        actions={<>
          <div className="flex items-center gap-2 rounded-full px-3.5 h-10" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
            <Search size={15} className="text-[var(--muted)]" />
            <input className="bg-transparent outline-none text-sm" style={{ width: 200 }} placeholder="Tìm theo tên, sản phẩm, GTIN, lô…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="input" style={{ width: 150 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="draft">Nháp</option>
            <option value="published">Đã xuất bản</option>
            <option value="archived">Ngừng dùng</option>
          </select>
          {canEdit && <button className="btn btn-primary" onClick={onNew}><Plus size={16} />Tạo nhãn phụ</button>}
        </>} />

      {list.isLoading ? <Spinner /> : rows.length === 0 ? (
        <div className="card"><EmptyState title={q ? 'Không tìm thấy' : 'Chưa có nhãn phụ'} hint={canEdit ? 'Bấm Tạo nhãn phụ để soạn nội dung bổ sung cho sản phẩm.' : 'Chưa có nhãn phụ nào.'} action={canEdit ? <button className="btn btn-primary" onClick={onNew}><Plus size={15} />Tạo nhãn phụ</button> : undefined} /></div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r: any) => {
            const s = STATUS[r.status] ?? STATUS.draft;
            return (
              <div key={r.id} className="card card-hover p-4 anim-in">
                <div className="flex items-start gap-3 flex-wrap">
                  <span className="iconbox flex-none"><Package size={18} /></span>
                  <div className="flex-1 min-w-[180px]">
                    <div className="flex items-center gap-2 flex-wrap"><b className="text-[15px]">{r.name}</b><span className={`pill ${s.cls}`}><i />{s.label}</span></div>
                    <div className="text-xs text-[var(--muted)] mt-1">{r.product?.name} · <span className="mono">{r.product?.gtin}</span></div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="chip">{SCOPE[r.scope] ?? r.scope}</span>
                      {r.batchCode && <span className="chip mono">Lô {r.batchCode}</span>}
                      <span className="chip">v{r.version}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    <a className="btn btn-sm" href={`${PUBLIC_BASE}/t/${r.product?.gtin}${r.batchCode ? `?lot=${r.batchCode}` : ''}`} target="_blank" rel="noreferrer" title="Xem thử trang QR"><ExternalLink size={13} /></a>
                    {canEdit && <button className="btn btn-sm" onClick={() => onEdit(r)}><Pencil size={13} />Sửa</button>}
                    {canEdit && <button className="btn btn-sm" onClick={() => clone.mutate(r.id)}><Copy size={13} /></button>}
                    {canEdit && r.status !== 'published' && <button className="btn btn-sm btn-primary" onClick={() => setSt.mutate({ id: r.id, s: 'published' })}><Send size={13} />Xuất bản</button>}
                    {canEdit && r.status === 'published' && <button className="btn btn-sm" onClick={() => setSt.mutate({ id: r.id, s: 'archived' })}><Archive size={13} />Ngừng</button>}
                    {canEdit && <button className="btn btn-sm btn-danger" onClick={() => { if (window.confirm('Xóa nhãn phụ?')) del.mutate(r.id); }}><Trash2 size={13} /></button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function Wizard({ initial, onClose }: { initial: any; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const products = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products').then((r) => r.data) });
  const [idx, setIdx] = useState(0);
  const [f, setF] = useState<any>({
    id: initial.id, productId: initial.productId ?? '', product: initial.product ?? null,
    name: initial.name ?? 'Nhãn phụ tiếng Việt', scope: initial.scope ?? 'ALL',
    batchCode: initial.batchCode ?? '', manufacturingDate: (initial.manufacturingDate ?? '').slice(0, 10), expiryDate: (initial.expiryDate ?? '').slice(0, 10),
    packagingDate: (initial.packagingDate ?? '').slice(0, 10), serial: initial.serial ?? '', note: initial.note ?? '',
    contentHtml: initial.contentHtml ?? '', labelSize: initial.labelSize ?? '80x50', orientation: initial.orientation ?? 'portrait',
  });
  const [qrUrl, setQrUrl] = useState('');
  const steps = ['product', 'scope', 'content', 'publish'];
  const screen = steps[idx];

  // nạp QR sản phẩm để xem trước biến {{qr_code}}
  useEffect(() => { if (f.productId) api.get(`/products/${f.productId}/qr`, { params: { lot: f.batchCode || undefined } }).then((r) => setQrUrl(r.data.dataUrl)).catch(() => {}); }, [f.productId, f.batchCode]);

  const payload = () => ({ productId: f.productId, name: f.name, scope: f.scope, batchCode: f.batchCode || undefined, manufacturingDate: f.manufacturingDate || undefined, expiryDate: f.expiryDate || undefined, packagingDate: f.packagingDate || undefined, serial: f.serial || undefined, note: f.note || undefined, contentHtml: f.contentHtml, labelSize: f.labelSize, orientation: f.orientation });
  const saveDraft = async () => {
    if (f.id) { await api.patch(`/supplementary-labels/${f.id}`, payload()); return f.id; }
    const { data } = await api.post('/supplementary-labels', payload()); setF((s: any) => ({ ...s, id: data.id })); return data.id;
  };
  const save = useMutation({ mutationFn: saveDraft, onSuccess: () => { toast('Đã lưu nháp'); qc.invalidateQueries({ queryKey: ['supp'] }); onClose(); }, onError: (e) => toast(apiError(e), false) });
  const publish = useMutation({ mutationFn: async () => { const id = await saveDraft(); await api.post(`/supplementary-labels/${id}/status`, { status: 'published' }); }, onSuccess: () => { toast('✅ Đã xuất bản nhãn phụ'); qc.invalidateQueries({ queryKey: ['supp'] }); onClose(); }, onError: (e) => toast(apiError(e), false) });

  const canNext = screen === 'product' ? !!f.productId : true;
  const selectProduct = (p: any) => setF((s: any) => ({ ...s, productId: p.id, product: p }));

  return (
    <div className="max-w-[560px] mx-auto pb-4">
      <div className="flex items-center gap-2 mb-3">
        <button className="btn btn-ghost btn-sm" onClick={idx === 0 ? onClose : () => setIdx((i) => i - 1)}><ChevronLeft size={20} /></button>
        <div className="flex-1 text-center"><div className="text-[11px] font-bold uppercase tracking-wide text-[var(--faint)]">Bước {idx + 1}/{steps.length}</div><div className="text-[13px] font-semibold">{f.id ? 'Sửa nhãn phụ' : 'Tạo nhãn phụ'}</div></div>
        <button className="btn btn-ghost btn-sm" onClick={() => save.mutate()} title="Lưu nháp" disabled={!f.productId || save.isPending}>{save.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Lưu'}</button>
      </div>
      <div className="h-2 rounded-full overflow-hidden mb-5" style={{ background: 'var(--surface)' }}><div className="h-full rounded-full transition-all duration-300" style={{ width: `${((idx + 1) / steps.length) * 100}%`, background: 'linear-gradient(90deg,var(--accent),#7aa0ff)' }} /></div>

      <div key={screen} className="anim-in">
        <h2 className="text-[22px] font-extrabold tracking-tight mb-1">{TITLES[screen]}</h2>
        {f.product && screen !== 'product' && <p className="text-[13px] text-[var(--muted)] mb-4">{f.product.name} · <span className="mono">{f.product.gtin}</span></p>}
        <div className="mt-2">
          {screen === 'product' && <ProductStep products={products.data ?? []} selected={f.productId} onSelect={selectProduct} onGtin={(g: string) => api.get('/products/by-gtin', { params: { gtin: g } }).then((r) => selectProduct(r.data)).catch(() => toast('Không tìm thấy GTIN', false))} />}
          {screen === 'scope' && <ScopeStep f={f} setF={setF} />}
          {screen === 'content' && <ContentStep f={f} setF={setF} qrUrl={qrUrl} />}
          {screen === 'publish' && <PublishStep f={f} setF={setF} />}
        </div>
      </div>

      <div className="sticky bottom-3 mt-6 flex gap-2.5" style={{ zIndex: 5 }}>
        {idx > 0 && <button className="btn" style={{ minHeight: 52 }} onClick={() => setIdx((i) => i - 1)}><ChevronLeft size={18} />Trước</button>}
        {screen !== 'publish'
          ? <button className="btn btn-primary btn-lg" disabled={!canNext} onClick={async () => { if (screen === 'content') { try { await saveDraft(); } catch (e) { toast(apiError(e), false); return; } } setIdx((i) => i + 1); }}>Tiếp tục <ArrowRight size={18} /></button>
          : <>
              <button className="btn btn-lg" style={{ flex: '0 0 auto', width: 'auto', paddingLeft: 20, paddingRight: 20 }} disabled={save.isPending} onClick={() => save.mutate()}>Lưu nháp</button>
              <button className="btn btn-primary btn-lg" disabled={publish.isPending} onClick={() => publish.mutate()}>{publish.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Xuất bản</button>
            </>}
      </div>
    </div>
  );
}

function ProductStep({ products, selected, onSelect, onGtin }: any) {
  const [q, setQ] = useState('');
  const [gtin, setGtin] = useState('');
  const shown = products.filter((p: any) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.gtin ?? '').includes(q));
  return (
    <div className="flex flex-col gap-3">
      <div className="card p-3.5">
        <div className="text-[13px] font-semibold mb-2">Nhập GTIN thủ công (hoặc từ VNPC đã đồng bộ)</div>
        <div className="flex gap-2"><input className="input mono" placeholder="GTIN…" value={gtin} onChange={(e) => setGtin(e.target.value)} /><button className="btn btn-primary" disabled={!gtin} onClick={() => onGtin(gtin)}>Nhận</button></div>
      </div>
      <div className="flex items-center gap-2 rounded-full px-4 py-2.5" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
        <Search size={16} className="text-[var(--muted)]" />
        <input className="flex-1 bg-transparent outline-none text-sm" placeholder="Tìm sản phẩm theo tên / GTIN…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: 320 }}>
        {shown.map((p: any) => (
          <button key={p.id} onClick={() => onSelect(p)} className={`opt ${selected === p.id ? 'sel' : ''}`}>
            {p.image ? <img src={fileUrl(p.image)} alt="" className="w-10 h-10 rounded-lg object-cover flex-none" /> : <span className="w-10 h-10 rounded-lg grid place-items-center flex-none" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Package size={18} /></span>}
            <div className="flex-1"><b className="text-sm">{p.name}</b><div className="text-xs text-[var(--muted)] mono">{p.gtin} · {p.organization?.name ?? ''} · {p.elabelStatus === 'published' ? 'đã công bố' : p.elabelStatus}</div></div>
            {selected === p.id && <Check size={18} className="text-[var(--accent)]" />}
          </button>
        ))}
        {shown.length === 0 && <p className="text-sm text-[var(--muted)] py-2">Không có sản phẩm phù hợp.</p>}
      </div>
    </div>
  );
}

function ScopeStep({ f, setF }: any) {
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl value={f.scope} onChange={(v: string) => setF({ ...f, scope: v })} options={Object.entries(SCOPE).map(([value, label]) => ({ value, label }))} />
      {f.scope !== 'ALL' && <p className="text-[12px] text-[var(--muted)]">Nhãn phụ chỉ áp dụng cho phạm vi đã chọn (khớp khi quét QR đúng lô/serial).</p>}
      {(f.scope === 'BATCH' || f.scope === 'ITEM') && <L label="Mã lô"><input className="input mono" value={f.batchCode} onChange={(e) => setF({ ...f, batchCode: e.target.value })} placeholder="LOT-2026-001" /></L>}
      {f.scope === 'ITEM' && <L label="Serial / mã đơn vị"><input className="input mono" value={f.serial} onChange={(e) => setF({ ...f, serial: e.target.value })} /></L>}
      {(f.scope === 'PRODUCTION') && <L label="Ngày sản xuất"><input className="input" type="date" value={f.manufacturingDate} onChange={(e) => setF({ ...f, manufacturingDate: e.target.value })} /></L>}
      <div className="grid grid-cols-2 gap-3">
        <L label="Hạn sử dụng"><input className="input" type="date" value={f.expiryDate} onChange={(e) => setF({ ...f, expiryDate: e.target.value })} /></L>
        <L label="Ngày đóng gói"><input className="input" type="date" value={f.packagingDate} onChange={(e) => setF({ ...f, packagingDate: e.target.value })} /></L>
      </div>
      <L label="Ghi chú nội bộ"><textarea className="input" rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></L>
    </div>
  );
}

function ContentStep({ f, setF, qrUrl }: any) {
  const [preview, setPreview] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] text-[var(--muted)]">Nội dung hiển thị như một trang web khi người dùng quét QR. Chèn mẫu để có sẵn bố cục, rồi điền nội dung.</p>
        <button className="btn btn-sm flex-none" onClick={() => setPreview((p) => !p)}><Eye size={14} />{preview ? 'Đóng' : 'Xem trước'}</button>
      </div>
      <RichEditor value={f.contentHtml} onChange={(html: string) => setF((s: any) => ({ ...s, contentHtml: html }))} variables={VARIABLES} template={WEB_TEMPLATE} />
      {preview && (
        <div className="card p-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--faint)] mb-2">Xem trước như trang QR</div>
          <div className="np-content text-sm" style={{ lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: renderPreview(f.contentHtml, f, qrUrl) }} />
        </div>
      )}
    </div>
  );
}

const COLORS = ['#111827', '#E23744', '#12A150', '#2E5BE8', '#D97706'];
function RichEditor({ value, onChange, variables, template }: { value: string; onChange: (html: string) => void; variables?: [string, string][]; template?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value || ''; /* eslint-disable-next-line */ }, []);
  const emit = () => onChange(ref.current?.innerHTML ?? '');
  const exec = (cmd: string, val?: string) => { ref.current?.focus(); document.execCommand(cmd, false, val); emit(); };
  const Btn = ({ cmd, val, children, title }: any) => <button type="button" title={title} className="ws-tb" onMouseDown={(e) => { e.preventDefault(); exec(cmd, val); }}>{children}</button>;
  const selStyle = { height: 30, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink-2)', fontSize: 12, padding: '0 6px' } as any;
  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 p-1.5" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <select style={selStyle} title="Kiểu chữ" value="" onChange={(e) => { exec('formatBlock', e.target.value); e.currentTarget.value = ''; }}>
          <option value="" disabled>Kiểu</option>
          <option value="H2">Tiêu đề lớn</option>
          <option value="H3">Tiêu đề nhỏ</option>
          <option value="P">Đoạn văn</option>
          <option value="BLOCKQUOTE">Trích dẫn</option>
        </select>
        <Btn cmd="bold" title="Đậm"><Bold size={15} /></Btn>
        <Btn cmd="italic" title="Nghiêng"><Italic size={15} /></Btn>
        <Btn cmd="underline" title="Gạch chân"><Underline size={15} /></Btn>
        {COLORS.map((c) => <button key={c} type="button" className="ws-tb" title="Màu chữ" onMouseDown={(e) => { e.preventDefault(); exec('foreColor', c); }}><span style={{ width: 13, height: 13, borderRadius: 3, background: c, display: 'block' }} /></button>)}
        <span className="ws-sep" />
        <Btn cmd="insertUnorderedList" title="Danh sách"><List size={15} /></Btn>
        <Btn cmd="insertOrderedList" title="Danh sách số"><ListOrdered size={15} /></Btn>
        <span className="ws-sep" />
        <Btn cmd="justifyLeft" title="Trái"><AlignLeft size={15} /></Btn>
        <Btn cmd="justifyCenter" title="Giữa"><AlignCenter size={15} /></Btn>
        <Btn cmd="justifyRight" title="Phải"><AlignRight size={15} /></Btn>
        <span className="ws-sep" />
        <button type="button" className="ws-tb" title="Liên kết" onMouseDown={(e) => { e.preventDefault(); const u = window.prompt('Nhập URL:'); if (u) exec('createLink', u); }}><Link2 size={15} /></button>
        <button type="button" className="ws-tb" title="Chèn ảnh" onMouseDown={(e) => { e.preventDefault(); const u = window.prompt('URL ảnh:'); if (u) exec('insertImage', u); }}><ImageIcon size={15} /></button>
        <button type="button" className="ws-tb" title="Đường kẻ" onMouseDown={(e) => { e.preventDefault(); exec('insertHorizontalRule'); }}><Minus size={15} /></button>
        <button type="button" className="ws-tb" title="Ký hiệu" onMouseDown={(e) => { e.preventDefault(); const s = window.prompt('Ký hiệu (VD ®, ™, °C, ✓):'); if (s) exec('insertText', s); }}>Ω</button>
        <span className="ws-sep" />
        <Btn cmd="undo" title="Hoàn tác"><Undo2 size={15} /></Btn>
        <Btn cmd="redo" title="Làm lại"><Redo2 size={15} /></Btn>
        <Btn cmd="removeFormat" title="Xóa định dạng"><Eraser size={15} /></Btn>
      </div>
      {(template || (variables && variables.length > 0)) && (
        <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
          {template && <button type="button" className="btn btn-sm" onMouseDown={(e) => { e.preventDefault(); if (!ref.current?.textContent?.trim() || window.confirm('Chèn mẫu web vào vị trí con trỏ?')) exec('insertHTML', template); }}><FilePlus2 size={13} />Chèn mẫu web</button>}
          {variables?.map(([t, l]) => <button key={t} type="button" className="chip" title={t} onMouseDown={(e) => { e.preventDefault(); exec('insertText', t); }}>{l}</button>)}
        </div>
      )}
      <div ref={ref} contentEditable suppressContentEditableWarning className="np-content p-3.5 text-sm outline-none" style={{ minHeight: 220, lineHeight: 1.6 }} onInput={emit} />
    </div>
  );
}

function renderPreview(html: string, f: any, qrUrl: string) {
  const p = f.product ?? {};
  const map: Record<string, string> = {
    product_name: p.name ?? '', gtin: p.gtin ?? '', batch_number: f.batchCode ?? '',
    manufacturing_date: f.manufacturingDate ? new Date(f.manufacturingDate).toLocaleDateString('vi-VN') : '',
    expiry_date: f.expiryDate ? new Date(f.expiryDate).toLocaleDateString('vi-VN') : '',
    manufacturer_name: p.organization?.name ?? '', manufacturer_address: '',
    origin: p.countryOfOrigin ?? '', qr_code: qrUrl ? `<img src="${qrUrl}" style="width:96px;height:96px" />` : '',
  };
  return (html || '<span style="color:#98A2B6">Nội dung nhãn phụ sẽ hiển thị ở đây…</span>').replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, k) => map[k.toLowerCase()] ?? '');
}


function PublishStep({ f, setF }: any) {
  return (
    <div className="flex flex-col gap-3">
      <L label="Tên nhãn phụ"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></L>
      <div className="card p-4 flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
        <Row k="Sản phẩm" v={f.product?.name} />
        <Row k="GTIN" v={f.product?.gtin} mono />
        <Row k="Phạm vi" v={SCOPE[f.scope]} />
        {f.batchCode && <Row k="Lô" v={f.batchCode} mono />}
      </div>
      <p className="text-[12px] text-[var(--muted)]">Xuất bản sẽ hiển thị nhãn phụ như một tab trên trang QR công khai của sản phẩm và tạo một phiên bản mới.</p>
    </div>
  );
}

function L({ label, children }: any) { return <label className="block"><span className="label">{label}</span>{children}</label>; }
function Row({ k, v, mono }: any) { return <div className="flex justify-between gap-4 py-2.5 text-sm"><span className="text-[var(--muted)]">{k}</span><b className={`text-right ${mono ? 'mono' : ''}`}>{v ?? '—'}</b></div>; }
