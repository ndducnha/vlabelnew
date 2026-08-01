import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Loader2, GitBranch, Search, Check, Mail, Building2 } from '../lib/icons';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';
import { useApiMutation } from '../lib/useApiMutation';
import { PageHead, Spinner, Drawer, Avatar, EmptyState, Paginator, usePaged } from '../components/ui';
import type { Organization, Flow } from '@vlabel/shared';

export default function Users() {
  const users = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then((r) => r.data) });
  const roles = useQuery({ queryKey: ['roles'], queryFn: () => api.get('/users/roles').then((r) => r.data) });
  const orgs = useQuery<Organization[]>({ queryKey: ['orgs'], queryFn: () => api.get('/organizations').then((r) => r.data) });

  const [open, setOpen] = useState(false);
  const [flowUser, setFlowUser] = useState<any | null>(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const paged = usePaged<any>(users.data ?? [], (u, ql) => u.fullName.toLowerCase().includes(ql) || (u.email ?? '').toLowerCase().includes(ql), q, page);
  const [form, setForm] = useState({ email: '', fullName: '', password: 'Vlabel@123', organizationId: '', roleKeys: [] as string[] });

  const create = useApiMutation(() => api.post('/users', { ...form, organizationId: form.organizationId || undefined }), {
    successMessage: '✅ Đã tạo người dùng',
    invalidate: [['users']],
    onSuccess: () => { setOpen(false); setForm({ email: '', fullName: '', password: 'Vlabel@123', organizationId: '', roleKeys: [] }); },
  });

  const toggleRole = (k: string) => setForm((f) => ({ ...f, roleKeys: f.roleKeys.includes(k) ? f.roleKeys.filter((x) => x !== k) : [...f.roleKeys, k] }));

  return (
    <>
      <PageHead eyebrow="Phân quyền" title="Người dùng & phân quyền" subtitle={`${users.data?.length ?? 0} người dùng`}
        actions={<>
          <div className="flex items-center gap-2 rounded-full px-3.5 h-10" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
            <Search size={15} className="text-[var(--muted)]" />
            <input className="bg-transparent outline-none text-sm" style={{ width: 190 }} placeholder="Tìm theo tên / email…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          <button className="btn btn-primary" onClick={() => setOpen(true)}><UserPlus size={16} />Mời người dùng</button>
        </>} />

      {users.isLoading ? <Spinner /> : (users.data?.length ?? 0) === 0 ? (
        <div className="card anim-in">
          <EmptyState title="Chưa có người dùng" hint="Mời thành viên đầu tiên để bắt đầu phân quyền."
            action={<button className="btn btn-primary" onClick={() => setOpen(true)}><UserPlus size={16} />Mời người dùng</button>} />
        </div>
      ) : (
        <div className="flex flex-col gap-3 anim-in">
          {paged.total === 0 && <div className="card"><EmptyState title="Không tìm thấy người dùng phù hợp." hint="Thử tìm theo tên hoặc email khác." /></div>}

          {/* Sổ cái cho desktop */}
          {paged.total > 0 && (
            <div className="hidden lg:block overflow-x-auto">
              <table className="ledger text-sm">
                <thead><tr>
                  <th style={{ width: 52 }}>Mục</th>
                  {['Người dùng', 'Vai trò', 'Đơn vị', 'Hành động'].map((h) => <th key={h}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {paged.rows.map((u: any, i: number) => (
                    <tr key={u.id}>
                      <td><span className="ledger-idx">{String((paged.page - 1) * 10 + i + 1).padStart(2, '0')}</span></td>
                      <td>
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={u.fullName} size={34} />
                          <div className="min-w-0">
                            <b className="block truncate">{u.fullName}</b>
                            <div className="text-xs text-[var(--muted)] mono truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          {u.roles.length === 0
                            ? <span className="pill pill-neutral">Chưa gán vai trò</span>
                            : u.roles.map((r: any) => <span key={r.role.key} className="chip chip-accent">{r.role.name}</span>)}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-[13px] text-[var(--muted)] min-w-0">
                          <Building2 size={14} className="flex-none text-[var(--faint)]" />
                          <span className="truncate">{u.organization?.name ?? 'Chưa gán đơn vị'}</span>
                        </div>
                      </td>
                      <td>
                        <button className="btn btn-sm" onClick={() => setFlowUser(u)}>
                          <GitBranch size={13} />Phân quyền
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Card cho mobile */}
          <div className="flex flex-col gap-3 lg:hidden">
            {paged.rows.map((u: any) => (
              <div key={u.id} className="card card-hover p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-3 min-w-0 sm:w-[240px] sm:flex-none">
                  <Avatar name={u.fullName} size={40} />
                  <div className="min-w-0">
                    <div className="font-bold truncate">{u.fullName}</div>
                    <div className="flex items-center gap-1 text-xs text-[var(--muted)] truncate">
                      <Mail size={12} className="flex-none" />
                      <span className="truncate">{u.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                  {u.roles.length === 0
                    ? <span className="pill pill-neutral">Chưa gán vai trò</span>
                    : u.roles.map((r: any) => <span key={r.role.key} className="chip chip-accent">{r.role.name}</span>)}
                </div>

                <div className="flex items-center gap-1.5 text-[13px] text-[var(--muted)] sm:w-[170px] sm:flex-none min-w-0">
                  <Building2 size={14} className="flex-none text-[var(--faint)]" />
                  <span className="truncate">{u.organization?.name ?? 'Chưa gán đơn vị'}</span>
                </div>

                <button className="btn btn-sm sm:flex-none w-full sm:w-auto justify-center" onClick={() => setFlowUser(u)}>
                  <GitBranch size={13} />Phân quyền
                </button>
              </div>
            ))}
          </div>

          <Paginator page={paged.page} pageSize={10} total={paged.total} onPage={setPage} />
        </div>
      )}

      <Drawer open={open} onClose={() => setOpen(false)} title={<b>Mời người dùng</b>}
        footer={<><div className="flex-1" /><button className="btn" onClick={() => setOpen(false)}>Huỷ</button>
          <button className="btn btn-primary" disabled={!form.email || !form.fullName || create.isPending} onClick={() => create.mutate()}>
            {create.isPending && <Loader2 size={15} className="animate-spin" />}Tạo</button></>}>
        <label className="block mb-4"><span className="label">Họ tên</span><input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
        <label className="block mb-4"><span className="label">Email</span><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label className="block mb-4"><span className="label">Mật khẩu tạm</span><input className="input mono" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <label className="block mb-4"><span className="label">Đơn vị</span>
          <select className="input" value={form.organizationId} onChange={(e) => setForm({ ...form, organizationId: e.target.value })}>
            <option value="">Không gán</option>
            {(orgs.data ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select></label>
        <span className="label">Vai trò</span>
        <div className="flex flex-wrap gap-2">
          {(roles.data ?? []).map((r: any) => {
            const on = form.roleKeys.includes(r.key);
            return (
              <button key={r.key} onClick={() => toggleRole(r.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors ${on ? 'chip-accent' : 'chip'}`}>
                {on ? <Check size={14} /> : null}{r.name}
              </button>
            );
          })}
        </div>
      </Drawer>

      {flowUser && <UserFlows user={flowUser} onClose={() => setFlowUser(null)} />}
    </>
  );
}

/** Phân quyền Flow cho một người dùng (chiều ngược: từ user chọn flows). */
function UserFlows({ user, onClose }: { user: any; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const flows = useQuery<Flow[]>({ queryKey: ['flows'], queryFn: () => api.get('/flows').then((r) => r.data) });
  const perms = useQuery({ queryKey: ['user-flows', user.id], queryFn: () => api.get(`/users/${user.id}/flow-permissions`).then((r) => r.data) });
  const inv = () => qc.invalidateQueries({ queryKey: ['user-flows', user.id] });
  const add = useApiMutation((flowId: string) => api.post(`/flows/${flowId}/permissions`, { userId: user.id }), {
    successMessage: 'Đã cấp quyền',
    invalidate: [['user-flows', user.id]],
  });
  const del = useMutation({ mutationFn: (permId: string) => api.delete(`/flow-permissions/${permId}`), onSuccess: () => { toast('Đã gỡ'); inv(); } });
  const permByFlow = new Map((perms.data ?? []).map((p: any) => [p.flow.id, p]));
  const shown = (flows.data ?? []).filter((f) => !q || f.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Drawer open onClose={onClose}
      title={<div className="flex items-center gap-2.5">
        <Avatar name={user.fullName} size={30} />
        <div className="min-w-0">
          <b className="block leading-tight">Phân quyền Luồng</b>
          <div className="text-xs text-[var(--muted)] truncate">{user.fullName}</div>
        </div>
      </div>}>
      <p className="text-sm text-[var(--muted)] mb-3.5">Chọn Luồng mà người này được phép khai báo.</p>
      <div className="flex items-center gap-2 rounded-full px-3.5 py-2.5 mb-4" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
        <Search size={15} className="text-[var(--muted)]" />
        <input className="flex-1 bg-transparent outline-none text-sm" placeholder="Tìm luồng…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {flows.isLoading ? <Spinner /> : (
        <div className="flex flex-col gap-2">
          {shown.map((f) => {
            const perm = permByFlow.get(f.id) as any;
            return (
              <div key={f.id} className="card card-hover flex items-center gap-3 p-3">
                <span className="iconbox" style={{ width: 34, height: 34 }}><GitBranch size={16} /></span>
                <div className="flex-1 min-w-0">
                  <b className="text-[13.5px] block truncate">{f.name}</b>
                  <div className="text-[11.5px] text-[var(--muted)]">{f.versions?.[0]?.eventDefinitions?.length ?? 0} sự kiện</div>
                </div>
                {perm ? <button className="btn btn-sm btn-danger" onClick={() => del.mutate(perm.id)}>Gỡ</button>
                  : <button className="btn btn-sm btn-primary" onClick={() => add.mutate(f.id)}>Cấp quyền</button>}
              </div>
            );
          })}
          {shown.length === 0 && <EmptyState title="Không có Luồng" hint="Không tìm thấy Luồng phù hợp." />}
        </div>
      )}
    </Drawer>
  );
}
