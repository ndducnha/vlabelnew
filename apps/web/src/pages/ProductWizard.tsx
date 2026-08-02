import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Check, Loader2, ChevronRight, ChevronLeft, GitBranch, Search, Package, Building2, Eye } from '../lib/icons';
import type { Flow, Organization } from '@vlabel/shared';
import { api, apiError } from '../lib/api';
import { useToast } from '../lib/toast';
import { PageHead, Spinner, ProgressBar } from '../components/ui';
import { useT, type Messages } from '../lib/i18n';

const STEPS = ['step.gtin', 'step.preview', 'step.unit', 'step.flow', 'step.confirm'];

const MSG: Messages = {
  vi: {
    'step.gtin': 'Chọn GTIN',
    'step.preview': 'Xem trước',
    'step.unit': 'Đơn vị',
    'step.flow': 'Luồng',
    'step.confirm': 'Xác nhận',
    'toast.created': '🎉 Đã tạo sản phẩm',
    eyebrow: 'Sản phẩm',
    title: 'Tạo sản phẩm',
    subtitle: 'Bước {step}/5 · {name}',
    cancel: 'Huỷ',
    's1.title': 'Chọn GTIN từ VNPC',
    's1.desc': 'Tạo sản phẩm là gắn một mã GTIN với tên và thông tin cơ bản. Chọn GTIN có sẵn (dữ liệu mẫu từ VNPC).',
    's1.label': 'Mã GTIN',
    's1.ph': 'Gõ tên hoặc GTIN để tìm nhanh…',
    's1.notFound': 'Không tìm thấy GTIN phù hợp.',
    'f.name': 'Tên',
    'f.company': 'Doanh nghiệp',
    'f.category': 'Danh mục',
    's2.title': 'Xem trước & chỉnh sửa',
    's2.desc': 'Dữ liệu lấy từ VNPC. Kiểm tra trước khi lưu.',
    's2.name': 'Tên sản phẩm',
    's2.desc2': 'Mô tả',
    's3.title': 'Đơn vị sở hữu',
    's3.desc': 'Chọn đơn vị chịu trách nhiệm sản phẩm.',
    's3.level': 'Cấp {n}',
    's4.title': 'Gán Luồng truy xuất',
    's4.desc': 'Mỗi sản phẩm chỉ một Luồng. Khi kê khai sẽ đi theo Luồng này (có thể gán sau ở Quản lý sản phẩm).',
    's4.events': '{n} sự kiện',
    's4.empty': 'Chưa có Luồng nào. Có thể bỏ qua và gán sau.',
    's5.title': 'Sẵn sàng tạo sản phẩm',
    's5.desc': 'Kiểm tra lại thông tin trước khi hoàn tất.',
    'f.source': 'Nguồn',
    'f.unit': 'Đơn vị',
    'f.flow': 'Luồng',
    notAssigned: 'Chưa gán',
    back: 'Quay lại',
    next: 'Tiếp tục',
    finish: 'Hoàn tất & tạo',
  },
  en: {
    'step.gtin': 'Choose GTIN',
    'step.preview': 'Preview',
    'step.unit': 'Organization',
    'step.flow': 'Flow',
    'step.confirm': 'Confirm',
    'toast.created': '🎉 Product created',
    eyebrow: 'Product',
    title: 'Create product',
    subtitle: 'Step {step}/5 · {name}',
    cancel: 'Cancel',
    's1.title': 'Choose a GTIN from VNPC',
    's1.desc': 'Creating a product binds a GTIN to a name and basic info. Pick an available GTIN (sample data from VNPC).',
    's1.label': 'GTIN',
    's1.ph': 'Type a name or GTIN to search quickly…',
    's1.notFound': 'No matching GTIN found.',
    'f.name': 'Name',
    'f.company': 'Business',
    'f.category': 'Category',
    's2.title': 'Preview & edit',
    's2.desc': 'Data from VNPC. Review before saving.',
    's2.name': 'Product name',
    's2.desc2': 'Description',
    's3.title': 'Owning organization',
    's3.desc': 'Choose the organization responsible for the product.',
    's3.level': 'Level {n}',
    's4.title': 'Assign a traceability Flow',
    's4.desc': 'One Flow per product. Declarations follow this Flow (you can assign it later in Product management).',
    's4.events': '{n} events',
    's4.empty': 'No Flow yet. You can skip and assign later.',
    's5.title': 'Ready to create the product',
    's5.desc': 'Review the info before finishing.',
    'f.source': 'Source',
    'f.unit': 'Organization',
    'f.flow': 'Flow',
    notAssigned: 'Not assigned',
    back: 'Back',
    next: 'Continue',
    finish: 'Finish & create',
  },
};

export default function ProductWizard() {
  const nav = useNavigate();
  const t = useT(MSG);
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
    onSuccess: () => { toast(t('toast.created')); nav('/products'); },
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
      <PageHead eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle', { step, name: t(STEPS[step - 1]) })}
        actions={<button className="btn btn-ghost" onClick={() => nav('/products')}>{t('cancel')}</button>} />

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
                  <span className={`text-[13.5px] font-semibold ${active ? 'text-[var(--accent-ink)]' : done ? '' : 'text-[var(--muted)]'}`}>{t(s)}</span>
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
                  <h3 className="font-bold text-[15px]">{t('s1.title')}</h3>
                </div>
                <p className="text-sm text-[var(--muted)] mb-4">{t('s1.desc')}</p>
                <label className="block">
                  <span className="label">{t('s1.label')}</span>
                  <div className="relative">
                    <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--faint)] pointer-events-none" />
                    <input className="input pl-10" placeholder={t('s1.ph')} value={q} onChange={(e) => setQ(e.target.value)} />
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
                    {(vnpc.data?.items ?? []).length === 0 && <p className="text-sm text-[var(--muted)] py-2">{t('s1.notFound')}</p>}
                  </div>
                )}
                {picked && (
                  <div className="mt-4 p-4 rounded-[14px] grid grid-cols-2 gap-3 anim-in" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    {[[t('f.name'), picked.name], ['GTIN', picked.gtin], [t('f.company'), picked.company], [t('f.category'), picked.category]].map(([k, v]) => (
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
                  <h3 className="font-bold text-[15px]">{t('s2.title')}</h3>
                </div>
                <p className="text-sm text-[var(--muted)] mb-5">{t('s2.desc')}</p>
                <label className="block mb-4"><span className="label">{t('s2.name')}</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
                <label className="block mb-4"><span className="label">{t('s2.desc2')}</span><textarea className="input min-h-[96px]" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
                <label className="block"><span className="label">GTIN</span><input className="input mono" value={picked?.gtin ?? ''} disabled /></label>
              </div>
            )}

            {/* STEP 3: đơn vị */}
            {step === 3 && (
              <div className="anim-in">
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="iconbox"><Building2 size={18} /></span>
                  <h3 className="font-bold text-[15px]">{t('s3.title')}</h3>
                </div>
                <p className="text-sm text-[var(--muted)] mb-5">{t('s3.desc')}</p>
                <div className="grid gap-2.5">
                  {(orgs.data ?? []).map((o) => (
                    <button key={o.id} onClick={() => setOrganizationId(o.id)} className={`opt ${organizationId === o.id ? 'sel' : ''}`}
                      style={{ marginLeft: (o.level ?? 0) * 16 }}>
                      <Building2 size={17} className="text-[var(--accent)] flex-none" />
                      <b className="text-sm flex-1 min-w-0 truncate">{o.name}</b><span className="chip flex-none">{t('s3.level', { n: (o.level ?? 0) + 1 })}</span>
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
                  <h3 className="font-bold text-[15px]">{t('s4.title')}</h3>
                </div>
                <p className="text-sm text-[var(--muted)] mb-5">{t('s4.desc')}</p>
                <div className="grid gap-2.5">
                  {(flows.data ?? []).map((f) => (
                    <button key={f.id} onClick={() => setFlowId(flowId === f.id ? '' : f.id)} className={`opt ${flowId === f.id ? 'sel' : ''}`}>
                      <span className="iconbox" style={{ width: 34, height: 34, background: flowId === f.id ? 'var(--accent)' : 'var(--accent-soft)', color: flowId === f.id ? '#fff' : 'var(--accent)' }}>
                        <GitBranch size={17} />
                      </span>
                      <div className="flex-1 min-w-0"><b className="text-sm block truncate">{f.name}</b><div className="text-xs text-[var(--muted)]">{t('s4.events', { n: f.versions?.[0]?.eventDefinitions?.length ?? 0 })}</div></div>
                      {flowId === f.id && <Check size={17} className="text-[var(--accent)] flex-none" />}
                    </button>
                  ))}
                  {(flows.data ?? []).length === 0 && <p className="text-sm text-[var(--muted)]">{t('s4.empty')}</p>}
                </div>
              </div>
            )}

            {/* STEP 5: xác nhận */}
            {step === 5 && (
              <div className="anim-in">
                <div className="text-center py-3">
                  <div className="w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-3.5 pop" style={{ background: 'var(--good-soft)', color: 'var(--good)' }}><Check size={30} /></div>
                  <h3 className="font-bold text-[16px]">{t('s5.title')}</h3>
                  <p className="text-sm text-[var(--muted)] mt-1">{t('s5.desc')}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4 rounded-[14px] max-w-[480px] mx-auto mt-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  {[[t('f.name'), name], ['GTIN', picked?.gtin], [t('f.source'), 'VNPC'],
                    [t('f.unit'), (orgs.data ?? []).find((o) => o.id === organizationId)?.name ?? '·'],
                    [t('f.flow'), (flows.data ?? []).find((f) => f.id === flowId)?.name ?? t('notAssigned')]].map(([k, v]) => (
                    <div key={k as string}><div className="text-[11.5px] text-[var(--muted)] mb-0.5">{k}</div><b className="text-sm">{v}</b></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2.5 mt-6 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <button className="btn" disabled={step === 1} onClick={() => setStep((s) => s - 1)}><ChevronLeft size={16} /> {t('back')}</button>
            <div className="flex-1" />
            {step < 5
              ? <button className="btn btn-primary" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>{t('next')} <ChevronRight size={16} /></button>
              : <button className="btn btn-primary" disabled={create.isPending} onClick={() => create.mutate()}>
                  {create.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {t('finish')}
                </button>}
          </div>
        </div>
      </div>
    </>
  );
}
