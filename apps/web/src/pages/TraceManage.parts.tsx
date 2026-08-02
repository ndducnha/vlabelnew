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
import { useT, type Messages } from '../lib/i18n';

const MSG: Messages = {
  vi: {
    pillNoflow: 'Chưa có Luồng',
    pillReady: 'Sẵn sàng',
    pillActive: 'Đang khai báo',
    pillOverdue: 'Có lịch quá hạn',
    pillDone: 'Hoàn thành',
    unassigned: 'Chưa gán',
    overdueN: '{n} quá hạn',
    chipFlows: '{n} luồng',
    chipBatches: '{n} lô',
    chipScheds: '{n} lịch',
    tabFlow: 'Luồng',
    tabAssign: 'Phân công',
    tabSched: 'Lịch',
    tabProgress: 'Tiến độ',
    msgAttach: 'Đã gắn Luồng',
    msgDetach: 'Đã gỡ Luồng',
    msgClone: 'Đã nhân bản & gắn Luồng',
    flowDesc: 'Một sản phẩm có thể gắn nhiều Luồng. Phân biệt theo lô / ngày sản xuất khi tạo lịch. QR chung dùng GTIN; QR riêng dùng theo lô.',
    emptyFlowTitle: 'Chưa gắn Luồng',
    emptyFlowHint: 'Gắn Luồng có sẵn hoặc tạo mới bên dưới.',
    nEvents: '{n} Sự kiện',
    published: 'đã xuất bản',
    draft: 'nháp',
    qrCommon: 'QR chung',
    qrByBatch: 'QR theo lô',
    clone: 'Nhân bản',
    confirmDetach: 'Gỡ Luồng "{name}" khỏi sản phẩm?',
    chooseFlow: 'Chọn Luồng để gắn thêm',
    allAttached: 'Đã gắn hết Luồng hiện có.',
    close: 'Đóng',
    attachCreate: 'Gắn / tạo Luồng',
    msgCreated: 'Đã tạo Luồng',
    newFlowPh: 'Tên Luồng mới…',
    create: 'Tạo',
    qrLotTitle: 'QR lô {lot}',
    qrProductTitle: 'QR sản phẩm',
    downloadQr: 'Tải QR',
    noFlowTitle: 'Chưa có Luồng',
    assignHint: 'Gắn Luồng ở tab Luồng để phân công khai báo.',
    msgAssigned: 'Đã phân công',
    msgRemoved: 'Đã gỡ',
    assignDesc: 'Phân công toàn Luồng (khai báo mọi Sự kiện) hoặc chi tiết theo từng Sự kiện. Quyền chi tiết được ưu tiên khi kê khai.',
    scopeLabel: 'Phạm vi phụ trách',
    scopeAll: 'Toàn bộ Luồng ({name})',
    scopeEvent: 'Chỉ Sự kiện: {name}',
    findPersonPh: 'Tìm người để phân công…',
    assign: 'Phân công',
    notFound: 'Không tìm thấy.',
    assignedCount: 'Đang phụ trách ({n})',
    noneAssigned: 'Chưa phân công ai.',
    permEvent: 'Sự kiện: {name}',
    permAll: 'Toàn bộ Luồng',
    msgCreatedSched: 'Đã tạo lịch',
    msgDeletedSched: 'Đã xoá lịch',
    createSched: 'Tạo lịch truy xuất',
    schedNamePh: 'Tên lịch (tuỳ chọn)',
    lotPh: 'Lô (tuỳ chọn)',
    flowOfProduct: 'Luồng của SP',
    assigneePh: '— người phụ trách —',
    fromDate: 'Từ ngày',
    toDate: 'Đến ngày',
    notePh: 'Ghi chú',
    createSchedBtn: 'Tạo lịch',
    noSched: 'Chưa có lịch truy xuất cho sản phẩm này.',
    schedDefaultName: 'Lịch truy xuất',
    overdue: 'Quá hạn',
    chipLot: 'Lô {lot}',
    dueDate: 'Hạn {d}',
    start: 'Bắt đầu',
    pause: 'Tạm dừng',
    complete: 'Hoàn thành',
    confirmDeleteSched: 'Xoá lịch?',
    reopen: 'Mở lại',
    progressHint: 'Tiến độ tính theo số Sự kiện đã có bản ghi được duyệt trên từng lô.',
    noRecords: 'Chưa có lô/bản ghi nào. Tiến độ sẽ hiện khi bắt đầu kê khai.',
    progressStat: '{done}/{total} Sự kiện · {pct}%',
    noLot: '(không lô)',
    progressEmptyHint: 'Gắn Luồng để theo dõi tiến độ khai báo.',
  },
  en: {
    pillNoflow: 'No Flow yet',
    pillReady: 'Ready',
    pillActive: 'Declaring',
    pillOverdue: 'Has overdue schedule',
    pillDone: 'Completed',
    unassigned: 'Unassigned',
    overdueN: '{n} overdue',
    chipFlows: '{n} flow(s)',
    chipBatches: '{n} batch(es)',
    chipScheds: '{n} schedule(s)',
    tabFlow: 'Flow',
    tabAssign: 'Assignment',
    tabSched: 'Schedule',
    tabProgress: 'Progress',
    msgAttach: 'Flow attached',
    msgDetach: 'Flow removed',
    msgClone: 'Flow cloned & attached',
    flowDesc: 'A product can attach multiple Flows. Distinguish by batch / production date when creating schedules. The common QR uses GTIN; the per-batch QR uses the batch.',
    emptyFlowTitle: 'No Flow attached',
    emptyFlowHint: 'Attach an existing Flow or create a new one below.',
    nEvents: '{n} Event(s)',
    published: 'published',
    draft: 'draft',
    qrCommon: 'Common QR',
    qrByBatch: 'QR by batch',
    clone: 'Clone',
    confirmDetach: 'Remove Flow "{name}" from product?',
    chooseFlow: 'Choose a Flow to attach',
    allAttached: 'All available Flows are attached.',
    close: 'Close',
    attachCreate: 'Attach / create Flow',
    msgCreated: 'Flow created',
    newFlowPh: 'New Flow name…',
    create: 'Create',
    qrLotTitle: 'QR batch {lot}',
    qrProductTitle: 'Product QR',
    downloadQr: 'Download QR',
    noFlowTitle: 'No Flow yet',
    assignHint: 'Attach a Flow in the Flow tab to assign declaration work.',
    msgAssigned: 'Assigned',
    msgRemoved: 'Removed',
    assignDesc: 'Assign the entire Flow (declare every Event) or in detail per Event. Detailed permissions take priority when declaring.',
    scopeLabel: 'Responsibility scope',
    scopeAll: 'Entire Flow ({name})',
    scopeEvent: 'Event only: {name}',
    findPersonPh: 'Search a person to assign…',
    assign: 'Assign',
    notFound: 'Not found.',
    assignedCount: 'Assigned ({n})',
    noneAssigned: 'No one assigned yet.',
    permEvent: 'Event: {name}',
    permAll: 'Entire Flow',
    msgCreatedSched: 'Schedule created',
    msgDeletedSched: 'Schedule deleted',
    createSched: 'Create trace schedule',
    schedNamePh: 'Schedule name (optional)',
    lotPh: 'Batch (optional)',
    flowOfProduct: "Product's Flow",
    assigneePh: '— assignee —',
    fromDate: 'From date',
    toDate: 'To date',
    notePh: 'Note',
    createSchedBtn: 'Create schedule',
    noSched: 'No trace schedule for this product yet.',
    schedDefaultName: 'Trace schedule',
    overdue: 'Overdue',
    chipLot: 'Batch {lot}',
    dueDate: 'Due {d}',
    start: 'Start',
    pause: 'Pause',
    complete: 'Complete',
    confirmDeleteSched: 'Delete schedule?',
    reopen: 'Reopen',
    progressHint: 'Progress is measured by the number of Events with an approved record on each batch.',
    noRecords: 'No batch/record yet. Progress will show once declaration begins.',
    progressStat: '{done}/{total} Event(s) · {pct}%',
    noLot: '(no batch)',
    progressEmptyHint: 'Attach a Flow to track declaration progress.',
  },
};

const vnDate = (x?: string | null) => (x ? new Date(x).toLocaleDateString('vi-VN') : '—');

const TASK_STATUS = statusClsMap(TRACE_TASK_STATUS_LABELS);

function StatusPillLocal({ status }: { status: string }) {
  const t = useT(MSG);
  const m: Record<string, [string, string]> = { noflow: ['pill-warn', t('pillNoflow')], ready: ['pill-neutral', t('pillReady')], active: ['pill-accent', t('pillActive')], overdue: ['pill-bad', t('pillOverdue')], done: ['pill-good', t('pillDone')] };
  const [cls, label] = m[status] ?? ['pill-neutral', status];
  return <span className={`pill ${cls}`}><i />{label}</span>;
}

function ProductThumb({ image, size = 40 }: { image: string | null; size?: number }) {
  return image
    ? <img src={image} alt="" style={{ width: size, height: size }} className="rounded-xl object-cover flex-none border" />
    : <span className="rounded-xl grid place-items-center flex-none" style={{ width: size, height: size, background: 'var(--accent-soft)', color: 'var(--accent)' }}><Package size={size * 0.45} /></span>;
}

export function TableRow({ r, index, onOpen }: { r: any; index?: number; onOpen: () => void }) {
  const t = useT(MSG);
  return (
    <tr className="cursor-pointer" onClick={onOpen}>
      <td><span className="ledger-idx">{index != null ? String(index).padStart(2, '0') : ''}</span></td>
      <td>
        <div className="flex items-center gap-3">
          <ProductThumb image={r.image} />
          <div className="min-w-0"><b className="block truncate">{r.name}</b><div className="text-xs text-[var(--muted)] mono">{r.gtin}</div></div>
        </div>
      </td>
      <td>{r.flowCount === 0 ? <span className="text-[13px] font-semibold text-[var(--warn)]">{t('unassigned')}</span> : <span className="num text-[15px]">{r.flowCount}</span>}</td>
      <td><span className="num text-[15px] text-[var(--ink-2)]">{r.batchCount}</span></td>
      <td><span className="num text-[15px] text-[var(--ink-2)]">{r.taskCount}</span>{r.overdue > 0 && <span className="block text-[11px] font-bold text-[var(--danger)] mono">{t('overdueN', { n: r.overdue })}</span>}</td>
      <td style={{ minWidth: 130 }}>
        <div className="flex items-center gap-2.5"><div className="flex-1"><ProgressBar value={r.pct} /></div><span className="text-xs text-[var(--muted)] num w-9 text-right">{r.pct}%</span></div>
      </td>
      <td><StatusPillLocal status={r.status} /></td>
    </tr>
  );
}

export function CardRow({ r, onOpen }: { r: any; onOpen: () => void }) {
  const t = useT(MSG);
  return (
    <button className="card card-hover p-4 anim-in text-left" onClick={onOpen}>
      <div className="flex items-start gap-3">
        <ProductThumb image={r.image} size={44} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap"><b className="truncate">{r.name}</b><StatusPillLocal status={r.status} /></div>
          <div className="text-xs text-[var(--muted)] mono mt-0.5">{r.gtin}</div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="chip"><GitBranch size={11} />{t('chipFlows', { n: r.flowCount })}</span>
            <span className="chip"><Layers size={11} />{t('chipBatches', { n: r.batchCount })}</span>
            <span className="chip"><CalendarClock size={11} />{t('chipScheds', { n: r.taskCount })}</span>
          </div>
          <div className="flex items-center gap-2 mt-2.5"><div className="flex-1"><ProgressBar value={r.pct} /></div><span className="text-xs text-[var(--muted)] num">{r.pct}%</span></div>
        </div>
      </div>
    </button>
  );
}

// ══════════════ CHI TIẾT SẢN PHẨM ══════════════
export function ProductDetail({ product, onClose }: { product: any; onClose: () => void }) {
  const t = useT(MSG);
  const [tab, setTab] = useState<'flow' | 'assign' | 'sched' | 'progress'>('flow');
  const detail = useQuery({ queryKey: ['product', product.id], queryFn: () => api.get(`/products/${product.id}`).then((r) => r.data) });
  const el = useQuery({ queryKey: ['elabel', product.id], queryFn: () => api.get(`/elabels/${product.id}`).then((r) => r.data) });
  const flows = (detail.data?.flows ?? []).map((x: any) => x.flow);

  return (
    <Drawer open onClose={onClose} title={<><b className="block leading-tight">{product.name}</b><span className="text-xs text-[var(--muted)] mono">GTIN {product.gtin}</span></>}>
      <div className="tabbar mb-4">
        {([['flow', t('tabFlow')], ['assign', t('tabAssign')], ['sched', t('tabSched')], ['progress', t('tabProgress')]] as const).map(([k, l]) => (
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
  const t = useT(MSG);
  const flowsAll = useQuery<Flow[]>({ queryKey: ['flows-all'], queryFn: () => api.get('/flows').then((r) => r.data) });
  const [qr, setQr] = useState<{ lot?: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const attach = useApiMutation((flowId: string) => api.post(`/products/${product.id}/flows/attach`, { flowId }), { successMessage: t('msgAttach'), invalidate: [['product', product.id], ['products']], onSuccess: () => { setAdding(false); onChanged(); } });
  const detach = useApiMutation((flowId: string) => api.delete(`/products/${product.id}/flows/${flowId}`), { successMessage: t('msgDetach'), invalidate: [['product', product.id], ['products']], onSuccess: () => onChanged() });
  const clone = useApiMutation(async (flowId: string) => { const { data } = await api.post(`/flows/${flowId}/clone`); await api.post(`/products/${product.id}/flows/attach`, { flowId: data.id }); }, { successMessage: t('msgClone'), invalidate: [['flows-all'], ['product', product.id], ['products']], onSuccess: () => onChanged() });

  const attachedIds = new Set(flows.map((f: any) => f.id));
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[13px] text-[var(--muted)]">{t('flowDesc')}</div>
      {flows.length === 0 && <div className="card p-4"><EmptyState title={t('emptyFlowTitle')} hint={t('emptyFlowHint')} /></div>}
      {flows.map((f: any) => (
        <div key={f.id} className="card p-3.5">
          <div className="flex items-center gap-2.5">
            <span className="iconbox" style={{ width: 34, height: 34 }}><GitBranch size={16} /></span>
            <div className="flex-1 min-w-0"><b className="text-sm block truncate">{f.name}</b><div className="text-xs text-[var(--muted)]">{t('nEvents', { n: f.versions?.[0]?.eventDefinitions?.length ?? 0 })} · {f.versions?.[0]?.isPublished ? t('published') : t('draft')}</div></div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            <button className="btn btn-sm" onClick={() => setQr({})}><QrCode size={13} />{t('qrCommon')}</button>
            {batches.length > 0 && <button className="btn btn-sm" onClick={() => setQr({ lot: batches[0].batchCode })}><QrCode size={13} />{t('qrByBatch')}</button>}
            <button className="btn btn-sm" onClick={() => clone.mutate(f.id)}><Copy size={13} />{t('clone')}</button>
            <button className="btn btn-sm btn-danger" onClick={() => { if (window.confirm(t('confirmDetach', { name: f.name }))) detach.mutate(f.id); }}><Trash2 size={13} /></button>
          </div>
        </div>
      ))}

      {adding ? (
        <div className="card p-3.5 flex flex-col gap-2">
          <div className="label" style={{ margin: 0 }}>{t('chooseFlow')}</div>
          {flowsAll.isLoading ? <Spinner /> : (
            <div className="flex flex-col gap-1.5 overflow-y-auto pr-1" style={{ maxHeight: 240 }}>
              {(flowsAll.data ?? []).filter((f) => !attachedIds.has(f.id)).map((f) => (
                <button key={f.id} className="opt" disabled={attach.isPending} onClick={() => attach.mutate(f.id)}>
                  <span className="iconbox" style={{ width: 30, height: 30, background: 'var(--surface)', color: 'var(--muted)' }}><GitBranch size={14} /></span>
                  <div className="flex-1 min-w-0"><b className="text-sm block truncate">{f.name}</b><div className="text-xs text-[var(--muted)]">{t('nEvents', { n: f.versions?.[0]?.eventDefinitions?.length ?? 0 })}</div></div>
                  <Plus size={15} className="text-[var(--accent)]" />
                </button>
              ))}
              {(flowsAll.data ?? []).filter((f) => !attachedIds.has(f.id)).length === 0 && <p className="text-sm text-[var(--muted)] py-1">{t('allAttached')}</p>}
            </div>
          )}
          <NewFlowInline onCreated={(id) => attach.mutate(id)} />
          <button className="btn btn-sm self-start" onClick={() => setAdding(false)}>{t('close')}</button>
        </div>
      ) : (
        <button className="btn self-start" onClick={() => setAdding(true)}><Plus size={15} />{t('attachCreate')}</button>
      )}

      {qr && <QrModal productId={product.id} gtin={product.gtin} lot={qr.lot} onClose={() => setQr(null)} />}
    </div>
  );
}

function NewFlowInline({ onCreated }: { onCreated: (id: string) => void }) {
  const t = useT(MSG);
  const [name, setName] = useState('');
  const create = useApiMutation(
    async () => { const code = 'FLW-' + name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 18) + '-' + Date.now().toString().slice(-4); const { data } = await api.post('/flows', { name: name.trim(), code }); return data; },
    { successMessage: t('msgCreated'), onSuccess: (d) => { setName(''); onCreated(d.id); } },
  );
  return (
    <div className="flex gap-2 mt-1">
      <input className="input flex-1" placeholder={t('newFlowPh')} value={name} onChange={(e) => setName(e.target.value)} />
      <button className="btn btn-primary" disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>{create.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}{t('create')}</button>
    </div>
  );
}

function QrModal({ productId, gtin, lot, onClose }: { productId: string; gtin: string; lot?: string; onClose: () => void }) {
  const t = useT(MSG);
  const qr = useQuery({ queryKey: ['qr', productId, lot], queryFn: () => api.get(`/products/${productId}/qr`, { params: { lot } }).then((r) => r.data) });
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-5" style={{ background: 'rgba(8,12,22,.5)' }} onClick={onClose}>
      <div className="card p-5 max-w-[340px] w-full text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3"><b>{lot ? t('qrLotTitle', { lot }) : t('qrProductTitle')}</b><button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button></div>
        {qr.isLoading ? <Spinner /> : (
          <>
            <img src={qr.data?.dataUrl} alt="QR" className="mx-auto rounded-xl border" style={{ width: 220, height: 220 }} />
            <div className="text-xs text-[var(--muted)] mono mt-3 break-all">{qr.data?.url}</div>
            <a className="btn btn-primary mt-3 w-full justify-center" href={qr.data?.dataUrl} download={`qr-${gtin}${lot ? '-' + lot : ''}.png`}><Download size={15} />{t('downloadQr')}</a>
          </>
        )}
      </div>
    </div>
  );
}

// ── Tab Phân công ──
function AssignTab({ flows }: { flows: any[] }) {
  const t = useT(MSG);
  const [flowId, setFlowId] = useState<string>(flows[0]?.id ?? '');
  const flow = flows.find((f: any) => f.id === flowId) ?? flows[0];
  if (flows.length === 0) return <div className="card p-4"><EmptyState title={t('noFlowTitle')} hint={t('assignHint')} /></div>;
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
  const t = useT(MSG);
  const toast = useToast();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<string>('');   // '' = toàn Flow, hoặc eventDefinitionId
  const perms = useQuery({ queryKey: ['flow-perms', flow.id], queryFn: () => api.get(`/flows/${flow.id}/permissions`).then((r) => r.data) });
  const search = useQuery<UserSummary[]>({ queryKey: ['users-branch', q], enabled: q.trim().length > 0, queryFn: () => api.get('/users/branch', { params: { q } }).then((r) => r.data) });
  const events = (flow.versions?.[0]?.eventDefinitions ?? []).slice().sort((a: any, b: any) => a.order - b.order);
  const inv = () => qc.invalidateQueries({ queryKey: ['flow-perms', flow.id] });
  const add = useApiMutation((userId: string) => api.post(`/flows/${flow.id}/permissions`, { userId, eventDefinitionId: scope || undefined }), { successMessage: t('msgAssigned'), invalidate: [['flow-perms', flow.id]], onSuccess: () => setQ('') });
  const del = useMutation({ mutationFn: (id: string) => api.delete(`/flow-permissions/${id}`), onSuccess: () => { toast(t('msgRemoved')); inv(); } });

  const list = perms.data ?? [];
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[13px] text-[var(--muted)]">{t('assignDesc')}</div>

      <div className="card p-3.5 flex flex-col gap-2.5">
        <div className="label" style={{ margin: 0 }}>{t('scopeLabel')}</div>
        <select className="input" value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="">{t('scopeAll', { name: flow.name })}</option>
          {events.map((ev: any) => <option key={ev.id} value={ev.id}>{t('scopeEvent', { name: ev.name })}</option>)}
        </select>
        <div className="flex items-center gap-2 rounded-full px-3.5 py-2" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
          <Search size={15} className="text-[var(--muted)]" />
          <input className="flex-1 bg-transparent outline-none text-sm" placeholder={t('findPersonPh')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {q.trim().length > 0 && (
          <div className="flex flex-col gap-1.5">
            {(search.data ?? []).map((u) => (
              <div key={u.id} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ border: '1px solid var(--border)' }}>
                <Avatar name={u.fullName} size={28} />
                <div className="flex-1 min-w-0"><b className="text-[13px]">{u.fullName}</b><div className="text-[11px] text-[var(--muted)] truncate">{u.email}</div></div>
                <button className="btn btn-sm btn-primary" disabled={add.isPending} onClick={() => add.mutate(u.id)}>{t('assign')}</button>
              </div>
            ))}
            {!search.isLoading && (search.data ?? []).length === 0 && <p className="text-xs text-[var(--muted)]">{t('notFound')}</p>}
          </div>
        )}
      </div>

      <div className="label" style={{ margin: 0 }}>{t('assignedCount', { n: list.length })}</div>
      {perms.isLoading ? <Spinner /> : list.length === 0 ? <p className="text-sm text-[var(--muted)]">{t('noneAssigned')}</p> : (
        <div className="flex flex-col gap-2">
          {list.map((p: any) => (
            <div key={p.id} className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ border: '1px solid var(--border)' }}>
              <Avatar name={p.user.fullName} size={30} />
              <div className="flex-1 min-w-0">
                <b className="text-[13px] block truncate">{p.user.fullName}</b>
                <span className={`chip ${p.eventDefinitionId ? '' : 'chip-accent'}`} style={{ fontSize: 10.5, padding: '1px 7px' }}>{p.eventDefinitionId ? t('permEvent', { name: p.eventDefinition?.name ?? '—' }) : t('permAll')}</span>
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
  const t = useT(MSG);
  const toast = useToast();
  const qc = useQueryClient();
  const tasks = useQuery<TraceTask[]>({ queryKey: ['trace-tasks', false], queryFn: () => api.get('/trace-tasks').then((r) => r.data) });
  const users = useQuery<UserSummary[]>({ queryKey: ['users-branch', ''], queryFn: () => api.get('/users/branch').then((r) => r.data) });
  const [creating, setCreating] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState<any>({ name: '', lot: '', flowId: flows[0]?.id ?? '', assignedUserId: '', startDate: today, endDate: today, note: '' });
  const inv = () => qc.invalidateQueries({ queryKey: ['trace-tasks'] });
  const create = useApiMutation(() => api.post('/trace-tasks', { name: f.name || undefined, productId: product.id, lot: f.lot || undefined, flowId: f.flowId || undefined, assignedUserId: f.assignedUserId, startDate: f.startDate, endDate: f.endDate, note: f.note || undefined }), { successMessage: t('msgCreatedSched'), invalidate: [['trace-tasks']], onSuccess: () => { setCreating(false); setF({ ...f, name: '', lot: '', note: '', assignedUserId: '' }); } });
  const setStatus = useApiMutation(({ id, status }: any) => api.patch(`/trace-tasks/${id}/status`, { status }), { invalidate: [['trace-tasks']] });
  const del = useMutation({ mutationFn: (id: string) => api.delete(`/trace-tasks/${id}`), onSuccess: () => { toast(t('msgDeletedSched')); inv(); } });

  const list = (tasks.data ?? []).filter((t) => t.product?.id === product.id);
  const now = new Date();

  return (
    <div className="flex flex-col gap-3">
      <button className="btn btn-primary self-start" onClick={() => setCreating((v) => !v)}><Plus size={15} />{t('createSched')}</button>
      {creating && (
        <div className="card p-3.5 flex flex-col gap-2.5 anim-in">
          <input className="input" placeholder={t('schedNamePh')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className="input mono" placeholder={t('lotPh')} value={f.lot} onChange={(e) => setF({ ...f, lot: e.target.value })} />
            <select className="input" value={f.flowId} onChange={(e) => setF({ ...f, flowId: e.target.value })}>
              <option value="">{t('flowOfProduct')}</option>
              {flows.map((fl: any) => <option key={fl.id} value={fl.id}>{fl.name}</option>)}
            </select>
          </div>
          <select className="input" value={f.assignedUserId} onChange={(e) => setF({ ...f, assignedUserId: e.target.value })}>
            <option value="">{t('assigneePh')}</option>
            {(users.data ?? []).map((u) => <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="label">{t('fromDate')}</span><input className="input" type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></label>
            <label className="block"><span className="label">{t('toDate')}</span><input className="input" type="date" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></label>
          </div>
          <textarea className="input min-h-[56px]" placeholder={t('notePh')} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          <button className="btn btn-primary self-end" disabled={!f.assignedUserId || create.isPending} onClick={() => create.mutate()}>{create.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}{t('createSchedBtn')}</button>
        </div>
      )}

      {tasks.isLoading ? <Spinner /> : list.length === 0 ? <p className="text-sm text-[var(--muted)]">{t('noSched')}</p> : list.map((task) => {
        const overdue = task.status !== 'DONE' && new Date(task.endDate) < now;
        const s = TASK_STATUS[task.status] ?? TASK_STATUS.PENDING;
        return (
          <div key={task.id} className="card p-3.5" style={overdue ? { boxShadow: 'inset 3px 0 0 var(--danger)' } : undefined}>
            <div className="flex items-start gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap"><b className="text-[14px]">{task.name || t('schedDefaultName')}</b><span className={`pill ${overdue ? 'pill-bad' : s.cls}`}><i />{overdue ? t('overdue') : s.label}</span></div>
                <div className="flex flex-wrap gap-1.5 mt-1.5 text-[12px]">
                  {task.lot && <span className="chip">{t('chipLot', { lot: task.lot })}</span>}
                  {task.flow?.name && <span className="chip chip-accent">{task.flow.name}</span>}
                  <span className="chip"><Avatar name={task.assignedUser?.fullName} size={16} />{task.assignedUser?.fullName}</span>
                  <span className="text-[var(--muted)]">{t('dueDate', { d: vnDate(task.endDate) })}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {task.status !== 'IN_PROGRESS' && task.status !== 'DONE' && <button className="btn btn-sm" onClick={() => setStatus.mutate({ id: task.id, status: 'IN_PROGRESS' })}><Play size={12} />{t('start')}</button>}
              {task.status === 'IN_PROGRESS' && <button className="btn btn-sm" onClick={() => setStatus.mutate({ id: task.id, status: 'PENDING' })}><Pause size={12} />{t('pause')}</button>}
              {task.status !== 'DONE' && <button className="btn btn-sm" onClick={() => setStatus.mutate({ id: task.id, status: 'DONE' })}><Check size={12} />{t('complete')}</button>}
              {task.status === 'DONE' && <button className="btn btn-sm" onClick={() => setStatus.mutate({ id: task.id, status: 'IN_PROGRESS' })}><RotateIcon /></button>}
              <button className="btn btn-sm btn-danger" onClick={() => { if (window.confirm(t('confirmDeleteSched'))) del.mutate(task.id); }}><Trash2 size={12} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RotateIcon() { const t = useT(MSG); return <><Play size={12} />{t('reopen')}</>; }

// ── Tab Tiến độ ──
function ProgressTab({ product, flows, batches }: { product: any; flows: any[]; batches: any[] }) {
  const t = useT(MSG);
  const records = useQuery<EventRecord[]>({ queryKey: ['recs-by-product', product.id], queryFn: () => api.get('/event-records/by-product', { params: { productId: product.id } }).then((r) => r.data) });
  const events = flows.flatMap((f: any) => (f.versions?.[0]?.eventDefinitions ?? []));
  const totalEvents = events.length;
  const doneStatuses = new Set(['APPROVED', 'LOCKED']);
  const recs = (records.data ?? []).filter((r) => doneStatuses.has(r.status));

  // Gom theo lô
  const lots = new Map<string, Set<string>>();
  for (const r of recs) { const lot = r.traceableItem?.batchOrLot || t('noLot'); const s = lots.get(lot) ?? new Set(); s.add(r.eventDefinitionId); lots.set(lot, s); }
  const knownLots = batches.map((b: any) => b.batchCode);
  for (const l of knownLots) if (!lots.has(l)) lots.set(l, new Set());

  if (flows.length === 0) return <div className="card p-4"><EmptyState title={t('noFlowTitle')} hint={t('progressEmptyHint')} /></div>;

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[13px] text-[var(--muted)]">{t('progressHint')}</div>
      {records.isLoading ? <Spinner /> : lots.size === 0 ? (
        <p className="text-sm text-[var(--muted)]">{t('noRecords')}</p>
      ) : Array.from(lots.entries()).map(([lot, doneSet]) => {
        const pct = totalEvents ? Math.round((doneSet.size / totalEvents) * 100) : 0;
        return (
          <div key={lot} className="card p-3.5">
            <div className="flex items-center justify-between mb-2"><b className="text-sm"><Layers size={13} className="inline mr-1" />{lot}</b><span className="text-xs text-[var(--muted)] num">{t('progressStat', { done: doneSet.size, total: totalEvents, pct })}</span></div>
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
