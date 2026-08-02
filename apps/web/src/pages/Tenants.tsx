import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Plus, Loader2 } from '../lib/icons';
import { api } from '../lib/api';
import { useApiMutation } from '../lib/useApiMutation';
import { PageHead, Spinner, Drawer, EmptyState } from '../components/ui';
import { useT, type Messages } from '../lib/i18n';

const MSG: Messages = {
  vi: {
    eyebrow: 'Khách hàng',
    title: 'Quản lý Khách hàng',
    subtitle: 'Tiếp nhận khách hàng (tỉnh / doanh nghiệp)',
    createBtn: 'Tạo khách hàng',
    createSuccess: '🎉 Đã tạo khách hàng · admin {email}',
    emptyTitle: 'Chưa có khách hàng',
    emptyHint: 'Tạo khách hàng đầu tiên để tiếp nhận.',
    colItem: 'Mục',
    colCustomer: 'Khách hàng',
    colCode: 'Mã',
    colUnit: 'Đơn vị',
    colUser: 'Người dùng',
    colProduct: 'Sản phẩm',
    drawerTitle: 'Tạo khách hàng mới',
    cancel: 'Huỷ',
    create: 'Tạo',
    secOrg: 'Tổ chức',
    lblName: 'Tên khách hàng',
    lblCode: 'Mã (duy nhất)',
    lblRootOrg: 'Tên đơn vị gốc (tầng 1)',
    phRootOrg: '(mặc định = tên tenant)',
    secAdmin: 'Tài khoản superadmin tầng 1',
    lblFullName: 'Họ tên',
    lblEmail: 'Email',
    lblPassword: 'Mật khẩu',
  },
  en: {
    eyebrow: 'Customer',
    title: 'Customer Management',
    subtitle: 'Onboard customers (province / enterprise)',
    createBtn: 'Create customer',
    createSuccess: '🎉 Customer created · admin {email}',
    emptyTitle: 'No customers yet',
    emptyHint: 'Create the first customer to onboard.',
    colItem: 'Item',
    colCustomer: 'Customer',
    colCode: 'Code',
    colUnit: 'Units',
    colUser: 'Users',
    colProduct: 'Products',
    drawerTitle: 'Create new customer',
    cancel: 'Cancel',
    create: 'Create',
    secOrg: 'Organization',
    lblName: 'Customer name',
    lblCode: 'Code (unique)',
    lblRootOrg: 'Root unit name (tier 1)',
    phRootOrg: '(default = tenant name)',
    secAdmin: 'Tier 1 superadmin account',
    lblFullName: 'Full name',
    lblEmail: 'Email',
    lblPassword: 'Password',
  },
};

export default function Tenants() {
  const t = useT(MSG);
  const list = useQuery({ queryKey: ['tenants'], queryFn: () => api.get('/tenants').then((r) => r.data) });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', rootOrgName: '', adminName: '', adminEmail: '', adminPassword: 'Vlabel@123' });

  const create = useApiMutation(() => api.post('/tenants', form), {
    successMessage: (r) => t('createSuccess', { email: r.data.admin.email }),
    invalidate: [['tenants']],
    onSuccess: () => setOpen(false),
  });

  return (
    <>
      <PageHead eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')}
        actions={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={16} />{t('createBtn')}</button>} />
      {list.isLoading ? <Spinner /> : (list.data?.length ?? 0) === 0 ? (
        <div className="card"><EmptyState title={t('emptyTitle')} hint={t('emptyHint')}
          action={<button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}><Plus size={15} />{t('createBtn')}</button>} /></div>
      ) : (
        <div className="anim-in overflow-x-auto">
          <table className="ledger text-sm">
            <thead><tr>
              <th style={{ width: 52 }}>{t('colItem')}</th>
              <th>{t('colCustomer')}</th><th>{t('colCode')}</th><th>{t('colUnit')}</th><th>{t('colUser')}</th><th>{t('colProduct')}</th>
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

      <Drawer open={open} onClose={() => setOpen(false)} title={<b>{t('drawerTitle')}</b>}
        footer={<><div className="flex-1" /><button className="btn" onClick={() => setOpen(false)}>{t('cancel')}</button>
          <button className="btn btn-primary" disabled={!form.name || !form.code || !form.adminEmail || create.isPending} onClick={() => create.mutate()}>
            {create.isPending && <Loader2 size={15} className="animate-spin" />}{t('create')}</button></>}>
        <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--faint)] mb-2">{t('secOrg')}</div>
        <label className="block mb-3"><span className="label">{t('lblName')}</span><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="UBND Tỉnh Lâm Đồng" /></label>
        <label className="block mb-3"><span className="label">{t('lblCode')}</span><input className="input mono" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="LAMDONG" /></label>
        <label className="block mb-4"><span className="label">{t('lblRootOrg')}</span><input className="input" value={form.rootOrgName} onChange={(e) => setForm({ ...form, rootOrgName: e.target.value })} placeholder={t('phRootOrg')} /></label>
        <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--faint)] mb-2">{t('secAdmin')}</div>
        <label className="block mb-3"><span className="label">{t('lblFullName')}</span><input className="input" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} /></label>
        <label className="block mb-3"><span className="label">{t('lblEmail')}</span><input className="input" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} placeholder="admin@lamdong.gov.vn" /></label>
        <label className="block"><span className="label">{t('lblPassword')}</span><input className="input mono" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} /></label>
      </Drawer>
    </>
  );
}
