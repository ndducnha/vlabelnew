import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles, GitBranch, Tag, FileText, Check, ChevronLeft, ArrowRight, Loader2, Search, Package,
  Building2, Plus, ClipboardEdit, Eye, Send, ArrowUp, ArrowDown, ExternalLink, RotateCcw, CalendarClock, ListChecks,
} from '../lib/icons';
import { api, apiError } from '../lib/api';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import { Spinner, ProgressBar, Row } from '../components/ui';
import { F, NewFlow, AddEvent, CloneElabel, MiniRTE, renderVars } from './Helper.parts';
import { APPENDIX_GROUPS, appendixGroupByCode } from '@vlabel/shared';

const RISK = ['Chưa xác định', 'Cao', 'Trung bình', 'Thấp'];
const LS_KEY = 'vlabel.helper.v1';

type Mode = 'trace' | 'elabel' | 'supp';

interface Draft {
  mode: Mode | null;
  step: number;
  product: { id: string; name: string; gtin: string; traceMode?: string } | null;
  flowId: string;
  eventIds: string[];
  scopeType: 'gtin' | 'lot' | 'mfg' | 'serial';
  lot: string; mfgDate: string; serial: string;
  assigneeId: string; deadline: string; note: string;
  el: any; elLoaded: boolean;
  sp: { name: string; scope: string; batchCode: string; mfgDate: string; serial: string; contentHtml: string };
}

const INIT: Draft = {
  mode: null, step: 0, product: null, flowId: '', eventIds: [],
  scopeType: 'lot', lot: '', mfgDate: '', serial: '', assigneeId: '', deadline: '', note: '',
  el: { name: '', brand: '', description: '', countryOfOrigin: '', hsCode: '', targetMarket: '', supplier: '', riskLevel: 0, netContent: '', ingredients: '', usageInstructions: '', storageInstructions: '', safetyWarnings: '', appendixGroup: '', appendixAttributes: {}, owner: { name: '', tax_code: '', address: '', representative: '' }, attributes: [], images: [], certificates: [] },
  elLoaded: false,
  sp: { name: 'Nhãn phụ tiếng Việt', scope: 'ALL', batchCode: '', mfgDate: '', serial: '', contentHtml: '' },
};

const STEPS: Record<Mode, string[]> = {
  trace: ['Chọn sản phẩm', 'Luồng truy xuất', 'Thiết lập sự kiện', 'Phạm vi áp dụng', 'Phân công khai báo', 'Xác nhận'],
  elabel: ['Chọn sản phẩm', 'Loại nhãn', 'Tên & nhãn hiệu', 'Doanh nghiệp', 'Thành phần & định lượng', 'Công dụng & bảo quản', 'Cảnh báo & rủi ro', 'Xuất xứ & nhóm hàng', 'Phạm vi áp dụng', 'Giao diện & xem trước', 'Xác nhận & phát hành'],
  supp: ['Chọn sản phẩm', 'Phạm vi áp dụng', 'Soạn nội dung', 'Xem trước', 'Lưu & phát hành'],
};

const loadDraft = (): Draft | null => { try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; } };

export default function Helper() {
  const nav = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [draft, setDraft] = useState<Draft>(() => loadDraft() ?? INIT);
  const [done, setDone] = useState<Mode | null>(null);
  const [busy, setBusy] = useState(false);
  // Trạng thái phụ cho việc tạo sản phẩm mới
  const [creating, setCreating] = useState(false);
  const [vnpcQ, setVnpcQ] = useState('');
  const [picked, setPicked] = useState<any>(null);
  const [newOrgId, setNewOrgId] = useState('');
  const [gtinManual, setGtinManual] = useState('');
  const [productQ, setProductQ] = useState('');
  const [userQ, setUserQ] = useState('');

  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(draft)); }, [draft]);
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const patchEl = (p: any) => setDraft((d) => ({ ...d, el: { ...d.el, ...p } }));
  const patchSp = (p: any) => setDraft((d) => ({ ...d, sp: { ...d.sp, ...p } }));

  const { mode, step, product } = draft;

  const products = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products').then((r) => r.data) });
  const orgs = useQuery({ queryKey: ['orgs'], queryFn: () => api.get('/organizations').then((r) => r.data) });
  const flowsAll = useQuery({ queryKey: ['flows-all'], queryFn: () => api.get('/flows').then((r) => r.data) });
  const branchUsers = useQuery({ queryKey: ['users-branch'], queryFn: () => api.get('/users/branch').then((r) => r.data), enabled: mode === 'trace' });
  const productDetail = useQuery({ queryKey: ['product', product?.id], enabled: !!product?.id, queryFn: () => api.get(`/products/${product!.id}`).then((r) => r.data) });
  const flowDetail = useQuery({ queryKey: ['flow', draft.flowId], enabled: !!draft.flowId, queryFn: () => api.get(`/flows/${draft.flowId}`).then((r) => r.data) });
  const vnpc = useQuery({ queryKey: ['vnpc', vnpcQ], enabled: creating, queryFn: () => api.get('/integrations/vnpc/products', { params: { q: vnpcQ } }).then((r) => r.data) });
  const elabelDetail = useQuery({ queryKey: ['elabel', product?.id], enabled: mode === 'elabel' && !!product?.id, queryFn: () => api.get(`/elabels/${product!.id}`).then((r) => r.data) });

  // Nạp dữ liệu nhãn điện tử từ server một lần khi chọn sản phẩm (autosave & tiếp tục sau)
  useEffect(() => {
    if (mode === 'elabel' && elabelDetail.data && !draft.elLoaded) {
      const d = elabelDetail.data; const o = d.ownerInfo ?? {};
      patch({
        elLoaded: true,
        el: {
          name: d.name ?? '', brand: d.brand ?? '', description: d.description ?? '', countryOfOrigin: d.countryOfOrigin ?? '',
          hsCode: d.hsCode ?? '', targetMarket: d.targetMarket ?? '', supplier: d.supplier ?? '', riskLevel: d.riskLevel ?? 0,
          netContent: d.netContent ?? '', ingredients: d.ingredients ?? '', usageInstructions: d.usageInstructions ?? '',
          storageInstructions: d.storageInstructions ?? '', safetyWarnings: d.safetyWarnings ?? '',
          appendixGroup: d.appendixGroup ?? '', appendixAttributes: (d.appendixAttributes && typeof d.appendixAttributes === 'object') ? d.appendixAttributes : {},
          owner: { name: o.name ?? '', tax_code: o.tax_code ?? '', address: o.address ?? '', representative: o.representative ?? '' },
          attributes: Array.isArray(d.labelAttributes) ? d.labelAttributes : [],
          images: Array.isArray(d.labelImages) ? d.labelImages : [],
          certificates: Array.isArray(d.certificates) ? d.certificates : [],
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, elabelDetail.data]);

  const version = flowDetail.data?.versions?.[0];
  const events: any[] = useMemo(() => (version?.eventDefinitions ?? []).slice().sort((a: any, b: any) => a.order - b.order), [version]);
  // Mặc định chọn tất cả công đoạn khi flow được nạp
  useEffect(() => {
    if (mode === 'trace' && events.length && draft.eventIds.length === 0) patch({ eventIds: events.map((e) => e.id) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length]);

  const productFlows = (productDetail.data?.flows ?? []).map((x: any) => x.flow);
  const total = mode ? STEPS[mode].length : 0;
  const title = mode ? STEPS[mode][step] : 'Trợ lý VLabel';

  const selectProduct = (p: any) => { patch({ product: { id: p.id, name: p.name, gtin: p.gtin, traceMode: p.traceMode }, flowId: '', eventIds: [], elLoaded: false }); setCreating(false); };

  const resolveGtin = async () => {
    const g = gtinManual.trim(); if (!g) return;
    try { const { data } = await api.get('/products/by-gtin', { params: { gtin: g } }); selectProduct(data); toast(`Đã chọn ${data.name}`); }
    catch { toast('Không tìm thấy sản phẩm với GTIN này. Hãy khai báo sản phẩm mới.', false); setCreating(true); }
  };

  const createProduct = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/products', { gtin: picked.gtin, name: picked.name, organizationId: newOrgId, description: picked.description ?? '', dynamicAttributes: picked.attributes ?? {} });
      return data;
    },
    onSuccess: (p) => { toast('🎉 Đã tạo sản phẩm'); qc.invalidateQueries({ queryKey: ['products'] }); selectProduct(p); setPicked(null); },
    onError: (e) => toast(apiError(e), false),
  });

  // ── Điều hướng bước ──
  const goBack = () => { if (step === 0) { patch({ mode: null }); } else patch({ step: step - 1 }); };

  const saveElabel = async () => {
    if (!product) return;
    const el = draft.el;
    await api.patch(`/elabels/${product.id}`, {
      name: el.name, brand: el.brand, description: el.description, countryOfOrigin: el.countryOfOrigin, hsCode: el.hsCode,
      targetMarket: el.targetMarket, supplier: el.supplier, riskLevel: Number(el.riskLevel || 0), netContent: el.netContent,
      ingredients: el.ingredients, usageInstructions: el.usageInstructions, storageInstructions: el.storageInstructions,
      safetyWarnings: el.safetyWarnings, appendixGroup: el.appendixGroup || null, appendixAttributes: el.appendixAttributes || {},
      ownerInfo: el.owner || {}, labelAttributes: el.attributes || [], labelImages: el.images || [], certificates: el.certificates || [],
    });
  };

  const attachFlow = async () => {
    if (!product || !draft.flowId) return;
    const has = productFlows.some((f: any) => f.id === draft.flowId);
    if (!has) { await api.put(`/products/${product.id}/flows`, { flowIds: [draft.flowId] }); qc.invalidateQueries({ queryKey: ['product', product.id] }); }
  };

  const goNext = async () => {
    if (!mode) return;
    setBusy(true);
    try {
      if (mode === 'trace' && step === 1) await attachFlow();
      if (mode === 'elabel' && step >= 2 && step <= 8) await saveElabel();
      patch({ step: step + 1 });
    } catch (e) { toast(apiError(e), false); }
    finally { setBusy(false); }
  };

  // ── Hoàn tất ──
  const finishTrace = useMutation({
    mutationFn: async () => {
      const startISO = new Date().toISOString();
      const endISO = draft.deadline ? new Date(draft.deadline).toISOString() : new Date(Date.now() + 14 * 864e5).toISOString();
      const names = events.filter((e) => draft.eventIds.includes(e.id)).map((e) => e.name).join(', ');
      await api.post('/trace-tasks', {
        name: `Kê khai ${product!.name}`, productId: product!.id, lot: draft.lot || undefined,
        flowId: draft.flowId || undefined, assignedUserId: draft.assigneeId,
        startDate: startISO, endDate: endISO, note: [draft.note, names && `Sự kiện: ${names}`].filter(Boolean).join(' · ') || undefined,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trace-tasks'] }); finishAll('trace'); },
    onError: (e) => toast(apiError(e), false),
  });

  const finishElabel = useMutation({
    mutationFn: async () => {
      await saveElabel();
      if (draft.scopeType === 'lot' && draft.lot) { try { await api.post(`/elabels/${product!.id}/batches`, { batchCode: draft.lot, manufacturingDate: draft.mfgDate || undefined, status: 'published' }); } catch { /* lô có thể đã tồn tại */ } }
      await api.post(`/elabels/${product!.id}/status`, { status: 'published' });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['elabels'] }); finishAll('elabel'); },
    onError: (e) => toast(apiError(e), false),
  });

  const saveElabelDraft = useMutation({ mutationFn: saveElabel, onSuccess: () => { qc.invalidateQueries({ queryKey: ['elabels'] }); toast('Đã lưu nháp nhãn'); }, onError: (e) => toast(apiError(e), false) });

  const finishSupp = useMutation({
    mutationFn: async (publish: boolean) => {
      const sp = draft.sp;
      const payload = { productId: product!.id, name: sp.name, scope: sp.scope, batchCode: sp.batchCode || undefined, manufacturingDate: sp.mfgDate || undefined, serial: sp.serial || undefined, contentHtml: sp.contentHtml, labelSize: '80x50', orientation: 'portrait' };
      const { data } = await api.post('/supplementary-labels', payload);
      if (publish) await api.post(`/supplementary-labels/${data.id}/status`, { status: 'published' });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supp'] }); finishAll('supp'); },
    onError: (e) => toast(apiError(e), false),
  });

  const finishAll = (m: Mode) => { setDone(m); localStorage.removeItem(LS_KEY); };
  const resetAll = () => { setDraft(INIT); setDone(null); setCreating(false); setPicked(null); setGtinManual(''); };

  // ── Validation từng bước ──
  const stripLen = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length;
  const canNext = (() => {
    if (!mode) return false;
    if (step === 0) return !!product;
    if (mode === 'trace') {
      if (step === 1) return !!draft.flowId;
      if (step === 2) return events.length > 0;
      if (step === 4) return !!draft.assigneeId;
      return true;
    }
    if (mode === 'elabel') {
      if (step === 2) return !!draft.el.name?.trim();
      return true;
    }
    if (mode === 'supp') {
      if (step === 1) return draft.sp.scope !== 'BATCH' || !!draft.sp.batchCode.trim();
      if (step === 2) return stripLen(draft.sp.contentHtml) > 0;
      return true;
    }
    return true;
  })();

  const isFinishStep = mode && step === total - 1;

  // ════════ COMPLETION ════════
  if (done) {
    const gtin = product?.gtin;
    return (
      <div className="max-w-[480px] mx-auto pb-6">
        <div className="min-h-[46vh] grid place-items-center text-center px-4">
          <div>
            <div className="w-20 h-20 rounded-3xl grid place-items-center mx-auto mb-4 pop" style={{ background: 'var(--good-soft)', color: 'var(--good)' }}><Check size={40} /></div>
            <h2 className="text-2xl font-extrabold">{done === 'trace' ? 'Đã thiết lập truy xuất' : done === 'elabel' ? 'Đã phát hành nhãn điện tử' : 'Đã phát hành nhãn phụ'}</h2>
            <p className="text-[var(--muted)] mt-1.5">{product?.name} · <span className="mono">{gtin}</span></p>
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {done === 'trace' && <button className="btn btn-lg" onClick={() => nav('/tasks')}><ListChecks size={18} />Xem trạng thái khai báo</button>}
          {gtin && <a className="btn btn-lg" href={`/t/${gtin}`} target="_blank" rel="noreferrer"><Eye size={18} />Xem trang QR công khai</a>}
          <button className="btn btn-primary btn-lg" onClick={resetAll}><Sparkles size={18} />Thiết lập mục khác</button>
        </div>
      </div>
    );
  }

  // ════════ START ════════
  if (!mode) {
    const OPTS: { m: Mode; icon: any; label: string; desc: string }[] = [
      { m: 'trace', icon: GitBranch, label: 'Truy xuất nguồn gốc', desc: 'Gán Luồng, sự kiện, lô và phân công khai báo.' },
      { m: 'elabel', icon: Tag, label: 'Nhãn điện tử', desc: 'Soạn nội dung nhãn theo từng bước và phát hành.' },
      { m: 'supp', icon: FileText, label: 'Nhãn phụ', desc: 'Soạn nhãn phụ tiếng Việt hiển thị trên cùng mã QR.' },
    ];
    return (
      <div className="max-w-[480px] mx-auto pb-6">
        <div className="text-center mb-6 mt-2">
          <div className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Sparkles size={26} /></div>
          <h1 className="text-[24px] font-extrabold tracking-tight">Trợ lý VLabel</h1>
          <p className="text-[var(--muted)] mt-1 text-[14px]">Bạn muốn thực hiện chức năng nào?</p>
        </div>
        <div className="flex flex-col gap-3">
          {OPTS.map((o) => (
            <button key={o.m} className="opt anim-in" style={{ minHeight: 78 }} onClick={() => { patch({ mode: o.m, step: 0 }); }}>
              <span className="w-12 h-12 rounded-2xl grid place-items-center flex-none" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><o.icon size={22} /></span>
              <div className="flex-1 text-left"><b className="text-[15px] block">{o.label}</b><span className="text-[12.5px] text-[var(--muted)] leading-snug">{o.desc}</span></div>
              <ArrowRight size={18} className="text-[var(--faint)] flex-none" />
            </button>
          ))}
        </div>
        {loadDraft() && loadDraft()?.mode && (
          <button className="btn btn-sm mt-5 mx-auto" onClick={() => { const d = loadDraft(); if (d) setDraft(d); }}><RotateCcw size={14} />Tiếp tục thiết lập đang dở</button>
        )}
      </div>
    );
  }

  const shownProducts = (products.data ?? []).filter((p: any) => !productQ || p.name.toLowerCase().includes(productQ.toLowerCase()) || (p.gtin ?? '').includes(productQ));
  const shownUsers = (branchUsers.data ?? []).filter((u: any) => !userQ || u.fullName.toLowerCase().includes(userQ.toLowerCase()) || (u.email ?? '').toLowerCase().includes(userQ.toLowerCase()));

  return (
    <div className="max-w-[480px] mx-auto pb-4">
      {/* App bar */}
      <div className="flex items-center gap-2 mb-3">
        <button className="btn btn-ghost btn-sm" onClick={goBack}><ChevronLeft size={20} /></button>
        <div className="flex-1 text-center">
          <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--faint)]">Bước {step + 1} / {total}</div>
          <div className="text-[13px] font-semibold">{mode === 'trace' ? 'Truy xuất nguồn gốc' : mode === 'elabel' ? 'Nhãn điện tử' : 'Nhãn phụ'}</div>
        </div>
        <div className="w-9" />
      </div>
      <div className="mb-5"><ProgressBar value={((step + 1) / total) * 100} /></div>

      <div key={`${mode}-${step}`} className="anim-in">
        <h2 className="text-[22px] font-extrabold tracking-tight mb-1" style={{ textWrap: 'balance' } as any}>{title}</h2>
        {product && step > 0 && <p className="text-[13px] text-[var(--muted)] mb-4">{product.name} · <span className="mono">{product.gtin}</span>{draft.lot ? ` · Lô ${draft.lot}` : ''}</p>}
        <div className="mt-1">{renderStep()}</div>
      </div>

      {/* Sticky CTA */}
      <div className="sticky bottom-3 mt-6 flex gap-2.5" style={{ zIndex: 5 }}>
        <button className="btn" style={{ minHeight: 52 }} onClick={goBack}><ChevronLeft size={18} />{step === 0 ? 'Đổi mục' : 'Trước'}</button>
        {mode === 'elabel' && step >= 2 && step <= 9 && (
          <button className="btn" style={{ minHeight: 52 }} disabled={saveElabelDraft.isPending} onClick={() => saveElabelDraft.mutate()}>{saveElabelDraft.isPending ? <Loader2 size={16} className="animate-spin" /> : null}Lưu nháp</button>
        )}
        {!isFinishStep ? (
          <button className="btn btn-primary btn-lg" disabled={!canNext || busy} onClick={goNext}>{busy ? <Loader2 size={18} className="animate-spin" /> : null}Tiếp tục <ArrowRight size={18} /></button>
        ) : renderFinishButton()}
      </div>
    </div>
  );

  function renderFinishButton() {
    if (mode === 'trace') return <button className="btn btn-primary btn-lg" disabled={!draft.assigneeId || finishTrace.isPending} onClick={() => finishTrace.mutate()}>{finishTrace.isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Hoàn tất thiết lập</button>;
    if (mode === 'elabel') return <button className="btn btn-primary btn-lg" disabled={finishElabel.isPending} onClick={() => finishElabel.mutate()}>{finishElabel.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Phát hành nhãn</button>;
    return (
      <div className="flex gap-2.5 flex-1">
        <button className="btn btn-lg" disabled={finishSupp.isPending} onClick={() => finishSupp.mutate(false)}>Lưu nháp</button>
        <button className="btn btn-primary btn-lg" disabled={finishSupp.isPending} onClick={() => finishSupp.mutate(true)}>{finishSupp.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Phát hành</button>
      </div>
    );
  }

  function renderStep() {
    if (step === 0) return renderProductPicker();
    if (mode === 'trace') return renderTrace();
    if (mode === 'elabel') return renderElabel();
    return renderSupp();
  }

  // ────────── STEP 0: CHỌN SẢN PHẨM (dùng chung) ──────────
  function renderProductPicker() {
    if (creating) return (
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-[var(--muted)]">Chọn GTIN từ VNPC rồi chọn đơn vị sở hữu. Sản phẩm sẽ được tạo và tự chọn để tiếp tục.</p>
        <div className="flex items-center gap-2 rounded-full px-4 py-2.5" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
          <Search size={16} className="text-[var(--muted)]" />
          <input className="flex-1 bg-transparent outline-none text-sm" placeholder="Tìm GTIN / tên trên VNPC…" value={vnpcQ} onChange={(e) => setVnpcQ(e.target.value)} />
        </div>
        {vnpc.isFetching ? <Spinner /> : (
          <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: 220 }}>
            {(vnpc.data?.items ?? []).map((p: any) => (
              <button key={p.gtin} onClick={() => setPicked(p)} className={`opt ${picked?.gtin === p.gtin ? 'sel' : ''}`}>
                <span className="w-9 h-9 rounded-xl grid place-items-center flex-none" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Package size={17} /></span>
                <div className="flex-1 min-w-0"><b className="text-sm block truncate">{p.name}</b><div className="text-xs text-[var(--muted)] truncate">{p.company} · <span className="mono">{p.gtin}</span></div></div>
                {picked?.gtin === p.gtin && <Check size={17} className="text-[var(--accent)] flex-none" />}
              </button>
            ))}
            {(vnpc.data?.items ?? []).length === 0 && <p className="text-sm text-[var(--muted)] py-2">Gõ để tìm GTIN.</p>}
          </div>
        )}
        {picked && (
          <label className="block"><span className="label">Đơn vị sở hữu</span>
            <select className="input" value={newOrgId} onChange={(e) => setNewOrgId(e.target.value)}>
              <option value="">— chọn đơn vị —</option>
              {(orgs.data ?? []).map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
        )}
        <div className="flex gap-2">
          <button className="btn flex-1 justify-center" onClick={() => { setCreating(false); setPicked(null); }}>Huỷ</button>
          <button className="btn btn-primary flex-1 justify-center" disabled={!picked || !newOrgId || createProduct.isPending} onClick={() => createProduct.mutate()}>{createProduct.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}Tạo & chọn</button>
        </div>
      </div>
    );

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-full px-4 py-2.5" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
          <Search size={16} className="text-[var(--muted)]" />
          <input className="flex-1 bg-transparent outline-none text-sm" placeholder="Tìm sản phẩm theo tên / GTIN…" value={productQ} onChange={(e) => setProductQ(e.target.value)} />
        </div>
        {products.isLoading ? <Spinner /> : (
          <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: 300 }}>
            {shownProducts.map((p: any) => (
              <button key={p.id} onClick={() => selectProduct(p)} className={`opt ${product?.id === p.id ? 'sel' : ''}`}>
                <span className="w-9 h-9 rounded-xl grid place-items-center flex-none" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Package size={17} /></span>
                <div className="flex-1 min-w-0"><b className="text-sm block truncate">{p.name}</b><div className="text-xs text-[var(--muted)] mono">{p.gtin} · {(p.flows ?? []).length} luồng</div></div>
                {product?.id === p.id && <Check size={18} className="text-[var(--accent)] flex-none" />}
              </button>
            ))}
            {shownProducts.length === 0 && <p className="text-sm text-[var(--muted)] py-2">Không tìm thấy sản phẩm.</p>}
          </div>
        )}
        <div className="card p-3.5 flex flex-col gap-2.5">
          <span className="label" style={{ margin: 0 }}>Hoặc nhập GTIN thủ công</span>
          <div className="flex gap-2">
            <input className="input mono flex-1" placeholder="GTIN…" value={gtinManual} onChange={(e) => setGtinManual(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); resolveGtin(); } }} />
            <button className="btn" disabled={!gtinManual.trim()} onClick={resolveGtin}>Tra cứu</button>
          </div>
          <button className="btn btn-sm self-start" onClick={() => { setCreating(true); setNewOrgId(''); }}><Plus size={14} />Khai báo sản phẩm mới</button>
        </div>
      </div>
    );
  }

  // ────────── TRACE ──────────
  function renderTrace() {
    if (step === 1) {
      const has = productFlows.length > 0;
      return (
        <div className="flex flex-col gap-3">
          {productDetail.isLoading ? <Spinner /> : has ? (
            <>
              <p className="text-[13px] text-[var(--muted)]">Sản phẩm đã có Luồng. Chọn Luồng để dùng (hoặc chọn Luồng khác bên dưới).</p>
              {productFlows.map((f: any) => (
                <button key={f.id} onClick={() => patch({ flowId: f.id, eventIds: [] })} className={`opt ${draft.flowId === f.id ? 'sel' : ''}`}>
                  <span className="w-9 h-9 rounded-xl grid place-items-center flex-none" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><GitBranch size={17} /></span>
                  <div className="flex-1"><b className="text-sm">{f.name}</b></div>
                  {draft.flowId === f.id && <Check size={18} className="text-[var(--accent)]" />}
                </button>
              ))}
            </>
          ) : <p className="text-[13px] text-[var(--muted)]">Sản phẩm chưa có Luồng. Chọn một Luồng có sẵn để gán:</p>}

          <div className="label mt-1" style={{ margin: 0 }}>Chọn từ danh sách Luồng</div>
          <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: 240 }}>
            {(flowsAll.data ?? []).map((f: any) => (
              <button key={f.id} onClick={() => patch({ flowId: f.id, eventIds: [] })} className={`opt ${draft.flowId === f.id ? 'sel' : ''}`}>
                <span className="w-9 h-9 rounded-xl grid place-items-center flex-none" style={{ background: 'var(--surface)', color: 'var(--muted)' }}><GitBranch size={17} /></span>
                <div className="flex-1 min-w-0"><b className="text-sm block truncate">{f.name}</b><div className="text-xs text-[var(--muted)]">{f.versions?.[0]?.eventDefinitions?.length ?? 0} sự kiện</div></div>
                {draft.flowId === f.id && <Check size={17} className="text-[var(--accent)] flex-none" />}
              </button>
            ))}
          </div>
          <NewFlow onCreated={(id) => patch({ flowId: id, eventIds: [] })} />
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="flex flex-col gap-2.5">
          <p className="text-[13px] text-[var(--muted)]">Chọn sự kiện áp dụng, sắp xếp thứ tự hoặc thêm mới. Cấu hình chi tiết từng sự kiện diễn ra khi kê khai.</p>
          {flowDetail.isLoading ? <Spinner /> : events.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Luồng chưa có sự kiện. Thêm sự kiện bên dưới.</p>
          ) : events.map((ev, i) => {
            const on = draft.eventIds.includes(ev.id);
            return (
              <div key={ev.id} className={`opt ${on ? 'sel' : ''}`} style={{ cursor: 'default' }}>
                <button className="w-7 h-7 rounded-lg grid place-items-center flex-none" style={{ background: on ? 'var(--accent)' : 'var(--surface)', color: on ? '#fff' : 'var(--muted)' }} onClick={() => patch({ eventIds: on ? draft.eventIds.filter((x) => x !== ev.id) : [...draft.eventIds, ev.id] })}>{on ? <Check size={15} /> : ev.order}</button>
                <div className="flex-1 min-w-0"><b className="text-sm block truncate">{ev.name}</b><div className="text-xs text-[var(--muted)]">{(ev.fields?.length ?? 0)} trường</div></div>
                <div className="flex gap-1 flex-none">
                  <button className="btn btn-sm" disabled={i === 0} onClick={() => swapEvent(i, i - 1)}><ArrowUp size={13} /></button>
                  <button className="btn btn-sm" disabled={i === events.length - 1} onClick={() => swapEvent(i, i + 1)}><ArrowDown size={13} /></button>
                </div>
              </div>
            );
          })}
          <AddEvent versionId={version?.id} onAdded={() => flowDetail.refetch()} />
        </div>
      );
    }

    if (step === 3) return (
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-[var(--muted)]">Dữ liệu truy xuất áp dụng theo:</p>
        {([['lot', 'Lô sản phẩm'], ['mfg', 'Ngày sản xuất'], ['gtin', 'GTIN chung'], ['serial', 'Serial / mã định danh']] as const).map(([v, l]) => (
          <button key={v} className={`opt ${draft.scopeType === v ? 'sel' : ''}`} onClick={() => patch({ scopeType: v })}>
            <span className="w-8 h-8 rounded-lg grid place-items-center flex-none" style={{ background: draft.scopeType === v ? 'var(--accent)' : 'var(--surface)', color: draft.scopeType === v ? '#fff' : 'var(--muted)' }}><Package size={15} /></span>
            <b className="text-sm flex-1">{l}</b>{draft.scopeType === v && <Check size={17} className="text-[var(--accent)]" />}
          </button>
        ))}
        {draft.scopeType === 'lot' && <label className="block"><span className="label">Số lô</span><input className="input mono" value={draft.lot} onChange={(e) => patch({ lot: e.target.value })} placeholder="VD: LOT-2408-01" /></label>}
        {draft.scopeType === 'mfg' && <label className="block"><span className="label">Ngày sản xuất</span><input className="input" type="date" value={draft.mfgDate} onChange={(e) => patch({ mfgDate: e.target.value })} /></label>}
        {draft.scopeType === 'serial' && <label className="block"><span className="label">Serial</span><input className="input mono" value={draft.serial} onChange={(e) => patch({ serial: e.target.value })} /></label>}
        {draft.scopeType === 'gtin' && <p className="text-[13px] text-[var(--muted)]">Áp dụng cho toàn bộ GTIN, không phân biệt lô.</p>}
      </div>
    );

    if (step === 4) return (
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-[var(--muted)]">Chọn người chịu trách nhiệm khai báo và thời hạn.</p>
        <div className="flex items-center gap-2 rounded-full px-4 py-2.5" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
          <Search size={16} className="text-[var(--muted)]" />
          <input className="flex-1 bg-transparent outline-none text-sm" placeholder="Tìm theo tên / email…" value={userQ} onChange={(e) => setUserQ(e.target.value)} />
        </div>
        {branchUsers.isLoading ? <Spinner /> : (
          <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: 240 }}>
            {shownUsers.map((u: any) => (
              <button key={u.id} onClick={() => patch({ assigneeId: u.id })} className={`opt ${draft.assigneeId === u.id ? 'sel' : ''}`}>
                <span className="serif w-9 h-9 rounded-full grid place-items-center text-sm font-bold flex-none" style={{ color: 'var(--accent-contrast)', background: 'linear-gradient(135deg,var(--accent),var(--accent-2))' }}>{u.fullName?.split(' ').slice(-1)[0]?.[0] ?? '?'}</span>
                <div className="flex-1 min-w-0"><b className="text-sm block truncate">{u.fullName}</b><div className="text-xs text-[var(--muted)] truncate">{u.email}{u.organization?.name ? ` · ${u.organization.name}` : ''}</div></div>
                {draft.assigneeId === u.id && <Check size={17} className="text-[var(--accent)] flex-none" />}
              </button>
            ))}
            {shownUsers.length === 0 && <p className="text-sm text-[var(--muted)] py-2">Không có người dùng phù hợp.</p>}
          </div>
        )}
        <label className="block"><span className="label">Thời hạn khai báo</span><input className="input" type="date" value={draft.deadline} onChange={(e) => patch({ deadline: e.target.value })} /></label>
        <label className="block"><span className="label">Ghi chú (tuỳ chọn)</span><textarea className="input min-h-[64px]" value={draft.note} onChange={(e) => patch({ note: e.target.value })} placeholder="Nhắc việc cho người được giao…" /></label>
      </div>
    );

    // step 5: confirm
    const flow = (flowsAll.data ?? []).find((f: any) => f.id === draft.flowId) ?? productFlows.find((f: any) => f.id === draft.flowId);
    const assignee = (branchUsers.data ?? []).find((u: any) => u.id === draft.assigneeId);
    const scopeLabel = draft.scopeType === 'lot' ? `Lô ${draft.lot || '—'}` : draft.scopeType === 'mfg' ? `Ngày SX ${draft.mfgDate || '—'}` : draft.scopeType === 'serial' ? `Serial ${draft.serial || '—'}` : 'GTIN chung';
    return (
      <div className="card p-4 flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
        <Row k="Sản phẩm" v={product?.name} />
        <Row k="GTIN" v={product?.gtin} mono />
        <Row k="Luồng" v={flow?.name} />
        <Row k="Sự kiện" v={`${draft.eventIds.length}/${events.length} sự kiện`} />
        <Row k="Phạm vi" v={scopeLabel} />
        <Row k="Người phụ trách" v={assignee?.fullName} />
        <Row k="Thời hạn" v={draft.deadline || 'Mặc định +14 ngày'} />
      </div>
    );
  }

  async function swapEvent(i: number, j: number) {
    const a = events[i], b = events[j];
    if (!a || !b) return;
    try { await Promise.all([api.patch(`/event-definitions/${a.id}`, { order: b.order }), api.patch(`/event-definitions/${b.id}`, { order: a.order })]); flowDetail.refetch(); }
    catch (e) { toast(apiError(e), false); }
  }

  // ────────── ELABEL ──────────
  function renderElabel() {
    const el = draft.el;
    if (step === 1) {
      const published = elabelDetail.data?.elabelStatus === 'published';
      return (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-[var(--muted)]">Nhãn điện tử gắn trực tiếp với sản phẩm. Chọn cách bắt đầu:</p>
          <button className="opt sel" onClick={() => patch({ step: step + 1 })} style={{ minHeight: 68 }}>
            <span className="w-10 h-10 rounded-xl grid place-items-center flex-none" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><ClipboardEdit size={18} /></span>
            <div className="flex-1 text-left"><b className="text-sm block">{published ? 'Chỉnh sửa nhãn hiện có' : 'Soạn nhãn cho sản phẩm này'}</b><span className="text-xs text-[var(--muted)]">Điền nội dung theo từng bước ngắn.</span></div>
          </button>
          <CloneElabel currentId={product?.id} onCloned={() => { patch({ elLoaded: false }); elabelDetail.refetch(); toast('Đã sao chép nội dung nhãn mẫu'); }} />
        </div>
      );
    }
    if (step === 2) return (
      <div className="flex flex-col gap-3.5">
        <F label="Tên sản phẩm *"><input className="input" value={el.name} onChange={(e) => patchEl({ name: e.target.value })} /></F>
        <F label="Nhãn hiệu"><input className="input" value={el.brand} onChange={(e) => patchEl({ brand: e.target.value })} /></F>
        <F label="Mô tả ngắn"><textarea className="input min-h-[70px]" value={el.description} onChange={(e) => patchEl({ description: e.target.value })} /></F>
      </div>
    );
    if (step === 3) return (
      <div className="flex flex-col gap-3.5">
        <F label="Tên doanh nghiệp"><input className="input" value={el.owner.name} onChange={(e) => patchEl({ owner: { ...el.owner, name: e.target.value } })} /></F>
        <F label="Mã số thuế"><input className="input mono" value={el.owner.tax_code} onChange={(e) => patchEl({ owner: { ...el.owner, tax_code: e.target.value } })} /></F>
        <F label="Địa chỉ"><input className="input" value={el.owner.address} onChange={(e) => patchEl({ owner: { ...el.owner, address: e.target.value } })} /></F>
        <F label="Người đại diện"><input className="input" value={el.owner.representative} onChange={(e) => patchEl({ owner: { ...el.owner, representative: e.target.value } })} /></F>
      </div>
    );
    if (step === 4) return (
      <div className="flex flex-col gap-3.5">
        <F label="Thành phần / cấu tạo"><textarea className="input min-h-[80px]" value={el.ingredients} onChange={(e) => patchEl({ ingredients: e.target.value })} /></F>
        <F label="Định lượng (khối lượng / thể tích / số lượng)"><input className="input" value={el.netContent} onChange={(e) => patchEl({ netContent: e.target.value })} placeholder="VD: 50ml · 20 viên · 5kg" /></F>
      </div>
    );
    if (step === 5) return (
      <div className="flex flex-col gap-3.5">
        <F label="Hướng dẫn sử dụng"><textarea className="input min-h-[80px]" value={el.usageInstructions} onChange={(e) => patchEl({ usageInstructions: e.target.value })} /></F>
        <F label="Hướng dẫn bảo quản"><textarea className="input min-h-[80px]" value={el.storageInstructions} onChange={(e) => patchEl({ storageInstructions: e.target.value })} /></F>
      </div>
    );
    if (step === 6) return (
      <div className="flex flex-col gap-3.5">
        <F label="Cảnh báo an toàn"><textarea className="input min-h-[80px]" value={el.safetyWarnings} onChange={(e) => patchEl({ safetyWarnings: e.target.value })} placeholder="Bắt buộc với hàng rủi ro cao / trung bình" /></F>
        <F label="Mức rủi ro"><select className="input" value={el.riskLevel} onChange={(e) => patchEl({ riskLevel: Number(e.target.value) })}>{RISK.map((r, i) => <option key={i} value={i}>{r}</option>)}</select></F>
      </div>
    );
    if (step === 7) {
      const grp = appendixGroupByCode(el.appendixGroup);
      return (
        <div className="flex flex-col gap-3.5">
          <F label="Xuất xứ"><input className="input" value={el.countryOfOrigin} onChange={(e) => patchEl({ countryOfOrigin: e.target.value })} /></F>
          <F label="Nhóm hàng hóa (Phụ lục I NĐ 37)">
            <select className="input" value={el.appendixGroup} onChange={(e) => patchEl({ appendixGroup: e.target.value })}>
              <option value="">— chọn nhóm hàng hóa —</option>
              {APPENDIX_GROUPS.map((g) => <option key={g.code} value={g.code}>{g.name}</option>)}
            </select>
          </F>
          {grp && grp.fields.map((fl: any) => (
            <F key={fl.key} label={`${fl.label}${fl.required ? ' *' : ''}`}>
              <input className="input" value={el.appendixAttributes?.[fl.key] ?? ''} onChange={(e) => patchEl({ appendixAttributes: { ...el.appendixAttributes, [fl.key]: e.target.value } })} />
            </F>
          ))}
        </div>
      );
    }
    if (step === 8) return (
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-[var(--muted)]">Nhãn điện tử áp dụng cho:</p>
        {([['gtin', 'GTIN chung (mọi lô)'], ['lot', 'Theo lô sản phẩm'], ['mfg', 'Theo ngày sản xuất'], ['serial', 'Theo serial']] as const).map(([v, l]) => (
          <button key={v} className={`opt ${draft.scopeType === v ? 'sel' : ''}`} onClick={() => patch({ scopeType: v })}>
            <span className="w-8 h-8 rounded-lg grid place-items-center flex-none" style={{ background: draft.scopeType === v ? 'var(--accent)' : 'var(--surface)', color: draft.scopeType === v ? '#fff' : 'var(--muted)' }}><Tag size={15} /></span>
            <b className="text-sm flex-1">{l}</b>{draft.scopeType === v && <Check size={17} className="text-[var(--accent)]" />}
          </button>
        ))}
        {draft.scopeType === 'lot' && <label className="block"><span className="label">Số lô</span><input className="input mono" value={draft.lot} onChange={(e) => patch({ lot: e.target.value })} placeholder="VD: LOT-2408-01" /></label>}
        {draft.scopeType === 'mfg' && <label className="block"><span className="label">Ngày sản xuất</span><input className="input" type="date" value={draft.mfgDate} onChange={(e) => patch({ mfgDate: e.target.value })} /></label>}
      </div>
    );
    if (step === 9) return (
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-[var(--muted)]">Nhãn dùng giao diện chuẩn Vlabel (mobile-first, tự đồng bộ nội dung đã nhập). Xem trước trang hiển thị:</p>
        <div className="card overflow-hidden" style={{ height: 420 }}>
          {product && <iframe title="preview" src={`/t/${product.gtin}`} style={{ width: '100%', height: '100%', border: 'none' }} />}
        </div>
        {product && <a className="btn" href={`/t/${product.gtin}`} target="_blank" rel="noreferrer"><ExternalLink size={15} />Mở trang QR trong tab mới</a>}
      </div>
    );
    // step 10: confirm & publish
    const scopeLabel = draft.scopeType === 'lot' ? `Lô ${draft.lot || '—'}` : draft.scopeType === 'mfg' ? `Ngày SX ${draft.mfgDate || '—'}` : draft.scopeType === 'serial' ? `Serial ${draft.serial || '—'}` : 'GTIN chung';
    return (
      <div className="flex flex-col gap-3">
        <div className="card p-4 flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
          <Row k="Sản phẩm" v={el.name || product?.name} />
          <Row k="GTIN" v={product?.gtin} mono />
          <Row k="Nhãn hiệu" v={el.brand || '—'} />
          <Row k="Doanh nghiệp" v={el.owner.name || '—'} />
          <Row k="Định lượng" v={el.netContent || '—'} />
          <Row k="Nhóm hàng" v={appendixGroupByCode(el.appendixGroup)?.name || '—'} />
          <Row k="Phạm vi" v={scopeLabel} />
        </div>
        <p className="text-[12.5px] text-[var(--muted)]">Bấm "Phát hành nhãn" để lưu nội dung, gắn vào mã QR sản phẩm và công bố công khai.</p>
      </div>
    );
  }

  // ────────── SUPP ──────────
  function renderSupp() {
    const sp = draft.sp;
    if (step === 1) return (
      <div className="flex flex-col gap-3">
        <F label="Tên nhãn phụ"><input className="input" value={sp.name} onChange={(e) => patchSp({ name: e.target.value })} /></F>
        <p className="text-[13px] text-[var(--muted)]">Nhãn phụ áp dụng theo:</p>
        {([['ALL', 'Toàn bộ GTIN'], ['BATCH', 'Theo lô'], ['PRODUCTION', 'Theo ngày sản xuất'], ['ITEM', 'Theo serial']] as const).map(([v, l]) => (
          <button key={v} className={`opt ${sp.scope === v ? 'sel' : ''}`} onClick={() => patchSp({ scope: v })}>
            <span className="w-8 h-8 rounded-lg grid place-items-center flex-none" style={{ background: sp.scope === v ? 'var(--accent)' : 'var(--surface)', color: sp.scope === v ? '#fff' : 'var(--muted)' }}><FileText size={15} /></span>
            <b className="text-sm flex-1">{l}</b>{sp.scope === v && <Check size={17} className="text-[var(--accent)]" />}
          </button>
        ))}
        {sp.scope === 'BATCH' && <label className="block"><span className="label">Số lô *</span><input className="input mono" value={sp.batchCode} onChange={(e) => patchSp({ batchCode: e.target.value })} /></label>}
        {sp.scope === 'PRODUCTION' && <label className="block"><span className="label">Ngày sản xuất</span><input className="input" type="date" value={sp.mfgDate} onChange={(e) => patchSp({ mfgDate: e.target.value })} /></label>}
        {sp.scope === 'ITEM' && <label className="block"><span className="label">Serial</span><input className="input mono" value={sp.serial} onChange={(e) => patchSp({ serial: e.target.value })} /></label>}
      </div>
    );
    if (step === 2) return (
      <div className="flex flex-col gap-2">
        <p className="text-[13px] text-[var(--muted)]">Soạn nội dung hiển thị khi quét QR. Có thể chèn mẫu web rồi chỉnh.</p>
        <MiniRTE value={sp.contentHtml} onChange={(v) => patchSp({ contentHtml: v })} />
      </div>
    );
    if (step === 3) return (
      <div className="card p-4 np-content" style={{ lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: renderVars(sp.contentHtml, product) }} />
    );
    // step 4
    return (
      <div className="flex flex-col gap-3">
        <div className="card p-4 flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
          <Row k="Sản phẩm" v={product?.name} />
          <Row k="GTIN" v={product?.gtin} mono />
          <Row k="Tên nhãn" v={sp.name} />
          <Row k="Phạm vi" v={sp.scope === 'BATCH' ? `Lô ${sp.batchCode}` : sp.scope === 'PRODUCTION' ? `Ngày SX ${sp.mfgDate}` : sp.scope === 'ITEM' ? `Serial ${sp.serial}` : 'Toàn bộ GTIN'} />
        </div>
        <p className="text-[12.5px] text-[var(--muted)]">Nhãn phụ hiển thị trên cùng mã QR của sản phẩm. Chọn "Lưu nháp" hoặc "Phát hành".</p>
      </div>
    );
  }
}
