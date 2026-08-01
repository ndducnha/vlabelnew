import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GitBranch, ArrowRight, ArrowUp, ArrowDown, Plus, Trash2, Eye, EyeOff, Rocket, User, MapPin, Clock, FileText, Image, Search, Copy, Pencil, Check, Building2, Layers } from '../lib/icons';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { useApiMutation } from '../lib/useApiMutation';
import { PageHead, Spinner, Drawer, EmptyState, SegmentedControl } from '../components/ui';
import { PERMISSIONS, FIELD_TYPES, ROLE_LABELS, ASSIGNABLE_ROLES } from '@vlabel/shared';
import type { Organization } from '@vlabel/shared';

// 5 yếu tố chuẩn GS1 EPCIS. How = media.
const EPCIS = [
  { key: 'who', label: 'Ai', en: 'Who', icon: User },
  { key: 'where', label: 'Ở đâu', en: 'Where', icon: MapPin },
  { key: 'when', label: 'Thời gian', en: 'When', icon: Clock },
  { key: 'what', label: 'Thông tin', en: 'What', icon: FileText },
  { key: 'how', label: 'Media', en: 'How', icon: Image },
];
function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick} className="w-11 h-6 rounded-full relative flex-none transition-colors disabled:opacity-60"
      style={{ background: on ? 'var(--accent)' : 'var(--border-strong)' }}>
      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all" style={{ left: on ? '22px' : '2px' }} />
    </button>
  );
}

export default function Flows() {
  const { can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const canManage = can(PERMISSIONS.FLOW_MANAGE);
  const invalidate = () => qc.invalidateQueries({ queryKey: ['flows'] });

  const [page, setPage] = useState(1);
  const [orgFilter, setOrgFilter] = useState('');
  const [flowQ, setFlowQ] = useState('');
  const flows = useQuery({
    queryKey: ['flows', 'manage', page, orgFilter, flowQ],
    queryFn: () => api.get('/flows', { params: { page, pageSize: 8, q: flowQ || undefined, organizationId: orgFilter || undefined } }).then((r) => r.data),
  });
  const orgs = useQuery<Organization[]>({ queryKey: ['orgs'], queryFn: () => api.get('/organizations').then((r) => r.data) });
  const [sel, setSel] = useState<any | null>(null);
  const [tab, setTab] = useState<'fields' | 'perm' | 'public'>('fields');
  const [newFlow, setNewFlow] = useState({ name: '', code: '' });
  const [editFlow, setEditFlow] = useState<any | null>(null);
  const [selCtx, setSelCtx] = useState<any | null>(null);

  const moveEvent = async (dir: number) => {
    const evs: any[] = selCtx?.events ?? [];
    const i = evs.findIndex((e) => e.id === sel?.id); const j = i + dir;
    if (i < 0 || j < 0 || j >= evs.length) return;
    const a = sel, b = evs[j];
    try {
      await Promise.all([api.patch(`/event-definitions/${a.id}`, { order: b.order }), api.patch(`/event-definitions/${b.id}`, { order: a.order })]);
      toast('Đã đổi thứ tự sự kiện'); invalidate();
      const ne = [...evs]; ne[i] = { ...a, order: b.order }; ne[j] = { ...b, order: a.order }; ne.sort((x, y) => x.order - y.order);
      setSel({ ...a, order: b.order }); setSelCtx({ events: ne });
    } catch (e) { toast(apiError(e), false); }
  };

  const mCreate = useApiMutation(() => api.post('/flows', newFlow), { successMessage: 'Đã tạo Flow', invalidate: [['flows']], onSuccess: () => setNewFlow({ name: '', code: '' }) });
  const mClone = useApiMutation((id: string) => api.post(`/flows/${id}/clone`), { successMessage: 'Đã nhân bản Flow', invalidate: [['flows']] });
  const mUpdateFlow = useApiMutation(({ id, body }: any) => api.patch(`/flows/${id}`, body), { successMessage: 'Đã lưu Flow', invalidate: [['flows']], onSuccess: () => setEditFlow(null) });
  const mDelete = useApiMutation((id: string) => api.delete(`/flows/${id}`).then((r) => r.data), { successMessage: (d: any) => (d?.productCount ? `Đã xoá Flow · đã gỡ khỏi ${d.productCount} sản phẩm` : 'Đã xoá Flow'), invalidate: [['flows'], ['products']] });
  const mPublish = useMutation({ mutationFn: (id: string) => api.post(`/flows/${id}/publish`), onSuccess: () => { toast('🎉 Đã xuất bản'); invalidate(); } });
  const mAddEvent = useApiMutation(({ versionId, name, code }: any) => api.post(`/flow-versions/${versionId}/events`, { name, code, enterRoleKeys: ['DATA_ENTRY', 'MANAGER'], approveRoleKeys: ['MANAGER', 'ADMIN', 'SUPERADMIN'] }), { successMessage: 'Đã thêm sự kiện', invalidate: [['flows']] });
  const mDelEvent = useMutation({ mutationFn: (id: string) => api.delete(`/event-definitions/${id}`), onSuccess: () => { toast('Đã xoá sự kiện'); setSel(null); invalidate(); } });
  const mUpdEvent = useMutation({ mutationFn: ({ id, body }: any) => api.patch(`/event-definitions/${id}`, body), onSuccess: (r) => { setSel(r.data); invalidate(); } });
  const mAddField = useApiMutation(({ id, body }: any) => api.post(`/event-definitions/${id}/fields`, body), { successMessage: 'Đã thêm trường', invalidate: [['flows']], onSuccess: () => refreshSel() });
  const mUpdField = useMutation({ mutationFn: ({ id, body }: any) => api.patch(`/event-fields/${id}`, body), onSuccess: () => { refreshSel(); invalidate(); } });
  const mDelField = useMutation({ mutationFn: (id: string) => api.delete(`/event-fields/${id}`), onSuccess: () => { refreshSel(); invalidate(); } });

  const refreshSel = async () => {
    if (!sel) return;
    const flow = await api.get('/flows').then((r) => r.data);
    for (const f of flow) for (const v of f.versions) { const ev = v.eventDefinitions.find((e: any) => e.id === sel.id); if (ev) { setSel(ev); return; } }
  };

  const [nf, setNf] = useState({ key: '', label: '', type: 'text' });

  return (
    <>
      <PageHead eyebrow="Thiết kế quy trình" title="Flow & Event" subtitle="Thiết kế quy trình truy xuất · nhấp sự kiện để cấu hình" />

      {canManage && (
        <div className="card p-5 mb-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="iconbox"><Plus size={18} /></span>
            <div>
              <b className="text-[15px]">Tạo Flow mới</b>
              <div className="text-xs text-[var(--muted)]">Gán tổ chức cho flow ở nút Sửa (có thể chọn nhiều tổ chức / bộ phận).</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <label className="block flex-1 min-w-[180px]"><span className="label">Tên Flow</span><input className="input" value={newFlow.name} onChange={(e) => setNewFlow({ ...newFlow, name: e.target.value })} placeholder="Chuỗi rau sạch" /></label>
            <label className="block flex-1 min-w-[160px]"><span className="label">Mã</span><input className="input mono" value={newFlow.code} onChange={(e) => setNewFlow({ ...newFlow, code: e.target.value })} placeholder="CHUOI-RAU" /></label>
            <button className="btn btn-primary" disabled={!newFlow.name || !newFlow.code || mCreate.isPending} onClick={() => mCreate.mutate()}><Plus size={16} />Tạo Flow</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2.5 mb-5 items-center">
        <div className="flex items-center gap-2 rounded-full px-4 h-11 flex-1 min-w-[220px]" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
          <Search size={16} className="text-[var(--muted)]" />
          <input className="flex-1 bg-transparent outline-none text-sm" placeholder="Tìm flow theo tên / mã…" value={flowQ} onChange={(e) => { setFlowQ(e.target.value); setPage(1); }} />
        </div>
        <select className="input h-11" style={{ maxWidth: 220, width: 'auto' }} value={orgFilter} onChange={(e) => { setOrgFilter(e.target.value); setPage(1); }}>
          <option value="">Tất cả tổ chức</option>
          {(orgs.data ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>

      {flows.isLoading ? <Spinner /> : (flows.data?.items?.length ?? 0) === 0 ? (
        <div className="card"><EmptyState title="Không có Flow" hint={flowQ || orgFilter ? 'Thử bỏ bộ lọc.' : 'Tạo Flow đầu tiên ở trên.'} /></div>
      ) : (
        <>
        <div className="flex flex-col gap-4">
          {(flows.data.items ?? []).map((flow: any) => {
            const version = flow.versions?.[0];
            const events = version?.eventDefinitions ?? [];
            const orgNames = (flow.orgLinks ?? []).map((l: any) => l.organization?.name).filter(Boolean);
            return (
              <div key={flow.id} className="card card-hover p-5 anim-in">
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className="w-10 h-10 rounded-xl grid place-items-center flex-none" style={{ color: 'var(--accent-contrast)', background: 'var(--accent)' }}><GitBranch size={18} /></span>
                  <div className="flex-1 min-w-[160px]">
                    <b className="text-[15px]">{flow.name}</b>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      <span className="chip" style={{ fontSize: 11 }}>v{version?.version}</span>
                      <span className="chip" style={{ fontSize: 11 }}><Layers size={11} />{events.length} sự kiện</span>
                      <span className={`pill ${version?.isPublished ? 'pill-good' : 'pill-warn'}`} style={{ fontSize: 11 }}><i />{version?.isPublished ? 'Đã xuất bản' : 'Nháp'}</span>
                      <span className="chip" style={{ fontSize: 11 }}><Building2 size={11} />{orgNames.length ? `${orgNames.slice(0, 2).join(', ')}${orgNames.length > 2 ? ` +${orgNames.length - 2}` : ''}` : 'Toàn Tổ Chức'}</span>
                    </div>
                  </div>
                  {canManage && <div className="flex items-center gap-1.5 flex-wrap">
                    <button className="btn btn-sm" onClick={() => setEditFlow({ id: flow.id, name: flow.name, code: flow.code, organizationIds: (flow.orgLinks ?? []).map((l: any) => l.organizationId) })}><Pencil size={14} />Sửa</button>
                    <button className="btn btn-sm" onClick={() => mClone.mutate(flow.id)}><Copy size={14} />Nhân bản</button>
                    {!version?.isPublished && <button className="btn btn-sm btn-primary" onClick={() => mPublish.mutate(flow.id)}><Rocket size={14} />Xuất bản</button>}
                    <button className="btn btn-sm btn-danger" title="Xoá flow" onClick={() => {
                      const nOrg = orgNames.length; const nProd = flow._count?.products ?? 0;
                      const warns: string[] = [];
                      if (nOrg > 1) warns.push(`đang thuộc ${nOrg} tổ chức`);
                      if (nProd > 0) warns.push(`đang gán cho ${nProd} sản phẩm (xoá sẽ gỡ khỏi các sản phẩm đó)`);
                      const msg = warns.length ? `Flow "${flow.name}" ${warns.join(' và ')}. Vẫn xoá?` : `Xoá flow "${flow.name}"?`;
                      if (window.confirm(msg)) mDelete.mutate(flow.id);
                    }}><Trash2 size={14} /></button>
                  </div>}
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                  {events.map((ev: any, i: number) => (
                    <div key={ev.id} className="flex items-center gap-2 flex-none">
                      <button onClick={() => { setSel(ev); setSelCtx({ events }); setTab('fields'); }} className="w-[184px] p-3.5 rounded-xl text-left transition-colors hover:border-[var(--accent)]" style={{ border: '1.5px solid var(--border)', background: 'var(--surface)' }}>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--faint)]">Sự kiện {ev.order}</div>
                          {ev.publicConfig?.event === false
                            ? <span className="inline-flex items-center gap-0.5 text-[9.5px] font-semibold text-[var(--warn)]" title="Không công khai"><EyeOff size={11} />Ẩn</span>
                            : <span className="inline-flex items-center gap-0.5 text-[9.5px] font-semibold text-[var(--good)]" title="Công khai"><Eye size={11} /></span>}
                        </div>
                        <b className="text-sm block truncate">{ev.name}</b>
                        <div className="text-[11.5px] text-[var(--muted)] mt-1">5 yếu tố GS1 EPCIS{(ev.fields?.length ?? 0) > 0 ? ` · +${ev.fields.length} trường` : ''}</div>
                      </button>
                      {i < events.length - 1 && <ArrowRight size={16} className="text-[var(--faint)] flex-none" />}
                    </div>
                  ))}
                  {canManage && (
                    <AddEvent onAdd={(name, code) => mAddEvent.mutate({ versionId: version.id, name, code })} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {flows.data.total > flows.data.pageSize && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button className="btn btn-sm" disabled={flows.data.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Trước</button>
            <span className="text-sm text-[var(--muted)]">Trang {flows.data.page} / {Math.ceil(flows.data.total / flows.data.pageSize)} · {flows.data.total} flow</span>
            <button className="btn btn-sm" disabled={flows.data.page >= Math.ceil(flows.data.total / flows.data.pageSize)} onClick={() => setPage((p) => p + 1)}>Sau →</button>
          </div>
        )}
        </>
      )}

      {/* Event editor drawer */}
      <Drawer open={!!sel} onClose={() => { setSel(null); setSelCtx(null); }}
        title={sel && <><b>{sel.name}</b><div className="text-xs text-[var(--muted)]">Cấu hình sự kiện</div></>}
        footer={canManage && sel ? <><button className="btn btn-danger" onClick={() => mDelEvent.mutate(sel.id)}><Trash2 size={15} />Xoá sự kiện</button><div className="flex-1" /><button className="btn" onClick={() => { setSel(null); setSelCtx(null); }}>Đóng</button></> : undefined}>
        {sel && (
          <>
            {canManage && (
              <label className="block mb-3"><span className="label">Tên sự kiện</span>
                <input className="input" defaultValue={sel.name} key={sel.id}
                  onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== sel.name) mUpdEvent.mutate({ id: sel.id, body: { name: v } }); }} />
              </label>
            )}
            {canManage && selCtx && (() => {
              const i = (selCtx.events ?? []).findIndex((e: any) => e.id === sel.id);
              return (
                <div className="flex items-center gap-1.5 mb-4">
                  <button className="btn btn-sm" disabled={i <= 0} onClick={() => moveEvent(-1)}><ArrowUp size={14} /></button>
                  <button className="btn btn-sm" disabled={i < 0 || i >= selCtx.events.length - 1} onClick={() => moveEvent(1)}><ArrowDown size={14} /></button>
                  <span className="text-xs text-[var(--muted)]">Bước {i + 1}/{selCtx.events.length} trong quy trình</span>
                </div>
              );
            })()}
            <div className="mb-4">
              <SegmentedControl value={tab} onChange={(v) => setTab(v)} options={[
                { value: 'fields', label: 'Trường' },
                { value: 'perm', label: 'Quyền nhập' },
                { value: 'public', label: 'Công khai' },
              ]} />
            </div>

            {tab === 'fields' && (
              <div className="flex flex-col gap-3">
                <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--faint)]">5 yếu tố chuẩn GS1 EPCIS · luôn thu thập</div>
                <div className="grid grid-cols-5 gap-1.5">
                  {EPCIS.map((e) => (
                    <div key={e.key} className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <e.icon size={16} className="text-[var(--accent)]" />
                      <span className="text-[10.5px] font-semibold leading-tight">{e.label}</span>
                      <span className="text-[9px] text-[var(--faint)]">{e.en}</span>
                    </div>
                  ))}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--faint)] mt-1">Trường thông tin tự cấu hình (What)</div>
                {(sel.fields ?? []).map((f: any) => (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap"><b className="text-[13.5px]">{f.label}</b><span className="mono text-xs text-[var(--muted)]">{f.key}</span></div>
                      <div className="text-[11.5px] text-[var(--muted)] mt-0.5">{f.type}{f.required ? ' · bắt buộc' : ''}</div>
                    </div>
                    {canManage && <button className="btn btn-sm btn-danger" onClick={() => mDelField.mutate(f.id)}><Trash2 size={13} /></button>}
                  </div>
                ))}
                {(sel.fields ?? []).length === 0 && <p className="text-sm text-[var(--muted)]">Chưa có trường.</p>}
                {canManage && (
                  <div className="flex flex-wrap gap-2.5 items-end p-3.5 rounded-xl mt-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <label className="block"><span className="label">Key</span><input className="input mono w-24" value={nf.key} onChange={(e) => setNf({ ...nf, key: e.target.value })} /></label>
                    <label className="block"><span className="label">Nhãn</span><input className="input w-28" value={nf.label} onChange={(e) => setNf({ ...nf, label: e.target.value })} /></label>
                    <label className="block"><span className="label">Loại</span><select className="input" value={nf.type} onChange={(e) => setNf({ ...nf, type: e.target.value })}>{FIELD_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
                    <button className="btn btn-primary" disabled={!nf.key || !nf.label} onClick={() => { mAddField.mutate({ id: sel.id, body: nf }); setNf({ key: '', label: '', type: 'text' }); }}><Plus size={15} />Thêm</button>
                  </div>
                )}
              </div>
            )}

            {tab === 'perm' && (
              <div>
                <p className="text-sm text-[var(--muted)] mb-3">Vai trò nào được nhập sự kiện này? Quyền theo từng người được gán khi gán flow vào sản phẩm hoặc khi tạo lịch truy xuất.</p>
                <div className="flex flex-wrap gap-2">
                  {ASSIGNABLE_ROLES.map((rk) => {
                    const on = (sel.enterRoleKeys ?? []).includes(rk);
                    return <button key={rk} disabled={!canManage} className={`pill ${on ? 'pill-accent' : 'pill-neutral'}`} style={{ padding: '6px 12px', fontSize: 12.5 }}
                      onClick={() => { const next = on ? sel.enterRoleKeys.filter((x: string) => x !== rk) : [...(sel.enterRoleKeys ?? []), rk]; mUpdEvent.mutate({ id: sel.id, body: { enterRoleKeys: next } }); }}>{on && <Check size={13} />}{ROLE_LABELS[rk]}</button>;
                  })}
                </div>
              </div>
            )}

            {tab === 'public' && (() => {
              const cfg: Record<string, boolean> = { event: true, who: true, where: true, when: true, media: true, ...(sel.publicConfig ?? {}) };
              const on = (k: string) => cfg[k] !== false;
              const setCfg = (patch: Record<string, boolean>) => { if (canManage) mUpdEvent.mutate({ id: sel.id, body: { publicConfig: { ...cfg, ...patch } } }); };
              const pubFields = (sel.fields ?? []).filter((f: any) => f.publicVisible);
              return (
                <div className="flex gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl mb-1" style={{ background: on('event') ? 'var(--accent-soft)' : 'var(--surface)', border: '1px solid var(--border)' }}>
                      <b className="flex-1 text-[13.5px]">Hiển thị cả sự kiện</b>
                      <Toggle on={on('event')} disabled={!canManage} onClick={() => setCfg({ event: !on('event') })} />
                    </div>
                    {on('event') && <>
                      <div className="text-[11px] font-bold uppercase text-[var(--faint)] mt-3 mb-1">Yếu tố chuẩn (EPCIS)</div>
                      {[['who', 'Ai (Who)'], ['where', 'Ở đâu (Where)'], ['when', 'Thời gian (When)'], ['media', 'Media (How)']].map(([k, l]) => (
                        <div key={k} className="flex items-center gap-2 py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
                          {on(k) ? <Eye size={15} className="text-[var(--good)]" /> : <EyeOff size={15} className="text-[var(--faint)]" />}
                          <span className="flex-1 text-[13.5px]">{l}</span>
                          <Toggle on={on(k)} disabled={!canManage} onClick={() => setCfg({ [k]: !on(k) })} />
                        </div>
                      ))}
                      <div className="text-[11px] font-bold uppercase text-[var(--faint)] mt-3 mb-1">Thông tin tự cấu hình (What)</div>
                      {(sel.fields ?? []).map((f: any) => (
                        <div key={f.id} className="flex items-center gap-2 py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
                          {f.publicVisible ? <Eye size={15} className="text-[var(--good)]" /> : <EyeOff size={15} className="text-[var(--faint)]" />}
                          <span className="flex-1 text-[13.5px]">{f.label}</span>
                          <Toggle on={!!f.publicVisible} disabled={!canManage} onClick={() => mUpdField.mutate({ id: f.id, body: { publicVisible: !f.publicVisible } })} />
                        </div>
                      ))}
                      {(sel.fields ?? []).length === 0 && <p className="text-xs text-[var(--muted)] mt-1">Chưa có trường tự cấu hình.</p>}
                    </>}
                  </div>
                  {/* Phone preview */}
                  <div className="w-[200px] border-[8px] rounded-[30px] overflow-hidden mx-auto self-start" style={{ borderColor: '#11151f', background: 'var(--bg)', boxShadow: 'var(--shadow-md)' }}>
                    <div className="h-[300px] overflow-auto">
                      {!on('event') ? (
                        <div className="p-4 text-center text-[11px] text-[var(--faint)] mt-12">🔒 Sự kiện này bị ẩn khỏi trang công khai</div>
                      ) : <>
                        <div className="p-3 text-white" style={{ background: 'linear-gradient(160deg,#1b6b3f,#2f9e5f)' }}>
                          <div className="text-[10px] font-bold">✓ Đã xác thực</div>
                          <div className="text-[13px] font-bold">{sel.name}</div>
                        </div>
                        <div className="p-3 text-[11px]">
                          {on('who') && <div className="py-1"><span className="text-[var(--faint)]">Ai:</span> •••</div>}
                          {on('where') && <div className="py-1"><span className="text-[var(--faint)]">Ở đâu:</span> •••</div>}
                          {on('when') && <div className="py-1"><span className="text-[var(--faint)]">Thời gian:</span> •••</div>}
                          {pubFields.map((f: any) => (
                            <div key={f.id} className="py-1" style={{ borderTop: '1px solid var(--border)' }}><span className="text-[var(--faint)]">{f.label}:</span> •••</div>
                          ))}
                          {on('media') && <div className="py-1 text-[var(--faint)]">🖼 Media hiển thị</div>}
                          <div className="text-[10px] text-[var(--faint)] pt-2">🔒 {(sel.fields ?? []).length - pubFields.length} trường ẩn</div>
                        </div>
                      </>}
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </Drawer>

      {/* Edit flow drawer */}
      <Drawer open={!!editFlow} onClose={() => setEditFlow(null)} title={<b>Sửa Flow</b>}
        footer={<><div className="flex-1" /><button className="btn" onClick={() => setEditFlow(null)}>Huỷ</button>
          <button className="btn btn-primary" disabled={!editFlow?.name || !editFlow?.code || mUpdateFlow.isPending} onClick={() => mUpdateFlow.mutate({ id: editFlow.id, body: { name: editFlow.name, code: editFlow.code, organizationIds: editFlow.organizationIds } })}>Lưu</button></>}>
        {editFlow && <>
          <label className="block mb-3"><span className="label">Tên Flow</span><input className="input" value={editFlow.name} onChange={(e) => setEditFlow({ ...editFlow, name: e.target.value })} /></label>
          <label className="block mb-4"><span className="label">Mã</span><input className="input mono" value={editFlow.code} onChange={(e) => setEditFlow({ ...editFlow, code: e.target.value })} /></label>
          <span className="label">Thuộc tổ chức / bộ phận (chọn nhiều)</span>
          <div className="flex flex-col gap-1 max-h-[240px] overflow-auto p-1.5 rounded-xl mb-2" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
            {(orgs.data ?? []).map((o) => {
              const on = editFlow.organizationIds.includes(o.id);
              return (
                <button key={o.id} className="flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-colors" style={{ background: on ? 'var(--accent-soft)' : 'transparent', marginLeft: (o.level ?? 0) * 12 }}
                  onClick={() => setEditFlow({ ...editFlow, organizationIds: on ? editFlow.organizationIds.filter((x: string) => x !== o.id) : [...editFlow.organizationIds, o.id] })}>
                  <span className="w-5 h-5 rounded-md grid place-items-center flex-none transition-colors" style={{ border: '1.5px solid var(--border-strong)', background: on ? 'var(--accent)' : 'transparent' }}>{on && <Check size={12} style={{ color: 'var(--accent-contrast)' }} />}</span>
                  <span className="text-sm flex-1">{o.name}</span><span className="chip" style={{ fontSize: 11 }}>Cấp {(o.level ?? 0) + 1}</span>
                </button>
              );
            })}
          </div>
          <div className="text-xs text-[var(--muted)]">{editFlow.organizationIds.length === 0 ? 'Không chọn tổ chức nào = Toàn Tổ Chức' : `Đã chọn ${editFlow.organizationIds.length} tổ chức / bộ phận`}</div>
        </>}
      </Drawer>

      {/* Flow permission assignment drawer */}
    </>
  );
}

function AddEvent({ onAdd }: { onAdd: (name: string, code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  if (!open) return <button className="w-[152px] min-h-[92px] p-3 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 text-[var(--accent)] text-xs font-semibold flex-none transition-colors hover:bg-[var(--accent-soft)]" style={{ borderColor: 'var(--border-strong)' }} onClick={() => setOpen(true)}><Plus size={20} />Thêm sự kiện</button>;
  return (
    <div className="w-[184px] p-3.5 rounded-xl flex-none" style={{ border: '1.5px solid var(--accent)', background: 'var(--accent-soft)' }}>
      <input autoFocus className="input mb-2" placeholder="Tên sự kiện" value={name} onChange={(e) => setName(e.target.value)} />
      <button className="btn btn-primary btn-sm w-full justify-center" disabled={!name} onClick={() => { onAdd(name, name.toUpperCase().replace(/\s+/g, '_').slice(0, 20) + '_' + Math.floor(Math.random() * 900 + 100)); setName(''); setOpen(false); }}>Thêm</button>
    </div>
  );
}

