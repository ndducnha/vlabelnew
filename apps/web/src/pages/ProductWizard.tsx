import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Check, Loader2, ChevronRight, ChevronLeft, GitBranch, Search, Package, Building2, Eye } from '../lib/icons';
import type { Flow, Organization } from '@vlabel/shared';
import { api, apiError } from '../lib/api';
import { useToast } from '../lib/toast';
import { PageHead, Spinner, ProgressBar } from '../components/ui';

const STEPS = ['Chọn GTIN', 'Xem trước', 'Đơn vị', 'Flow', 'Xác nhận'];

export default function ProductWizard() {
  const nav = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<any>(null); // VNPC product
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [flowId, setFlowId] = useState('');

  const vnpc = useQuery({ queryKey: ['vnpc', q], queryFn: () => api.get('/integrations/vnpc/products', { params: { q } }).then((r) => r.data) });
  const orgs = useQuery<Organization[]>({ queryKey: ['orgs'], queryFn: () => api.get('/organizations').then((r) => r.data) });
  const flows = useQuery<Flow[]>({ queryKey: ['flows-all'], queryFn: () => api.get('/flows').then((r) => r.data) });

  const create = useMutation({
    mutationFn: async () => {
      const res = await api.post('/products', { gtin: picked.gtin, name, description, organizationId, dynamicAttributes: picked.attributes ?? {} });
      if (flowId && res.data?.id) await api.put(`/products/${res.data.id}/flows`, { flowIds: [flowId] });
      return res;
    },
    onSuccess: () => { toast('🎉 Đã tạo sản phẩm'); nav('/products'); },
    onError: (e) => toast(apiError(e), false),
  });

  const pick = (p: any) => { setPicked(p); setName(p.name); setDescription(p.description ?? ''); };

  const canNext =
    (step === 1 && !!picked) ||
    (step === 2 && !!name) ||
    (step === 3 && !!organizationId) ||
    step === 4;

  return (
    <>
      <PageHead eyebrow="Sản phẩm" title="Tạo sản phẩm" subtitle={`Bước ${step}/5 · ${STEPS[step - 1]}`}
        actions={<button className="btn btn-ghost" onClick={() => nav('/products')}>Huỷ</button>} />

      {/* Progress (mobile-first) */}
      <div className="mb-6">
        <ProgressBar value={(step / STEPS.length) * 100} />
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-6">
        {/* Steps rail */}
        <ol className="hidden md:flex flex-col gap-0.5">
          {STEPS.map((s, i) => {
            const done = i + 1 < step;
            const active = i + 1 === step;
            return (
              <li key={s}>
                <div className="flex items-center gap-3 rounded-[12px] px-2.5 py-2 transition-colors"
                  style={active ? { background: 'var(--accent-soft)' } : undefined}>
                  <span className="w-7 h-7 grid place-items-center rounded-full text-xs font-bold flex-none transition-all"
                    style={done ? { background: 'var(--good)', color: '#fff' } : active ? { background: 'var(--accent)', color: '#fff', boxShadow: '0 0 0 3px var(--accent-soft)' } : { border: '2px solid var(--border-strong)', color: 'var(--muted)' }}>
                    {done ? <Check size={13} /> : i + 1}
                  </span>
                  <span className={`text-[13.5px] font-semibold ${active ? 'text-[var(--accent-ink)]' : done ? '' : 'text-[var(--muted)]'}`}>{s}</span>
                </div>
              </li>
            );
          })}
        </ol>

        <div>
          <div className="card p-5 sm:p-6 min-h-[360px]">
            {/* STEP 1: chọn GTIN từ VNPC */}
            {step === 1 && (
              <div className="anim-in">
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="iconbox"><Package size={18} /></span>
                  <h3 className="font-bold text-[15px]">Chọn GTIN từ VNPC</h3>
                </div>
                <p className="text-sm text-[var(--muted)] mb-4">Tạo sản phẩm là gắn một mã GTIN với tên và thông tin cơ bản. Chọn GTIN có sẵn (dữ liệu mẫu từ VNPC).</p>
                <label className="block">
                  <span className="label">Mã GTIN</span>
                  <div className="relative">
                    <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--faint)] pointer-events-none" />
                    <input className="input pl-10" placeholder="Gõ tên hoặc GTIN để tìm nhanh…" value={q} onChange={(e) => setQ(e.target.value)} />
                  </div>
                </label>
                {vnpc.isFetching ? <div className="py-6"><Spinner /></div> : (
                  <div className="mt-3 flex flex-col gap-2 max-h-[280px] overflow-auto pr-0.5">
                    {(vnpc.data?.items ?? []).map((p: any) => (
                      <button key={p.gtin} onClick={() => pick(p)} className={`opt ${picked?.gtin === p.gtin ? 'sel' : ''}`}>
                        <span className="iconbox" style={{ width: 34, height: 34, background: picked?.gtin === p.gtin ? 'var(--accent)' : 'var(--accent-soft)', color: picked?.gtin === p.gtin ? '#fff' : 'var(--accent)' }}>
                          <Package size={17} />
                        </span>
                        <div className="flex-1 min-w-0"><b className="text-sm block truncate">{p.name}</b><div className="text-xs text-[var(--muted)] truncate">{p.company} · <span className="mono">{p.gtin}</span></div></div>
                        {picked?.gtin === p.gtin && <Check size={17} className="text-[var(--accent)] flex-none" />}
                      </button>
                    ))}
                    {(vnpc.data?.items ?? []).length === 0 && <p className="text-sm text-[var(--muted)] py-2">Không tìm thấy GTIN phù hợp.</p>}
                  </div>
                )}
                {picked && (
                  <div className="mt-4 p-4 rounded-[14px] grid grid-cols-2 gap-3 anim-in" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    {[['Tên', picked.name], ['GTIN', picked.gtin], ['Doanh nghiệp', picked.company], ['Danh mục', picked.category]].map(([k, v]) => (
                      <div key={k as string}><div className="text-[11.5px] text-[var(--muted)] mb-0.5">{k}</div><b className="text-sm">{v ?? '·'}</b></div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: xem trước */}
            {step === 2 && (
              <div className="anim-in">
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="iconbox"><Eye size={18} /></span>
                  <h3 className="font-bold text-[15px]">Xem trước & chỉnh sửa</h3>
                </div>
                <p className="text-sm text-[var(--muted)] mb-5">Dữ liệu lấy từ VNPC. Kiểm tra trước khi lưu.</p>
                <label className="block mb-4"><span className="label">Tên sản phẩm</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
                <label className="block mb-4"><span className="label">Mô tả</span><textarea className="input min-h-[96px]" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
                <label className="block"><span className="label">GTIN</span><input className="input mono" value={picked?.gtin ?? ''} disabled /></label>
              </div>
            )}

            {/* STEP 3: đơn vị */}
            {step === 3 && (
              <div className="anim-in">
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="iconbox"><Building2 size={18} /></span>
                  <h3 className="font-bold text-[15px]">Đơn vị sở hữu</h3>
                </div>
                <p className="text-sm text-[var(--muted)] mb-5">Chọn đơn vị chịu trách nhiệm sản phẩm.</p>
                <div className="grid gap-2.5">
                  {(orgs.data ?? []).map((o) => (
                    <button key={o.id} onClick={() => setOrganizationId(o.id)} className={`opt ${organizationId === o.id ? 'sel' : ''}`}
                      style={{ marginLeft: (o.level ?? 0) * 16 }}>
                      <Building2 size={17} className="text-[var(--accent)] flex-none" />
                      <b className="text-sm flex-1 min-w-0 truncate">{o.name}</b><span className="chip flex-none">Cấp {(o.level ?? 0) + 1}</span>
                      {organizationId === o.id && <Check size={17} className="text-[var(--accent)] flex-none" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: flow (một flow) */}
            {step === 4 && (
              <div className="anim-in">
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="iconbox"><GitBranch size={18} /></span>
                  <h3 className="font-bold text-[15px]">Gán Flow truy xuất</h3>
                </div>
                <p className="text-sm text-[var(--muted)] mb-5">Mỗi sản phẩm chỉ một Flow. Khi kê khai sẽ đi theo Flow này (có thể gán sau ở Quản lý sản phẩm).</p>
                <div className="grid gap-2.5">
                  {(flows.data ?? []).map((f) => (
                    <button key={f.id} onClick={() => setFlowId(flowId === f.id ? '' : f.id)} className={`opt ${flowId === f.id ? 'sel' : ''}`}>
                      <span className="iconbox" style={{ width: 34, height: 34, background: flowId === f.id ? 'var(--accent)' : 'var(--accent-soft)', color: flowId === f.id ? '#fff' : 'var(--accent)' }}>
                        <GitBranch size={17} />
                      </span>
                      <div className="flex-1 min-w-0"><b className="text-sm block truncate">{f.name}</b><div className="text-xs text-[var(--muted)]">{f.versions?.[0]?.eventDefinitions?.length ?? 0} sự kiện</div></div>
                      {flowId === f.id && <Check size={17} className="text-[var(--accent)] flex-none" />}
                    </button>
                  ))}
                  {(flows.data ?? []).length === 0 && <p className="text-sm text-[var(--muted)]">Chưa có Flow nào. Có thể bỏ qua và gán sau.</p>}
                </div>
              </div>
            )}

            {/* STEP 5: xác nhận */}
            {step === 5 && (
              <div className="anim-in">
                <div className="text-center py-3">
                  <div className="w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-3.5 pop" style={{ background: 'var(--good-soft)', color: 'var(--good)' }}><Check size={30} /></div>
                  <h3 className="font-bold text-[16px]">Sẵn sàng tạo sản phẩm</h3>
                  <p className="text-sm text-[var(--muted)] mt-1">Kiểm tra lại thông tin trước khi hoàn tất.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4 rounded-[14px] max-w-[480px] mx-auto mt-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  {[['Tên', name], ['GTIN', picked?.gtin], ['Nguồn', 'VNPC'],
                    ['Đơn vị', (orgs.data ?? []).find((o) => o.id === organizationId)?.name ?? '·'],
                    ['Flow', (flows.data ?? []).find((f) => f.id === flowId)?.name ?? 'Chưa gán']].map(([k, v]) => (
                    <div key={k as string}><div className="text-[11.5px] text-[var(--muted)] mb-0.5">{k}</div><b className="text-sm">{v}</b></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2.5 mt-6 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <button className="btn" disabled={step === 1} onClick={() => setStep((s) => s - 1)}><ChevronLeft size={16} /> Quay lại</button>
            <div className="flex-1" />
            {step < 5
              ? <button className="btn btn-primary" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>Tiếp tục <ChevronRight size={16} /></button>
              : <button className="btn btn-primary" disabled={create.isPending} onClick={() => create.mutate()}>
                  {create.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Hoàn tất & tạo
                </button>}
          </div>
        </div>
      </div>
    </>
  );
}
