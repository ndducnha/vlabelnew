import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Plus, Loader2 } from '../lib/icons';
import { api } from '../lib/api';
import { useApiMutation } from '../lib/useApiMutation';
import { PageHead, Spinner, Drawer, EmptyState } from '../components/ui';

export default function Tenants() {
  const list = useQuery({ queryKey: ['tenants'], queryFn: () => api.get('/tenants').then((r) => r.data) });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', rootOrgName: '', adminName: '', adminEmail: '', adminPassword: 'Vlabel@123' });

  const create = useApiMutation(() => api.post('/tenants', form), {
    successMessage: (r) => `🎉 Đã tạo khách hàng · admin ${r.data.admin.email}`,
    invalidate: [['tenants']],
    onSuccess: () => setOpen(false),
  });

  return (
    <>
      <PageHead eyebrow="Khách hàng" title="Quản lý Khách hàng" subtitle="Tiếp nhận khách hàng (tỉnh / doanh nghiệp)"
        actions={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={16} />Tạo khách hàng</button>} />
      {list.isLoading ? <Spinner /> : (list.data?.length ?? 0) === 0 ? (
        <div className="card"><EmptyState title="Chưa có khách hàng" hint="Tạo khách hàng đầu tiên để tiếp nhận."
          action={<button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}><Plus size={15} />Tạo khách hàng</button>} /></div>
      ) : (
        <div className="anim-in overflow-x-auto">
          <table className="ledger text-sm">
            <thead><tr>
              <th style={{ width: 52 }}>Mục</th>
              <th>Khách hàng</th><th>Mã</th><th>Đơn vị</th><th>Người dùng</th><th>Sản phẩm</th>
            </tr></thead>
            <tbody>
              {(list.data ?? []).map((t: any, i: number) => (
                <tr key={t.id}>
                  <td><span className="ledger-idx">{String(i + 1).padStart(2, '0')}</span></td>
                  <td><span className="font-semibold flex items-center gap-2"><Building2 size={16} className="text-[var(--accent)]" />{t.name}</span></td>
                  <td className="mono text-[var(--muted)]">{t.code}</td>
                  <td className="num">{t._count?.organizations ?? 0}</td>
                  <td className="num">{t._count?.users ?? 0}</td>
                  <td className="num">{t._count?.products ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={open} onClose={() => setOpen(false)} title={<b>Tạo khách hàng mới</b>}
        footer={<><div className="flex-1" /><button className="btn" onClick={() => setOpen(false)}>Huỷ</button>
          <button className="btn btn-primary" disabled={!form.name || !form.code || !form.adminEmail || create.isPending} onClick={() => create.mutate()}>
            {create.isPending && <Loader2 size={15} className="animate-spin" />}Tạo</button></>}>
        <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--faint)] mb-2">Tổ chức</div>
        <label className="block mb-3"><span className="label">Tên khách hàng</span><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="UBND Tỉnh Lâm Đồng" /></label>
        <label className="block mb-3"><span className="label">Mã (duy nhất)</span><input className="input mono" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="LAMDONG" /></label>
        <label className="block mb-4"><span className="label">Tên đơn vị gốc (tầng 1)</span><input className="input" value={form.rootOrgName} onChange={(e) => setForm({ ...form, rootOrgName: e.target.value })} placeholder="(mặc định = tên tenant)" /></label>
        <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--faint)] mb-2">Tài khoản superadmin tầng 1</div>
        <label className="block mb-3"><span className="label">Họ tên</span><input className="input" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} /></label>
        <label className="block mb-3"><span className="label">Email</span><input className="input" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} placeholder="admin@lamdong.gov.vn" /></label>
        <label className="block"><span className="label">Mật khẩu</span><input className="input mono" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} /></label>
      </Drawer>
    </>
  );
}
