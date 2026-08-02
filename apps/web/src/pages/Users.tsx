import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Loader2, GitBranch, Search, Check, Mail, Building2 } from '../lib/icons';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';
import { useApiMutation } from '../lib/useApiMutation';
import { PageHead, Spinner, Drawer, Avatar, EmptyState, Paginator, usePaged } from '../components/ui';
import type { Organization, Flow } from '@vlabel/shared';
import { useT, type Messages } from '../lib/i18n';

const MSG: Messages = {
  vi: {
    userCreated: '✅ Đã tạo người dùng',
    eyebrow: 'Phân quyền',
    title: 'Người dùng & phân quyền',
    subtitle: '{n} người dùng',
    searchPh: 'Tìm theo tên / email…',
    invite: 'Mời người dùng',
    emptyTitle: 'Chưa có người dùng',
    emptyHint: 'Mời thành viên đầu tiên để bắt đầu phân quyền.',
    noMatchTitle: 'Không tìm thấy người dùng phù hợp.',
    noMatchHint: 'Thử tìm theo tên hoặc email khác.',
    colItem: 'Mục',
    colUser: 'Người dùng',
    colRole: 'Vai trò',
    colUnit: 'Đơn vị',
    colAction: 'Hành động',
    noRole: 'Chưa gán vai trò',
    noUnit: 'Chưa gán đơn vị',
    permissions: 'Phân quyền',
    cancel: 'Huỷ',
    create: 'Tạo',
    lblFullName: 'Họ tên',
    lblEmail: 'Email',
    lblTempPw: 'Mật khẩu tạm',
    lblUnit: 'Đơn vị',
    notAssigned: 'Không gán',
    accessGranted: 'Đã cấp quyền',
    removed: 'Đã gỡ',
    flowPerm: 'Phân quyền Luồng',
    flowHint: 'Chọn Luồng mà người này được phép khai báo.',
    flowSearchPh: 'Tìm luồng…',
    events: '{n} sự kiện',
    remove: 'Gỡ',
    grant: 'Cấp quyền',
    noFlowTitle: 'Không có Luồng',
    noFlowHint: 'Không tìm thấy Luồng phù hợp.',
  },
  en: {
    userCreated: '✅ User created',
    eyebrow: 'Permissions',
    title: 'Users & permissions',
    subtitle: '{n} users',
    searchPh: 'Search by name / email…',
    invite: 'Invite user',
    emptyTitle: 'No users yet',
    emptyHint: 'Invite the first member to start assigning permissions.',
    noMatchTitle: 'No matching user found.',
    noMatchHint: 'Try a different name or email.',
    colItem: 'Item',
    colUser: 'User',
    colRole: 'Role',
    colUnit: 'Unit',
    colAction: 'Action',
    noRole: 'No role assigned',
    noUnit: 'No unit assigned',
    permissions: 'Permissions',
    cancel: 'Cancel',
    create: 'Create',
    lblFullName: 'Full name',
    lblEmail: 'Email',
    lblTempPw: 'Temporary password',
    lblUnit: 'Unit',
    notAssigned: 'Not assigned',
    accessGranted: 'Access granted',
    removed: 'Removed',
    flowPerm: 'Flow permissions',
    flowHint: 'Select the Flows this person may record.',
    flowSearchPh: 'Search flow…',
    events: '{n} events',
    remove: 'Remove',
    grant: 'Grant',
    noFlowTitle: 'No Flow',
    noFlowHint: 'No matching Flow found.',
  },
};

export default function Users() {
  const t = useT(MSG);
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
    successMessage: t('userCreated'),
    invalidate: [['users']],
    onSuccess: () => { setOpen(false); setForm({ email: '', fullName: '', password: 'Vlabel@123', organizationId: '', roleKeys: [] }); },
  });

  const toggleRole = (k: string) => setForm((f) => ({ ...f, roleKeys: f.roleKeys.includes(k) ? f.roleKeys.filter((x) => x !== k) : [...f.roleKeys, k] }));

  return (
    <>
      <PageHead eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle', { n: users.data?.length ?? 0 })}
        actions={<>
          <div className="flex items-center gap-2 rounded-full px-3.5 h-10" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
            <Search size={15} className="text-[var(--muted)]" />
            <input className="bg-transparent outline-none text-sm" style={{ width: 190 }} placeholder={t('searchPh')} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          <button className="btn btn-primary" onClick={() => setOpen(true)}><UserPlus size={16} />{t('invite')}</button>
        </>} />

      {users.isLoading ? <Spinner /> : (users.data?.length ?? 0) === 0 ? (
        <div className="card anim-in">
          <EmptyState title={t('emptyTitle')} hint={t('emptyHint')}
            action={<button className="btn btn-primary" onClick={() => setOpen(true)}><UserPlus size={16} />{t('invite')}</button>} />
        </div>
      ) : (
        <div className="flex flex-col gap-3 anim-in">
          {paged.total === 0 && <div className="card"><EmptyState title={t('noMatchTitle')} hint={t('noMatchHint')} /></div>}

          {/* Sổ cái cho desktop */}
          {paged.total > 0 && (
            <div className="hidden lg:block overflow-x-auto">
              <table className="ledger text-sm">
                <thead><tr>
                  <th style={{ width: 52 }}>{t('colItem')}</th>
                  {[t('colUser'), t('colRole'), t('colUnit'), t('colAction')].map((h) => <th key={h}>{h}</th>)}
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
                            ? <span className="pill pill-neutral">{t('noRole')}</span>
                            : u.roles.map((r: any) => <span key={r.role.key} className="chip chip-accent">{r.role.name}</span>)}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-[13px] text-[var(--muted)] min-w-0">
                          <Building2 size={14} className="flex-none text-[var(--faint)]" />
                          <span className="truncate">{u.organization?.name ?? t('noUnit')}</span>
                        </div>
                      </td>
                      <td>
                        <button className="btn btn-sm" onClick={() => setFlowUser(u)}>
                          <GitBranch size={13} />{t('permissions')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Card cho màn nhỏ/tablet — xếp dọc, không cột cố định (tránh chồng chữ khi có sidebar) */}
          <div className="flex flex-col gap-3 lg:hidden">
            {paged.rows.map((u: any) => (
              <div key={u.id} className="card card-hover p-4 flex flex-col gap-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={u.fullName} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate">{u.fullName}</div>
                    <div className="flex items-center gap-1 text-xs text-[var(--muted)] min-w-0">
                      <Mail size={12} className="flex-none" />
                      <span className="truncate">{u.email}</span>
                    </div>
                  </div>
                  <button className="btn btn-sm flex-none" onClick={() => setFlowUser(u)}>
                    <GitBranch size={13} />{t('permissions')}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {u.roles.length === 0
                    ? <span className="pill pill-neutral">{t('noRole')}</span>
                    : u.roles.map((r: any) => <span key={r.role.key} className="chip chip-accent">{r.role.name}</span>)}
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-[var(--muted)] min-w-0">
                  <Building2 size={14} className="flex-none text-[var(--faint)]" />
                  <span className="truncate">{u.organization?.name ?? t('noUnit')}</span>
                </div>
              </div>
            ))}
          </div>

          <Paginator page={paged.page} pageSize={10} total={paged.total} onPage={setPage} />
        </div>
      )}

      <Drawer open={open} onClose={() => setOpen(false)} title={<b>{t('invite')}</b>}
        footer={<><div className="flex-1" /><button className="btn" onClick={() => setOpen(false)}>{t('cancel')}</button>
          <button className="btn btn-primary" disabled={!form.email || !form.fullName || create.isPending} onClick={() => create.mutate()}>
            {create.isPending && <Loader2 size={15} className="animate-spin" />}{t('create')}</button></>}>
        <label className="block mb-4"><span className="label">{t('lblFullName')}</span><input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
        <label className="block mb-4"><span className="label">{t('lblEmail')}</span><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label className="block mb-4"><span className="label">{t('lblTempPw')}</span><input className="input mono" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <label className="block mb-4"><span className="label">{t('lblUnit')}</span>
          <select className="input" value={form.organizationId} onChange={(e) => setForm({ ...form, organizationId: e.target.value })}>
            <option value="">{t('notAssigned')}</option>
            {(orgs.data ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select></label>
        <span className="label">{t('colRole')}</span>
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
  const t = useT(MSG);
  const toast = useToast();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const flows = useQuery<Flow[]>({ queryKey: ['flows'], queryFn: () => api.get('/flows').then((r) => r.data) });
  const perms = useQuery({ queryKey: ['user-flows', user.id], queryFn: () => api.get(`/users/${user.id}/flow-permissions`).then((r) => r.data) });
  const inv = () => qc.invalidateQueries({ queryKey: ['user-flows', user.id] });
  const add = useApiMutation((flowId: string) => api.post(`/flows/${flowId}/permissions`, { userId: user.id }), {
    successMessage: t('accessGranted'),
    invalidate: [['user-flows', user.id]],
  });
  const del = useMutation({ mutationFn: (permId: string) => api.delete(`/flow-permissions/${permId}`), onSuccess: () => { toast(t('removed')); inv(); } });
  const permByFlow = new Map((perms.data ?? []).map((p: any) => [p.flow.id, p]));
  const shown = (flows.data ?? []).filter((f) => !q || f.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Drawer open onClose={onClose}
      title={<div className="flex items-center gap-2.5">
        <Avatar name={user.fullName} size={30} />
        <div className="min-w-0">
          <b className="block leading-tight">{t('flowPerm')}</b>
          <div className="text-xs text-[var(--muted)] truncate">{user.fullName}</div>
        </div>
      </div>}>
      <p className="text-sm text-[var(--muted)] mb-3.5">{t('flowHint')}</p>
      <div className="flex items-center gap-2 rounded-full px-3.5 py-2.5 mb-4" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
        <Search size={15} className="text-[var(--muted)]" />
        <input className="flex-1 bg-transparent outline-none text-sm" placeholder={t('flowSearchPh')} value={q} onChange={(e) => setQ(e.target.value)} />
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
                  <div className="text-[11.5px] text-[var(--muted)]">{t('events', { n: f.versions?.[0]?.eventDefinitions?.length ?? 0 })}</div>
                </div>
                {perm ? <button className="btn btn-sm btn-danger" onClick={() => del.mutate(perm.id)}>{t('remove')}</button>
                  : <button className="btn btn-sm btn-primary" onClick={() => add.mutate(f.id)}>{t('grant')}</button>}
              </div>
            );
          })}
          {shown.length === 0 && <EmptyState title={t('noFlowTitle')} hint={t('noFlowHint')} />}
        </div>
      )}
    </Drawer>
  );
}
