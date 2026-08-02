import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, Link2, QrCode } from '../lib/icons';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { useApiMutation } from '../lib/useApiMutation';
import { PageHead, Spinner, StatusPill, Drawer, EmptyState } from '../components/ui';
import { PERMISSIONS, validateGtin } from '@vlabel/shared';
import { useT, type Messages } from '../lib/i18n';

const MSG: Messages = {
  vi: {
    'toast.assigned': 'Đã gán QR cho lô',
    'toast.gen': '🎉 Đã sinh {n} mã QR',
    'toast.imp': 'Đã nhập {n} mã ({skipped} dòng lỗi)',
    'toast.updated': 'Đã cập nhật',
    eyebrow: 'Truy xuất',
    title: 'Mã QR',
    subtitle: 'Sinh, gán, theo dõi lượt quét',
    'gen.title': 'Sinh mã hàng loạt',
    'f.lot': 'Lô',
    'f.quantity': 'Số lượng',
    'gen.btn': 'Sinh QR',
    'csv.label': 'Nhập hàng loạt từ CSV',
    'csv.btn': 'Nhập CSV',
    'empty.title': 'Chưa có mã QR',
    'empty.hint': 'Sinh mã hàng loạt hoặc import CSV để bắt đầu.',
    'col.gtinLot': 'GTIN / Lô',
    'col.scan': 'Quét',
    'col.status': 'Trạng thái',
    'col.action': 'Thao tác',
    assign: 'Gán',
    revoke: 'Thu hồi',
    preview: 'Xem trước',
    downloadPng: 'Tải PNG',
    'preview.hint': 'Nhấp “QR” ở một dòng để xem mã.',
    'assign.title': 'Gán QR cho lô',
    'assign.desc': 'Chọn lô (đối tượng truy xuất) để gán mã QR này.',
    'assign.empty': 'Chưa có lô nào.',
  },
  en: {
    'toast.assigned': 'QR assigned to lot',
    'toast.gen': '🎉 Generated {n} QR codes',
    'toast.imp': 'Imported {n} codes ({skipped} error rows)',
    'toast.updated': 'Updated',
    eyebrow: 'Traceability',
    title: 'QR code',
    subtitle: 'Generate, assign, track scans',
    'gen.title': 'Bulk generate',
    'f.lot': 'Lot',
    'f.quantity': 'Quantity',
    'gen.btn': 'Generate QR',
    'csv.label': 'Bulk import from CSV',
    'csv.btn': 'Import CSV',
    'empty.title': 'No QR codes yet',
    'empty.hint': 'Bulk generate or import CSV to begin.',
    'col.gtinLot': 'GTIN / Lot',
    'col.scan': 'Scans',
    'col.status': 'Status',
    'col.action': 'Action',
    assign: 'Assign',
    revoke: 'Revoke',
    preview: 'Preview',
    downloadPng: 'Download PNG',
    'preview.hint': 'Click “QR” on a row to view the code.',
    'assign.title': 'Assign QR to lot',
    'assign.desc': 'Choose a lot (traceable item) to assign this QR code.',
    'assign.empty': 'No lots yet.',
  },
};

export default function Qr() {
  const { can } = useAuth();
  const t = useT(MSG);
  const toast = useToast();
  const qc = useQueryClient();
  const [gtin, setGtin] = useState('8938505970017');
  const [lot, setLot] = useState('LOT-2407-92');
  const [quantity, setQuantity] = useState(100);
  const [preview, setPreview] = useState<{ dataUrl: string; url: string } | null>(null);

  const list = useQuery({ queryKey: ['qr'], queryFn: () => api.get('/qr').then((r) => r.data) });
  const [assignQr, setAssignQr] = useState<any | null>(null);
  const items = useQuery({ queryKey: ['items'], enabled: !!assignQr, queryFn: () => api.get('/traceable-items').then((r) => r.data) });
  const assign = useApiMutation(({ qrId, itemId }: { qrId: string; itemId: string }) => api.post(`/qr/${qrId}/assign`, { traceableItemId: itemId }), {
    successMessage: t('toast.assigned'),
    invalidate: [['qr']],
    onSuccess: () => setAssignQr(null),
  });

  const [csv, setCsv] = useState('');
  const gen = useApiMutation(() => api.post('/qr/generate', { gtin: validateGtin(gtin).normalized, lot, quantity }), {
    successMessage: (r) => t('toast.gen', { n: r.data.generated }),
    invalidate: [['qr']],
  });
  const imp = useApiMutation(() => api.post('/qr/import-csv', { csv }), {
    successMessage: (r) => t('toast.imp', { n: r.data.generated, skipped: r.data.skipped }),
    invalidate: [['qr']],
    onSuccess: () => setCsv(''),
  });
  const showPng = async (id: string) => {
    const { data } = await api.get(`/qr/${id}/png`);
    setPreview({ dataUrl: data.dataUrl, url: data.url });
  };
  const setStatus = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => api.post(`/qr/${id}/${action}`),
    onSuccess: () => { toast(t('toast.updated')); qc.invalidateQueries({ queryKey: ['qr'] }); },
  });

  const gv = validateGtin(gtin);

  return (
    <>
      <PageHead eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />
      <div className="grid lg:grid-cols-[1fr_300px] gap-4">
        <div className="flex flex-col gap-4">
          {can(PERMISSIONS.QR_MANAGE) && (
            <div className="card p-5">
              <h3 className="font-semibold mb-3">{t('gen.title')}</h3>
              <div className="grid sm:grid-cols-2 gap-3.5">
                <label className="block"><span className="label">GTIN</span><input className="input mono" value={gtin} onChange={(e) => setGtin(e.target.value)} />
                  {!gv.valid && gtin && <span className="text-xs text-[var(--danger)]">{gv.message}</span>}</label>
                <label className="block"><span className="label">{t('f.lot')}</span><input className="input mono" value={lot} onChange={(e) => setLot(e.target.value)} /></label>
                <label className="block"><span className="label">{t('f.quantity')}</span><input className="input num" type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} /></label>
              </div>
              <button className="btn btn-primary mt-4" disabled={!gv.valid || gen.isPending} onClick={() => gen.mutate()}>
                {gen.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}{t('gen.btn')}
              </button>
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="label">{t('csv.label')} <span className="text-[var(--faint)] font-normal">(gtin,lot,serial,quantity)</span></span>
                <textarea className="input mono min-h-[64px]" placeholder="8938505970011,LOT-A,,100&#10;8935001234562,LOT-B,,50" value={csv} onChange={(e) => setCsv(e.target.value)} />
                <button className="btn mt-2" disabled={!csv.trim() || imp.isPending} onClick={() => imp.mutate()}>{imp.isPending ? <Loader2 size={15} className="animate-spin" /> : null}{t('csv.btn')}</button>
              </div>
            </div>
          )}
          {list.isLoading ? <div className="card"><Spinner /></div> : (list.data?.length ?? 0) === 0 ? (
            <div className="card"><EmptyState title={t('empty.title')} hint={t('empty.hint')} /></div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-[var(--faint)]" style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="px-4 py-3 font-bold">{t('col.gtinLot')}</th><th className="px-4 py-3 font-bold">{t('col.scan')}</th>
                  <th className="px-4 py-3 font-bold">{t('col.status')}</th><th className="px-4 py-3 font-bold text-right">{t('col.action')}</th></tr></thead>
                <tbody className="rows">
                  {(list.data ?? []).map((q: any) => (
                    <tr key={q.id} className="card-hover">
                      <td className="px-4 py-3"><b className="mono">{q.gtin}</b><div className="text-xs text-[var(--muted)] mono">{q.lot ?? q.serial ?? '—'}</div></td>
                      <td className="px-4 py-3 num">{q._count?.scanLogs ?? 0}</td>
                      <td className="px-4 py-3"><StatusPill status={q.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 justify-end">
                          <button className="btn btn-sm" onClick={() => showPng(q.id)}><QrCode size={13} />QR</button>
                          {can(PERMISSIONS.QR_MANAGE) && <button className="btn btn-sm" onClick={() => setAssignQr(q)}><Link2 size={13} />{t('assign')}</button>}
                          {can(PERMISSIONS.QR_MANAGE) && q.status === 'ACTIVE' && <button className="btn btn-sm btn-danger" onClick={() => setStatus.mutate({ id: q.id, action: 'revoke' })}>{t('revoke')}</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card p-5 text-center h-fit">
          <h3 className="font-semibold mb-3">{t('preview')}</h3>
          {preview ? (
            <>
              <img src={preview.dataUrl} alt="QR" className="w-44 h-44 mx-auto rounded-2xl border" style={{ borderColor: 'var(--border)' }} />
              <div className="mono text-[11px] text-[var(--faint)] mt-3 break-all">{preview.url}</div>
              <a className="btn btn-sm mt-3 inline-flex" href={preview.dataUrl} download="qr.png">{t('downloadPng')}</a>
            </>
          ) : (
            <div className="py-8 flex flex-col items-center gap-3 text-[var(--muted)]">
              <span className="iconbox" style={{ width: 48, height: 48 }}><QrCode size={22} /></span>
              <p className="text-sm">{t('preview.hint')}</p>
            </div>
          )}
        </div>
      </div>
      <Drawer open={!!assignQr} onClose={() => setAssignQr(null)}
        title={assignQr && <><b>{t('assign.title')}</b><div className="text-xs text-[var(--muted)] mono">{assignQr.gtin} {assignQr.lot ?? ''}</div></>}>
        <p className="text-sm text-[var(--muted)] mb-3">{t('assign.desc')}</p>
        {items.isLoading ? <Spinner /> : (
          <div className="flex flex-col gap-2">
            {(items.data ?? []).map((it: any) => (
              <button key={it.id} className="flex items-center gap-3 p-2.5 rounded-[10px] text-left" style={{ border: '1px solid var(--border)' }}
                onClick={() => assignQr && assign.mutate({ qrId: assignQr.id, itemId: it.id })}>
                <div className="flex-1"><b className="text-[13.5px]">{it.product?.name}</b><div className="text-[11.5px] text-[var(--muted)] mono">{it.batchOrLot ?? it.serialNumber ?? it.gtin}</div></div>
                <Link2 size={15} className="text-[var(--accent)]" />
              </button>
            ))}
            {(items.data ?? []).length === 0 && <p className="text-sm text-[var(--muted)]">{t('assign.empty')}</p>}
          </div>
        )}
      </Drawer>
    </>
  );
}
