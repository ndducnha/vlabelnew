import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package, GitBranch, Search, CalendarClock, CircleCheck, Layers, QrCode, Copy, Trash2, Plus,
  ClipboardList, Loader2, X, Download, Play, Pause, Check,
} from '../lib/icons';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';
import { useApiMutation } from '../lib/useApiMutation';
import { Spinner, EmptyState, Drawer, Paginator, ProgressBar, Avatar, statusClsMap } from '../components/ui';
import { TRACE_TASK_STATUS_LABELS } from '@vlabel/shared';
import type { Flow, TraceTask, EventRecord, UserSummary } from '@vlabel/shared';

const vnDate = (x?: string | null) => (x ? new Date(x).toLocaleDateString('vi-VN') : '—');

const TASK_STATUS = statusClsMap(TRACE_TASK_STATUS_LABELS);

function StatusPillLocal({ status }: { status: string }) {
  const m: Record<string, [string, string]> = { noflow: ['pill-warn', 'Chưa có Flow'], ready: ['pill-neutral', 'Sẵn sàng'], active: ['pill-accent', 'Đang khai báo'], overdue: ['pill-bad', 'Có lịch quá hạn'], done: ['pill-good', 'Hoàn thành'] };
  const [cls, label] = m[status] ?? ['pill-neutral', status];
  return <span className={`pill ${cls}`}><i />{label}</span>;
}

function ProductThumb({ image, size = 40 }: { image: string | null; size?: number }) {
  return image
    ? <img src={image} alt="" style={{ width: size, height: size }} className="rounded-xl object-cover flex-none border" />
    : <span className="rounded-xl grid place-items-center flex-none" style={{ width: size, height: size, background: 'var(--accent-soft)', color: 'var(--accent)' }}><Package size={size * 0.45} /></span>;
}

export function TableRow({ r, onOpen }: { r: any; onOpen: () => void }) {
  return (
    <tr className="card-hover cursor-pointer" onClick={onOpen}>
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <ProductThumb image={r.image} />
          <div className="min-w-0"><b className="block truncate">{r.name}</b><div className="text-xs text-[var(--muted)] mono">{r.gtin}</div></div>
        </div>
      </td>
      <td className="px-5 py-3">{r.flowCount === 0 ? <span className="pill pill-warn"><i />Chưa có</span> : <span className="chip"><GitBranch size={12} />{r.flowCount}</span>}</td>
      <td className="px-5 py-3"><span className="chip"><Layers size={12} />{r.batchCount}</span></td>
      <td className="px-5 py-3"><span className="chip"><CalendarClock size={12} />{r.taskCount}{r.overdue > 0 && <span className="text-[var(--danger)] font-bold"> · {r.overdue} quá hạn</span>}</span></td>
      <td className="px-5 py-3" style={{ minWidth: 120 }}>
        <div className="flex items-center gap-2"><div className="flex-1"><ProgressBar value={r.pct} /></div><span className="text-xs text-[var(--muted)] num">{r.pct}%</span></div>
      </td>
      <td className="px-5 py-3"><StatusPillLocal status={r.status} /></td>
    </tr>
  );
}

export function CardRow({ r, onOpen }: { r: any; onOpen: () => void }) {
  return (
    <button className="card card-hover p-4 anim-in text-left" onClick={onOpen}>
      <div className="flex items-start gap-3">
        <ProductThumb image={r.image} size={44} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap"><b className="truncate">{r.name}</b><StatusPillLocal status={r.status} /></div>
          <div className="text-xs text-[var(--muted)] mono mt-0.5">{r.gtin}</div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="chip"><GitBranch size={11} />{r.flowCount} flow</span>
            <span className="chip"><Layers size={11} />{r.batchCount} lô</span>
            <span className="chip"><CalendarClock size={11} />{r.taskCount} lịch</span>
          </div>
          <div className="flex items-center gap-2 mt-2.5"><div className="flex-1"><ProgressBar value={r.pct} /></div><span className="text-xs text-[var(--muted)] num">{r.pct}%</span></div>
        </div>
      </div>
    </button>
  );
}

// ══════════════ CHI TIẾT SẢN PHẨM ══════════════
export function ProductDetail({ product, onClose }: { product: any; onClose: () => void }) {
  const [tab, setTab] = useState<'flow' | 'assign' | 'sched' | 'progress'>('flow');
  const detail = useQuery({ queryKey: ['product', product.id], queryFn: () => api.get(`/products/${product.id}`).then((r) => r.data) });
  const el = useQuery({ queryKey: ['elabel', product.id], queryFn: () => api.get(`/elabels/${product.id}`).then((r) => r.data) });
  const flows = (detail.data?.flows ?? []).map((x: any) => x.flow);

  return (
    <Drawer open onClose={onClose} title={<><b className="block leading-tight">{product.name}</b><span className="text-xs text-[var(--muted)] mono">GTIN {product.gtin}</span></>}>
      <div className="tabbar mb-4">
        {([['flow', 'Flow'], ['assign', 'Phân công'], ['sched', 'Lịch'], ['progress', 'Tiến độ']] as const).map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {detail.isLoading ? <Spinner /> : (
        <>
          {tab === 'flow' && <FlowTab product={product} flows={flows} batches={el.data?.batches ?? []} onChanged={() => detail.refetch()} />}
          {tab === 'assign' && <AssignTab flows={flows} />}
          {tab === 'sched' && <SchedTab product={product} flows={flows} />}
          {tab === 'progress' && <ProgressTab product={product} flows={flows} batches={el.data?.batches ?? []} />}
        </>
      )}
    </Drawer>
  );
}

// ── Tab Flow ──
function FlowTab({ product, flows, batches, onChanged }: any) {
  const flowsAll = useQuery<Flow[]>({ queryKey: ['flows-all'], queryFn: () => api.get('/flows').then((r) => r.data) });
  const [qr, setQr] = useState<{ lot?: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const attach = useApiMutation((flowId: string) => api.post(`/products/${product.id}/flows/attach`, { flowId }), { successMessage: 'Đã gắn Flow', invalidate: [['product', product.id], ['products']], onSuccess: () => { setAdding(false); onChanged(); } });
  const detach = useApiMutation((flowId: string) => api.delete(`/products/${product.id}/flows/${flowId}`), { successMessage: 'Đã gỡ Flow', invalidate: [['product', product.id], ['products']], onSuccess: () => onChanged() });
  const clone = useApiMutation(async (flowId: string) => { const { data } = await api.post(`/flows/${flowId}/clone`); await api.post(`/products/${product.id}/flows/attach`, { flowId: data.id }); }, { successMessage: 'Đã clone & gắn Flow', invalidate: [['flows-all'], ['product', product.id], ['products']], onSuccess: () => onChanged() });

  const attachedIds = new Set(flows.map((f: any) => f.id));
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[13px] text-[var(--muted)]">Một sản phẩm có thể gắn nhiều Flow. Phân biệt theo lô / ngày sản xuất khi tạo lịch. QR chung dùng GTIN; QR riêng dùng theo lô.</div>
      {flows.length === 0 && <div className="card p-4"><EmptyState title="Chưa gắn Flow" hint="Gắn Flow có sẵn hoặc tạo mới bên dưới." /></div>}
      {flows.map((f: any) => (
        <div key={f.id} className="card p-3.5">
          <div className="flex items-center gap-2.5">
            <span className="iconbox" style={{ width: 34, height: 34 }}><GitBranch size={16} /></span>
            <div className="flex-1 min-w-0"><b className="text-sm block truncate">{f.name}</b><div className="text-xs text-[var(--muted)]">{f.versions?.[0]?.eventDefinitions?.length ?? 0} công đoạn · {f.versions?.[0]?.isPublished ? 'đã xuất bản' : 'nháp'}</div></div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            <button className="btn btn-sm" onClick={() => setQr({})}><QrCode size={13} />QR chung</button>
            {batches.length > 0 && <button className="btn btn-sm" onClick={() => setQr({ lot: batches[0].batchCode })}><QrCode size={13} />QR theo lô</button>}
            <button className="btn btn-sm" onClick={() => clone.mutate(f.id)}><Copy size={13} />Clone</button>
            <button className="btn btn-sm btn-danger" onClick={() => { if (window.confirm(`Gỡ Flow "${f.name}" khỏi sản phẩm?`)) detach.mutate(f.id); }}><Trash2 size={13} /></button>
          </div>
        </div>
      ))}

      {adding ? (
        <div className="card p-3.5 flex flex-col gap-2">
          <div className="label" style={{ margin: 0 }}>Chọn Flow để gắn thêm</div>
          {flowsAll.isLoading ? <Spinner /> : (
            <div className="flex flex-col gap-1.5 overflow-y-auto pr-1" style={{ maxHeight: 240 }}>
              {(flowsAll.data ?? []).filter((f) => !attachedIds.has(f.id)).map((f) => (
                <button key={f.id} className="opt" disabled={attach.isPending} onClick={() => attach.mutate(f.id)}>
                  <span className="iconbox" style={{ width: 30, height: 30, background: 'var(--surface)', color: 'var(--muted)' }}><GitBranch size={14} /></span>
                  <div className="flex-1 min-w-0"><b className="text-sm block truncate">{f.name}</b><div className="text-xs text-[var(--muted)]">{f.versions?.[0]?.eventDefinitions?.length ?? 0} công đoạn</div></div>
                  <Plus size={15} className="text-[var(--accent)]" />
                </button>
              ))}
              {(flowsAll.data ?? []).filter((f) => !attachedIds.has(f.id)).length === 0 && <p className="text-sm text-[var(--muted)] py-1">Đã gắn hết Flow hiện có.</p>}
            </div>
          )}
          <NewFlowInline onCreated={(id) => attach.mutate(id)} />
          <button className="btn btn-sm self-start" onClick={() => setAdding(false)}>Đóng</button>
        </div>
      ) : (
        <button className="btn self-start" onClick={() => setAdding(true)}><Plus size={15} />Gắn / tạo Flow</button>
      )}

      {qr && <QrModal productId={product.id} gtin={product.gtin} lot={qr.lot} onClose={() => setQr(null)} />}
    </div>
  );
}

function NewFlowInline({ onCreated }: { onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const create = useApiMutation(
    async () => { const code = 'FLW-' + name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 18) + '-' + Date.now().toString().slice(-4); const { data } = await api.post('/flows', { name: name.trim(), code }); return data; },
    { successMessage: 'Đã tạo Flow', onSuccess: (d) => { setName(''); onCreated(d.id); } },
  );
  return (
    <div className="flex gap-2 mt-1">
      <input className="input flex-1" placeholder="Tên Flow mới…" value={name} onChange={(e) => setName(e.target.value)} />
      <button className="btn btn-primary" disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>{create.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}Tạo</button>
    </div>
  );
}

function QrModal({ productId, gtin, lot, onClose }: { productId: string; gtin: string; lot?: string; onClose: () => void }) {
  const qr = useQuery({ queryKey: ['qr', productId, lot], queryFn: () => api.get(`/products/${productId}/qr`, { params: { lot } }).then((r) => r.data) });
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-5" style={{ background: 'rgba(8,12,22,.5)' }} onClick={onClose}>
      <div className="card p-5 max-w-[340px] w-full text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3"><b>QR {lot ? `lô ${lot}` : 'sản phẩm'}</b><button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button></div>
        {qr.isLoading ? <Spinner /> : (
          <>
            <img src={qr.data?.dataUrl} alt="QR" className="mx-auto rounded-xl border" style={{ width: 220, height: 220 }} />
            <div className="text-xs text-[var(--muted)] mono mt-3 break-all">{qr.data?.url}</div>
            <a className="btn btn-primary mt-3 w-full justify-center" href={qr.data?.dataUrl} download={`qr-${gtin}${lot ? '-' + lot : ''}.png`}><Download size={15} />Tải QR</a>
          </>
        )}
      </div>
    </div>
  );
}

// ── Tab Phân công ──
function AssignTab({ flows }: { flows: any[] }) {
  const [flowId, setFlowId] = useState<string>(flows[0]?.id ?? '');
  const flow = flows.find((f: any) => f.id === flowId) ?? flows[0];
  if (flows.length === 0) return <div className="card p-4"><EmptyState title="Chưa có Flow" hint="Gắn Flow ở tab Flow để phân công khai báo." /></div>;
  return (
    <div className="flex flex-col gap-3">
      {flows.length > 1 && (
        <select className="input" value={flowId || flows[0].id} onChange={(e) => setFlowId(e.target.value)}>
          {flows.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      )}
      {flow && <AssignFlow flow={flow} />}
    </div>
  );
}

function AssignFlow({ flow }: { flow: any }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<string>('');   // '' = toàn Flow, hoặc eventDefinitionId
  const perms = useQuery({ queryKey: ['flow-perms', flow.id], queryFn: () => api.get(`/flows/${flow.id}/permissions`).then((r) => r.data) });
  const search = useQuery<UserSummary[]>({ queryKey: ['users-branch', q], enabled: q.trim().length > 0, queryFn: () => api.get('/users/branch', { params: { q } }).then((r) => r.data) });
  const events = (flow.versions?.[0]?.eventDefinitions ?? []).slice().sort((a: any, b: any) => a.order - b.order);
  const inv = () => qc.invalidateQueries({ queryKey: ['flow-perms', flow.id] });
  const add = useApiMutation((userId: string) => api.post(`/flows/${flow.id}/permissions`, { userId, eventDefinitionId: scope || undefined }), { successMessage: 'Đã phân công', invalidate: [['flow-perms', flow.id]], onSuccess: () => setQ('') });
  const del = useMutation({ mutationFn: (id: string) => api.delete(`/flow-permissions/${id}`), onSuccess: () => { toast('Đã gỡ'); inv(); } });

  const list = perms.data ?? [];
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[13px] text-[var(--muted)]">Phân công toàn Flow (khai báo mọi công đoạn) hoặc chi tiết theo từng công đoạn. Quyền chi tiết được ưu tiên khi kê khai.</div>

      <div className="card p-3.5 flex flex-col gap-2.5">
        <div className="label" style={{ margin: 0 }}>Phạm vi phụ trách</div>
        <select className="input" value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="">Toàn bộ Flow ({flow.name})</option>
          {events.map((ev: any) => <option key={ev.id} value={ev.id}>Chỉ công đoạn: {ev.name}</option>)}
        </select>
        <div className="flex items-center gap-2 rounded-full px-3.5 py-2" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
          <Search size={15} className="text-[var(--muted)]" />
          <input className="flex-1 bg-transparent outline-none text-sm" placeholder="Tìm người để phân công…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {q.trim().length > 0 && (
          <div className="flex flex-col gap-1.5">
            {(search.data ?? []).map((u) => (
              <div key={u.id} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ border: '1px solid var(--border)' }}>
                <Avatar name={u.fullName} size={28} />
                <div className="flex-1 min-w-0"><b className="text-[13px]">{u.fullName}</b><div className="text-[11px] text-[var(--muted)] truncate">{u.email}</div></div>
                <button className="btn btn-sm btn-primary" disabled={add.isPending} onClick={() => add.mutate(u.id)}>Phân công</button>
              </div>
            ))}
            {!search.isLoading && (search.data ?? []).length === 0 && <p className="text-xs text-[var(--muted)]">Không tìm thấy.</p>}
          </div>
        )}
      </div>

      <div className="label" style={{ margin: 0 }}>Đang phụ trách ({list.length})</div>
      {perms.isLoading ? <Spinner /> : list.length === 0 ? <p className="text-sm text-[var(--muted)]">Chưa phân công ai.</p> : (
        <div className="flex flex-col gap-2">
          {list.map((p: any) => (
            <div key={p.id} className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ border: '1px solid var(--border)' }}>
              <Avatar name={p.user.fullName} size={30} />
              <div className="flex-1 min-w-0">
                <b className="text-[13px] block truncate">{p.user.fullName}</b>
                <span className={`chip ${p.eventDefinitionId ? '' : 'chip-accent'}`} style={{ fontSize: 10.5, padding: '1px 7px' }}>{p.eventDefinitionId ? `Công đoạn: ${p.eventDefinition?.name ?? '—'}` : 'Toàn bộ Flow'}</span>
              </div>
              <button className="btn btn-sm btn-danger" onClick={() => del.mutate(p.id)}><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab Lịch ──
function SchedTab({ product, flows }: { product: any; flows: any[] }) {
  const toast = useToast();
  const qc = useQueryClient();
  const tasks = useQuery<TraceTask[]>({ queryKey: ['trace-tasks', false], queryFn: () => api.get('/trace-tasks').then((r) => r.data) });
  const users = useQuery<UserSummary[]>({ queryKey: ['users-branch', ''], queryFn: () => api.get('/users/branch').then((r) => r.data) });
  const [creating, setCreating] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState<any>({ name: '', lot: '', flowId: flows[0]?.id ?? '', assignedUserId: '', startDate: today, endDate: today, note: '' });
  const inv = () => qc.invalidateQueries({ queryKey: ['trace-tasks'] });
  const create = useApiMutation(() => api.post('/trace-tasks', { name: f.name || undefined, productId: product.id, lot: f.lot || undefined, flowId: f.flowId || undefined, assignedUserId: f.assignedUserId, startDate: f.startDate, endDate: f.endDate, note: f.note || undefined }), { successMessage: 'Đã tạo lịch', invalidate: [['trace-tasks']], onSuccess: () => { setCreating(false); setF({ ...f, name: '', lot: '', note: '', assignedUserId: '' }); } });
  const setStatus = useApiMutation(({ id, status }: any) => api.patch(`/trace-tasks/${id}/status`, { status }), { invalidate: [['trace-tasks']] });
  const del = useMutation({ mutationFn: (id: string) => api.delete(`/trace-tasks/${id}`), onSuccess: () => { toast('Đã xoá lịch'); inv(); } });

  const list = (tasks.data ?? []).filter((t) => t.product?.id === product.id);
  const now = new Date();

  return (
    <div className="flex flex-col gap-3">
      <button className="btn btn-primary self-start" onClick={() => setCreating((v) => !v)}><Plus size={15} />Tạo lịch truy xuất</button>
      {creating && (
        <div className="card p-3.5 flex flex-col gap-2.5 anim-in">
          <input className="input" placeholder="Tên lịch (tuỳ chọn)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className="input mono" placeholder="Lô (tuỳ chọn)" value={f.lot} onChange={(e) => setF({ ...f, lot: e.target.value })} />
            <select className="input" value={f.flowId} onChange={(e) => setF({ ...f, flowId: e.target.value })}>
              <option value="">Flow của SP</option>
              {flows.map((fl: any) => <option key={fl.id} value={fl.id}>{fl.name}</option>)}
            </select>
          </div>
          <select className="input" value={f.assignedUserId} onChange={(e) => setF({ ...f, assignedUserId: e.target.value })}>
            <option value="">— người phụ trách —</option>
            {(users.data ?? []).map((u) => <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="label">Từ ngày</span><input className="input" type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></label>
            <label className="block"><span className="label">Đến ngày</span><input className="input" type="date" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></label>
          </div>
          <textarea className="input min-h-[56px]" placeholder="Ghi chú" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          <button className="btn btn-primary self-end" disabled={!f.assignedUserId || create.isPending} onClick={() => create.mutate()}>{create.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}Tạo lịch</button>
        </div>
      )}

      {tasks.isLoading ? <Spinner /> : list.length === 0 ? <p className="text-sm text-[var(--muted)]">Chưa có lịch truy xuất cho sản phẩm này.</p> : list.map((t) => {
        const overdue = t.status !== 'DONE' && new Date(t.endDate) < now;
        const s = TASK_STATUS[t.status] ?? TASK_STATUS.PENDING;
        return (
          <div key={t.id} className="card p-3.5" style={overdue ? { boxShadow: 'inset 3px 0 0 var(--danger)' } : undefined}>
            <div className="flex items-start gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap"><b className="text-[14px]">{t.name || 'Lịch truy xuất'}</b><span className={`pill ${overdue ? 'pill-bad' : s.cls}`}><i />{overdue ? 'Quá hạn' : s.label}</span></div>
                <div className="flex flex-wrap gap-1.5 mt-1.5 text-[12px]">
                  {t.lot && <span className="chip">Lô {t.lot}</span>}
                  {t.flow?.name && <span className="chip chip-accent">{t.flow.name}</span>}
                  <span className="chip"><Avatar name={t.assignedUser?.fullName} size={16} />{t.assignedUser?.fullName}</span>
                  <span className="text-[var(--muted)]">Hạn {vnDate(t.endDate)}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {t.status !== 'IN_PROGRESS' && t.status !== 'DONE' && <button className="btn btn-sm" onClick={() => setStatus.mutate({ id: t.id, status: 'IN_PROGRESS' })}><Play size={12} />Bắt đầu</button>}
              {t.status === 'IN_PROGRESS' && <button className="btn btn-sm" onClick={() => setStatus.mutate({ id: t.id, status: 'PENDING' })}><Pause size={12} />Tạm dừng</button>}
              {t.status !== 'DONE' && <button className="btn btn-sm" onClick={() => setStatus.mutate({ id: t.id, status: 'DONE' })}><Check size={12} />Hoàn thành</button>}
              {t.status === 'DONE' && <button className="btn btn-sm" onClick={() => setStatus.mutate({ id: t.id, status: 'IN_PROGRESS' })}><RotateIcon /></button>}
              <button className="btn btn-sm btn-danger" onClick={() => { if (window.confirm('Xoá lịch?')) del.mutate(t.id); }}><Trash2 size={12} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RotateIcon() { return <><Play size={12} />Mở lại</>; }

// ── Tab Tiến độ ──
function ProgressTab({ product, flows, batches }: { product: any; flows: any[]; batches: any[] }) {
  const records = useQuery<EventRecord[]>({ queryKey: ['recs-by-product', product.id], queryFn: () => api.get('/event-records/by-product', { params: { productId: product.id } }).then((r) => r.data) });
  const events = flows.flatMap((f: any) => (f.versions?.[0]?.eventDefinitions ?? []));
  const totalEvents = events.length;
  const doneStatuses = new Set(['APPROVED', 'LOCKED']);
  const recs = (records.data ?? []).filter((r) => doneStatuses.has(r.status));

  // Gom theo lô
  const lots = new Map<string, Set<string>>();
  for (const r of recs) { const lot = r.traceableItem?.batchOrLot || '(không lô)'; const s = lots.get(lot) ?? new Set(); s.add(r.eventDefinitionId); lots.set(lot, s); }
  const knownLots = batches.map((b: any) => b.batchCode);
  for (const l of knownLots) if (!lots.has(l)) lots.set(l, new Set());

  if (flows.length === 0) return <div className="card p-4"><EmptyState title="Chưa có Flow" hint="Gắn Flow để theo dõi tiến độ khai báo." /></div>;

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[13px] text-[var(--muted)]">Tiến độ tính theo số công đoạn đã có bản ghi được duyệt trên từng lô.</div>
      {records.isLoading ? <Spinner /> : lots.size === 0 ? (
        <p className="text-sm text-[var(--muted)]">Chưa có lô/bản ghi nào. Tiến độ sẽ hiện khi bắt đầu kê khai.</p>
      ) : Array.from(lots.entries()).map(([lot, doneSet]) => {
        const pct = totalEvents ? Math.round((doneSet.size / totalEvents) * 100) : 0;
        return (
          <div key={lot} className="card p-3.5">
            <div className="flex items-center justify-between mb-2"><b className="text-sm"><Layers size={13} className="inline mr-1" />{lot}</b><span className="text-xs text-[var(--muted)] num">{doneSet.size}/{totalEvents} công đoạn · {pct}%</span></div>
            <ProgressBar value={pct} />
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {events.map((ev: any) => (
                <span key={ev.id} className={`chip ${doneSet.has(ev.id) ? 'chip-accent' : ''}`} style={{ fontSize: 10.5, padding: '2px 8px', opacity: doneSet.has(ev.id) ? 1 : 0.5 }}>
                  {doneSet.has(ev.id) ? <CircleCheck size={11} /> : <ClipboardList size={11} />}{ev.name}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
