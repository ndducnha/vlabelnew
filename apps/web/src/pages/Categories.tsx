import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useToast } from '../lib/toast';
import { PageHead, Spinner } from '../components/ui';
import { FIELD_TYPES } from '@vlabel/shared';

export default function Categories() {
  const toast = useToast();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then((r) => r.data) });
  const [newCat, setNewCat] = useState({ name: '', code: '' });
  const [field, setField] = useState<Record<string, { key: string; label: string; type: string; required: boolean; publicVisible: boolean }>>({});

  const createCat = useMutation({
    mutationFn: () => api.post('/categories', newCat),
    onSuccess: () => { toast('Đã tạo danh mục'); setNewCat({ name: '', code: '' }); qc.invalidateQueries({ queryKey: ['categories'] }); },
    onError: (e) => toast(apiError(e), false),
  });
  const addField = useMutation({
    mutationFn: ({ id, f }: { id: string; f: any }) => api.post(`/categories/${id}/fields`, f),
    onSuccess: () => { toast('Đã thêm field'); qc.invalidateQueries({ queryKey: ['categories'] }); },
    onError: (e) => toast(apiError(e), false),
  });
  const delField = useMutation({
    mutationFn: (fid: string) => api.delete(`/categories/fields/${fid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });

  const f = (id: string) => field[id] ?? { key: '', label: '', type: 'text', required: false, publicVisible: false };

  return (
    <>
      <PageHead title="Danh mục & field động" subtitle="Cấu hình field động cho từng danh mục sản phẩm" />
      <div className="card p-4 mb-4 flex flex-wrap gap-2 items-end">
        <label className="block"><span className="label">Tên danh mục</span><input className="input" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} placeholder="Rau củ" /></label>
        <label className="block"><span className="label">Mã</span><input className="input mono" value={newCat.code} onChange={(e) => setNewCat({ ...newCat, code: e.target.value })} placeholder="RAU-CU" /></label>
        <button className="btn btn-primary" disabled={!newCat.name || !newCat.code || createCat.isPending} onClick={() => createCat.mutate()}><Plus size={16} />Thêm danh mục</button>
      </div>

      {list.isLoading ? <Spinner /> : (
        <div className="flex flex-col gap-4">
          {(list.data ?? []).map((c: any) => (
            <div key={c.id} className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <b className="text-base">{c.name}</b><span className="chip mono">{c.code}</span>
                <span className="text-xs text-[var(--muted)]">{c._count?.products ?? 0} sản phẩm</span>
              </div>
              <div className="flex flex-col gap-2 mb-3">
                {(c.fields ?? []).map((fl: any) => (
                  <div key={fl.id} className="flex items-center gap-3 p-2.5 rounded-[10px]" style={{ border: '1px solid var(--border)' }}>
                    <div className="flex-1"><b className="text-[13.5px]">{fl.label}</b> <span className="mono text-xs text-[var(--muted)]">{fl.key}</span>
                      <div className="text-[11.5px] text-[var(--muted)]">{fl.type}{fl.required ? ' · bắt buộc' : ''}{fl.publicVisible ? ' · công khai' : ''}</div></div>
                    <button className="btn btn-sm btn-danger" onClick={() => delField.mutate(fl.id)}><Trash2 size={14} /></button>
                  </div>
                ))}
                {(c.fields ?? []).length === 0 && <p className="text-sm text-[var(--muted)]">Chưa có field.</p>}
              </div>
              <div className="flex flex-wrap gap-2 items-end p-3 rounded-xl" style={{ background: 'var(--surface)' }}>
                <label className="block"><span className="label">Key</span><input className="input mono w-28" value={f(c.id).key} onChange={(e) => setField({ ...field, [c.id]: { ...f(c.id), key: e.target.value } })} /></label>
                <label className="block"><span className="label">Nhãn</span><input className="input w-32" value={f(c.id).label} onChange={(e) => setField({ ...field, [c.id]: { ...f(c.id), label: e.target.value } })} /></label>
                <label className="block"><span className="label">Loại</span>
                  <select className="input" value={f(c.id).type} onChange={(e) => setField({ ...field, [c.id]: { ...f(c.id), type: e.target.value } })}>
                    {FIELD_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select></label>
                <button className="btn" disabled={!f(c.id).key || !f(c.id).label}
                  onClick={() => addField.mutate({ id: c.id, f: f(c.id) })}><Plus size={15} />Thêm field</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
