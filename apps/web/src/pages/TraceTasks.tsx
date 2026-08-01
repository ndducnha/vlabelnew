import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Loader2, Trash2, ClipboardEdit, CalendarClock, Check, Package, AlertTriangle, ArrowRight, ListChecks, CircleCheck, Search } from '../lib/icons';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useApiMutation } from '../lib/useApiMutation';
import { PageHead, Spinner, EmptyState, Drawer, SegmentedControl, Avatar, Paginator, usePaged, statusClsMap } from '../components/ui';
import { PERMISSIONS, TRACE_TASK_STATUS_LABELS } from '@vlabel/shared';
import type { TraceTask, Product, Flow, Organization, UserSummary } from '@vlabel/shared';

const STATUS = statusClsMap(TRACE_TASK_STATUS_LABELS);

export default function TraceTasks() {
  const { can } = useAuth();
  const nav = useNavigate();
  const isManager = can(PERMISSIONS.FLOW_MANAGE);
  const [mine, setMine] = useState(!isManager);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const tasks = useQuery<TraceTask[]>({ queryKey: ['trace-tasks', mine], queryFn: () => api.get('/trace-tasks', { params: { mine: mine ? 1 : undefined } }).then((r) => r.data) });

  const setStatus = useApiMutation(
    ({ id, status }: { id: string; status: string }) => api.patch(`/trace-tasks/${id}/status`, { status }),
    { invalidate: [['trace-tasks']] },
  );
  const del = useApiMutation((id: string) => api.delete(`/trace-tasks/${id}`), { successMessage: 'Đã xoá nhiệm vụ', invalidate: [['trace-tasks']] });

  const doTask = (t: TraceTask) => {
    if (t.status === 'PENDING') setStatus.mutate({ id: t.id, status: 'IN_PROGRESS' });
    const p = new URLSearchParams({ productId: t.product?.id ?? '' });
    if (t.lot) p.set('lot', t.lot);
    nav(`/entry?${p.toString()}`);
  };

  const list: TraceTask[] = tasks.data ?? [];
  const now = new Date();
  const overdueCount = list.filter((t) => t.status !== 'DONE' && new Date(t.endDate) < now).length;
  const doneCount = list.filter((t) => t.status === 'DONE').length;
  const activeCount = list.length - doneCount;
  const paged = usePaged<TraceTask>(list, (t, ql) =>
    (t.name ?? '').toLowerCase().includes(ql) || (t.product?.name ?? '').toLowerCase().includes(ql) || (t.product?.gtin ?? '').toLowerCase().includes(ql) || (t.lot ?? '').toLowerCase().includes(ql) || (t.assignedUser?.fullName ?? '').toLowerCase().includes(ql), query, page);

  return (
    <>
      <PageHead eyebrow="Phân công kê khai" title="Lịch truy xuất" subtitle="Giao nhiệm vụ kê khai theo sản phẩm, lô, thời gian, người phụ trách"
        actions={<>
          {isManager && (
            <SegmentedControl
              value={mine ? 'mine' : 'all'}
              onChange={(v) => setMine(v === 'mine')}
              options={[{ value: 'all', label: 'Tất cả' }, { value: 'mine', label: 'Của tôi' }]}
            />
          )}
          <div className="flex items-center gap-2 rounded-full px-3.5 h-10" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
            <Search size={15} className="text-[var(--muted)]" />
            <input className="bg-transparent outline-none text-sm" style={{ width: 190 }} placeholder="Tìm nhiệm vụ…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
          </div>
          {isManager && <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={16} />Tạo nhiệm vụ</button>}
        </>} />

      {tasks.isLoading ? <Spinner /> : list.length === 0 ? (
        <div className="card"><EmptyState title={mine ? 'Bạn chưa có nhiệm vụ nào' : 'Chưa có nhiệm vụ'} hint={isManager ? 'Bấm Tạo nhiệm vụ để giao việc kê khai.' : 'Khi được giao, nhiệm vụ sẽ hiện ở đây.'} /></div>
      ) : (
        <>
          {/* Bản kê chỉ số — khối kẻ ô kiểu sổ cái */}
          <div className="rule rule-strong" style={{ margin: '0 0 0' }} />
          <div className="kpi grid-cols-2 sm:grid-cols-4 mb-6 anim-in" style={{ borderTop: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
            {[
              { icon: <ListChecks size={13} />, label: 'Tổng nhiệm vụ', value: list.length, color: 'var(--ink)' },
              { icon: <CalendarClock size={13} />, label: 'Đang thực hiện', value: activeCount, color: activeCount ? 'var(--warn)' : 'var(--ink)' },
              { icon: <CircleCheck size={13} />, label: 'Hoàn thành', value: doneCount, color: 'var(--ink)' },
              { icon: <AlertTriangle size={13} />, label: 'Quá hạn', value: overdueCount, color: overdueCount ? 'var(--danger)' : 'var(--ink)' },
            ].map((k) => (
              <div key={k.label}>
                <div className="k">{k.icon}{k.label}</div>
                <div className="v" style={{ color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col">
            {paged.total === 0 && <p className="text-sm text-[var(--muted)] py-4 text-center">Không tìm thấy nhiệm vụ phù hợp.</p>}
            {paged.rows.map((t) => {
              const s = STATUS[t.status] ?? STATUS.PENDING;
              const overdue = t.status !== 'DONE' && new Date(t.endDate) < new Date();
              return (
                <div key={t.id} className="py-4 sm:py-5 px-1 sm:px-2 anim-in"
                  style={overdue ? { borderBottom: '1px solid var(--hairline)', boxShadow: 'inset 3px 0 0 var(--danger)' } : { borderBottom: '1px solid var(--hairline)' }}>
                  <div className="flex items-start gap-3.5 flex-wrap">
                    <span className="w-11 h-11 rounded-2xl grid place-items-center flex-none"
                      style={overdue ? { background: 'var(--danger-soft)', color: 'var(--danger)' } : { background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      {overdue ? <AlertTriangle size={20} /> : <CalendarClock size={20} />}
                    </span>

                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <b className="text-[15px] leading-tight">{t.name || t.product?.name}</b>
                        <span className={`pill ${overdue ? 'pill-bad' : s.cls}`}><i />{overdue ? 'Quá hạn' : s.label}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="chip"><Package size={12} />{t.product?.name}</span>
                        <span className="chip mono">{t.product?.gtin}</span>
                        {t.lot && <span className="chip">Lô {t.lot}</span>}
                        {t.flow?.name && <span className="chip-accent chip">{t.flow.name}</span>}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-xs text-[var(--muted)]">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarClock size={13} className="flex-none" style={overdue ? { color: 'var(--danger)' } : undefined} />
                          <span className="num" style={overdue ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>
                            {new Date(t.startDate).toLocaleDateString('vi-VN')} <ArrowRight size={11} className="inline align-middle" /> {new Date(t.endDate).toLocaleDateString('vi-VN')}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Avatar name={t.assignedUser?.fullName} size={22} />
                          <b className="text-[var(--ink-2)]">{t.assignedUser?.fullName}</b>
                        </span>
                        {t.organization?.name && <span>{t.organization.name}</span>}
                      </div>

                      {t.note && (
                        <div className="text-xs mt-2.5 px-3 py-2 rounded-lg leading-relaxed" style={{ background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--border)' }}>
                          <b className="text-[var(--muted)]">Ghi chú: </b>{t.note}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1.5 flex-none w-full sm:w-auto sm:flex-col sm:items-end">
                      {t.status !== 'DONE' && <button className="btn btn-primary btn-sm flex-1 sm:flex-none justify-center" onClick={() => doTask(t)}><ClipboardEdit size={14} />Kê khai</button>}
                      {t.status !== 'DONE' && <button className="btn btn-sm justify-center" title="Đánh dấu hoàn thành" onClick={() => setStatus.mutate({ id: t.id, status: 'DONE' })}><Check size={14} /><span className="sm:hidden">Hoàn thành</span></button>}
                      {isManager && <button className="btn btn-sm btn-danger justify-center" title="Xoá nhiệm vụ" onClick={() => { if (window.confirm('Xoá nhiệm vụ?')) del.mutate(t.id); }}><Trash2 size={14} /></button>}
                    </div>
                  </div>
                </div>
              );
            })}
            <Paginator page={paged.page} pageSize={10} total={paged.total} onPage={setPage} />
          </div>
        </>
      )}

      {open && <CreateTask onClose={() => setOpen(false)} />}
    </>
  );
}

function CreateTask({ onClose }: { onClose: () => void }) {
  const products = useQuery<Product[]>({ queryKey: ['products'], queryFn: () => api.get('/products').then((r) => r.data) });
  const flows = useQuery<Flow[]>({ queryKey: ['flows-all'], queryFn: () => api.get('/flows').then((r) => r.data) });
  const orgs = useQuery<Organization[]>({ queryKey: ['orgs'], queryFn: () => api.get('/organizations').then((r) => r.data) });
  const users = useQuery<UserSummary[]>({ queryKey: ['users-branch', ''], queryFn: () => api.get('/users/branch').then((r) => r.data) });
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState<any>({ name: '', productId: '', lot: '', flowId: '', organizationId: '', assignedUserId: '', startDate: today, endDate: today, note: '' });

  const create = useApiMutation(
    () => api.post('/trace-tasks', { ...f, flowId: f.flowId || undefined, organizationId: f.organizationId || undefined, name: f.name || undefined, lot: f.lot || undefined, note: f.note || undefined }),
    { successMessage: 'Đã tạo nhiệm vụ, người phụ trách sẽ thấy khi đăng nhập', invalidate: [['trace-tasks']], onSuccess: () => onClose() },
  );
  const valid = f.productId && f.assignedUserId && f.startDate && f.endDate;

  return (
    <Drawer open onClose={onClose} title={<b>Tạo nhiệm vụ truy xuất</b>}
      footer={<><div className="flex-1" /><button className="btn" onClick={onClose}>Huỷ</button>
        <button className="btn btn-primary" disabled={!valid || create.isPending} onClick={() => create.mutate()}>{create.isPending && <Loader2 size={15} className="animate-spin" />}Tạo</button></>}>
      <label className="block mb-3"><span className="label">Tên nhiệm vụ (tuỳ chọn)</span><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="VD: Kê khai lô tháng 7" /></label>
      <label className="block mb-3"><span className="label">Sản phẩm *</span>
        <select className="input" value={f.productId} onChange={(e) => setF({ ...f, productId: e.target.value })}>
          <option value="">— chọn sản phẩm —</option>
          {(products.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name} ({p.gtin})</option>)}
        </select></label>
      <label className="block mb-3"><span className="label">Lô (tuỳ chọn)</span><input className="input mono" value={f.lot} onChange={(e) => setF({ ...f, lot: e.target.value })} placeholder="LOT-2407-..." /></label>
      <label className="block mb-3"><span className="label">Luồng (tuỳ chọn)</span>
        <select className="input" value={f.flowId} onChange={(e) => setF({ ...f, flowId: e.target.value })}>
          <option value="">— theo Luồng của sản phẩm —</option>
          {(flows.data ?? []).map((fl) => <option key={fl.id} value={fl.id}>{fl.name}</option>)}
        </select></label>
      <label className="block mb-3"><span className="label">Tổ chức (tuỳ chọn)</span>
        <select className="input" value={f.organizationId} onChange={(e) => setF({ ...f, organizationId: e.target.value })}>
          <option value="">— không chỉ định —</option>
          {(orgs.data ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select></label>
      <label className="block mb-3"><span className="label">Người phụ trách kê khai *</span>
        <select className="input" value={f.assignedUserId} onChange={(e) => setF({ ...f, assignedUserId: e.target.value })}>
          <option value="">— chọn người —</option>
          {(users.data ?? []).map((u) => <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>)}
        </select></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="label">Từ ngày *</span><input className="input" type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></label>
        <label className="block"><span className="label">Đến ngày *</span><input className="input" type="date" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></label>
      </div>
      <label className="block mt-3"><span className="label">Ghi chú / hướng dẫn cho người kê khai</span><textarea className="input" rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="VD: Cần kê khai đủ 5 bước, chụp ảnh đóng gói…" /></label>
    </Drawer>
  );
}
