import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from '../lib/icons';
import { api } from '../lib/api';
import { useApiMutation } from '../lib/useApiMutation';
import { PageHead, Spinner, EmptyState } from '../components/ui';
import { FIELD_TYPES } from '@vlabel/shared';
import { useT, type Messages } from '../lib/i18n';

const MSG: Messages = {
  vi: {
    catCreated: 'Đã tạo danh mục',
    fieldAdded: 'Đã thêm trường',
    eyebrow: 'Danh mục',
    title: 'Danh mục & trường động',
    subtitle: 'Cấu hình trường động cho từng danh mục sản phẩm',
    lblCatName: 'Tên danh mục',
    phCatName: 'Rau củ',
    lblCode: 'Mã',
    addCat: 'Thêm danh mục',
    emptyTitle: 'Chưa có danh mục',
    emptyHint: 'Tạo danh mục đầu tiên bằng biểu mẫu phía trên.',
    products: 'sản phẩm',
    dynFields: 'Trường động',
    reqSuffix: ' · bắt buộc',
    pubSuffix: ' · công khai',
    noFields: 'Chưa có trường.',
    lblKey: 'Khoá',
    lblLabel: 'Nhãn',
    lblType: 'Loại',
    addField: 'Thêm trường',
  },
  en: {
    catCreated: 'Category created',
    fieldAdded: 'Field added',
    eyebrow: 'Category',
    title: 'Categories & dynamic fields',
    subtitle: 'Configure dynamic fields for each product category',
    lblCatName: 'Category name',
    phCatName: 'Vegetables',
    lblCode: 'Code',
    addCat: 'Add category',
    emptyTitle: 'No categories yet',
    emptyHint: 'Create the first category using the form above.',
    products: 'products',
    dynFields: 'Dynamic fields',
    reqSuffix: ' · required',
    pubSuffix: ' · public',
    noFields: 'No fields yet.',
    lblKey: 'Key',
    lblLabel: 'Label',
    lblType: 'Type',
    addField: 'Add field',
  },
};

export default function Categories() {
  const t = useT(MSG);
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then((r) => r.data) });
  const [newCat, setNewCat] = useState({ name: '', code: '' });
  const [field, setField] = useState<Record<string, { key: string; label: string; type: string; required: boolean; publicVisible: boolean }>>({});

  const createCat = useApiMutation(() => api.post('/categories', newCat), {
    successMessage: t('catCreated'),
    invalidate: [['categories']],
    onSuccess: () => setNewCat({ name: '', code: '' }),
  });
  const addField = useApiMutation(({ id, f }: { id: string; f: any }) => api.post(`/categories/${id}/fields`, f), {
    successMessage: t('fieldAdded'),
    invalidate: [['categories']],
  });
  const delField = useMutation({
    mutationFn: (fid: string) => api.delete(`/categories/fields/${fid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });

  const f = (id: string) => field[id] ?? { key: '', label: '', type: 'text', required: false, publicVisible: false };

  return (
    <>
      <PageHead eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />
      <div className="card p-4 mb-5 flex flex-wrap gap-2 items-end">
        <label className="block"><span className="label">{t('lblCatName')}</span><input className="input" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} placeholder={t('phCatName')} /></label>
        <label className="block"><span className="label">{t('lblCode')}</span><input className="input mono" value={newCat.code} onChange={(e) => setNewCat({ ...newCat, code: e.target.value })} placeholder="RAU-CU" /></label>
        <button className="btn btn-primary" disabled={!newCat.name || !newCat.code || createCat.isPending} onClick={() => createCat.mutate()}><Plus size={16} />{t('addCat')}</button>
      </div>

      {list.isLoading ? <Spinner /> : (list.data?.length ?? 0) === 0 ? (
        <div className="card"><EmptyState title={t('emptyTitle')} hint={t('emptyHint')} /></div>
      ) : (
        <div className="flex flex-col gap-4">
          {(list.data ?? []).map((c: any) => (
            <div key={c.id} className="card p-5" style={{ boxShadow: 'none' }}>
              <div className="flex items-center gap-2 mb-3">
                <b className="text-base">{c.name}</b><span className="chip mono">{c.code}</span>
                <span className="text-xs text-[var(--muted)]"><span className="num">{c._count?.products ?? 0}</span> {t('products')}</span>
              </div>
              <div className="eyebrow mb-2">{t('dynFields')}</div>
              <div className="rows mb-3">
                {(c.fields ?? []).map((fl: any) => (
                  <div key={fl.id} className="flex items-center gap-3 py-2.5">
                    <div className="flex-1"><b className="text-[13.5px]">{fl.label}</b> <span className="mono text-xs text-[var(--muted)]">{fl.key}</span>
                      <div className="text-[11.5px] text-[var(--muted)]"><span className="mono">{fl.type}</span>{fl.required ? t('reqSuffix') : ''}{fl.publicVisible ? t('pubSuffix') : ''}</div></div>
                    <button className="btn btn-sm btn-danger" onClick={() => delField.mutate(fl.id)}><Trash2 size={14} /></button>
                  </div>
                ))}
                {(c.fields ?? []).length === 0 && <p className="text-sm text-[var(--muted)] py-2.5">{t('noFields')}</p>}
              </div>
              <div className="flex flex-wrap gap-2 items-end p-3 rounded-xl" style={{ background: 'var(--surface)' }}>
                <label className="block"><span className="label">{t('lblKey')}</span><input className="input mono w-28" value={f(c.id).key} onChange={(e) => setField({ ...field, [c.id]: { ...f(c.id), key: e.target.value } })} /></label>
                <label className="block"><span className="label">{t('lblLabel')}</span><input className="input w-32" value={f(c.id).label} onChange={(e) => setField({ ...field, [c.id]: { ...f(c.id), label: e.target.value } })} /></label>
                <label className="block"><span className="label">{t('lblType')}</span>
                  <select className="input" value={f(c.id).type} onChange={(e) => setField({ ...field, [c.id]: { ...f(c.id), type: e.target.value } })}>
                    {FIELD_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select></label>
                <button className="btn" disabled={!f(c.id).key || !f(c.id).label}
                  onClick={() => addField.mutate({ id: c.id, f: f(c.id) })}><Plus size={15} />{t('addField')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
