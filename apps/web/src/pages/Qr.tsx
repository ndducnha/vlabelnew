import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, Link2 } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { PageHead, Spinner, StatusPill, Drawer } from '../components/ui';
import { PERMISSIONS, validateGtin } from '@vlabel/shared';

export default function Qr() {
  const { can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [gtin, setGtin] = useState('8938505970017');
  const [lot, setLot] = useState('LOT-2407-92');
  const [quantity, setQuantity] = useState(100);
  const [preview, setPreview] = useState<{ dataUrl: string; url: string } | null>(null);

  const list = useQuery({ queryKey: ['qr'], queryFn: () => api.get('/qr').then((r) => r.data) });
  const [assignQr, setAssignQr] = useState<any | null>(null);
  const items = useQuery({ queryKey: ['items'], enabled: !!assignQr, queryFn: () => api.get('/traceable-items').then((r) => r.data) });
  const assign = useMutation({
    mutationFn: ({ qrId, itemId }: { qrId: string; itemId: string }) => api.post(`/qr/${qrId}/assign`, { traceableItemId: itemId }),
    onSuccess: () => { toast('Đã gán QR cho lô'); setAssignQr(null); qc.invalidateQueries({ queryKey: ['qr'] }); },
    onError: (e) => toast(apiError(e), false),
  });

  const [csv, setCsv] = useState('');
  const gen = useMutation({
    mutationFn: () => api.post('/qr/generate', { gtin: validateGtin(gtin).normalized, lot, quantity }),
    onSuccess: (r) => { toast(`🎉 Đã sinh ${r.data.generated} mã QR`); qc.invalidateQueries({ queryKey: ['qr'] }); },
    onError: (e) => toast(apiError(e), false),
  });
  const imp = useMutation({
    mutationFn: () => api.post('/qr/import-csv', { csv }),
    onSuccess: (r) => { toast(`Đã import ${r.data.generated} mã (${r.data.skipped} dòng lỗi)`); setCsv(''); qc.invalidateQueries({ queryKey: ['qr'] }); },
    onError: (e) => toast(apiError(e), false),
  });
  const showPng = async (id: string) => {
    const { data } = await api.get(`/qr/${id}/png`);
    setPreview({ dataUrl: data.dataUrl, url: data.url });
  };
  const setStatus = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => api.post(`/qr/${id}/${action}`),
    onSuccess: () => { toast('Đã cập nhật'); qc.invalidateQueries({ queryKey: ['qr'] }); },
  });

  const gv = validateGtin(gtin);

  return (
    <>
      <PageHead title="Mã QR" subtitle="Sinh, gán, theo dõi lượt quét" />
      <div className="grid lg:grid-cols-[1fr_300px] gap-4">
        <div className="flex flex-col gap-4">
          {can(PERMISSIONS.QR_MANAGE) && (
            <div className="card p-5">
              <h3 className="font-semibold mb-3">Sinh mã hàng loạt</h3>
              <div className="grid sm:grid-cols-2 gap-3.5">
                <label className="block"><span className="label">GTIN</span><input className="input mono" value={gtin} onChange={(e) => setGtin(e.target.value)} />
                  {!gv.valid && gtin && <span className="text-xs text-[var(--danger)]">{gv.message}</span>}</label>
                <label className="block"><span className="label">Lô</span><input className="input mono" value={lot} onChange={(e) => setLot(e.target.value)} /></label>
                <label className="block"><span className="label">Số lượng</span><input className="input num" type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} /></label>
              </div>
              <button className="btn btn-primary mt-4" disabled={!gv.valid || gen.isPending} onClick={() => gen.mutate()}>
                {gen.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}Sinh QR
              </button>
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="label">Import hàng loạt từ CSV <span className="text-[var(--faint)] font-normal">(gtin,lot,serial,quantity)</span></span>
                <textarea className="input mono min-h-[64px]" placeholder="8938505970011,LOT-A,,100&#10;8935001234562,LOT-B,,50" value={csv} onChange={(e) => setCsv(e.target.value)} />
                <button className="btn mt-2" disabled={!csv.trim() || imp.isPending} onClick={() => imp.mutate()}>{imp.isPending ? <Loader2 size={15} className="animate-spin" /> : null}Import CSV</button>
              </div>
            </div>
          )}
          <div className="card overflow-x-auto">
            {list.isLoading ? <Spinner /> : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-[var(--faint)]">
                  <th className="px-4 py-3 font-bold">GTIN / Lô</th><th className="px-4 py-3 font-bold">Quét</th>
                  <th className="px-4 py-3 font-bold">Trạng thái</th><th className="px-4 py-3 font-bold"></th></tr></thead>
                <tbody>
                  {(list.data ?? []).map((q: any) => (
                    <tr key={q.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td className="px-4 py-3"><b className="mono">{q.gtin}</b><div className="text-xs text-[var(--muted)] mono">{q.lot ?? q.serial ?? '—'}</div></td>
                      <td className="px-4 py-3 num">{q._count?.scanLogs ?? 0}</td>
                      <td className="px-4 py-3"><StatusPill status={q.status} /></td>
                      <td className="px-4 py-3 flex gap-1.5">
                        <button className="btn btn-sm" onClick={() => showPng(q.id)}>QR</button>
                        {can(PERMISSIONS.QR_MANAGE) && <button className="btn btn-sm" onClick={() => setAssignQr(q)}><Link2 size={13} />Gán</button>}
                        {can(PERMISSIONS.QR_MANAGE) && q.status === 'ACTIVE' && <button className="btn btn-sm btn-danger" onClick={() => setStatus.mutate({ id: q.id, action: 'revoke' })}>Thu hồi</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="card p-5 text-center h-fit">
          <h3 className="font-semibold mb-3">Xem trước</h3>
          {preview ? (
            <>
              <img src={preview.dataUrl} alt="QR" className="w-44 h-44 mx-auto rounded-2xl border" style={{ borderColor: 'var(--border)' }} />
              <div className="mono text-[11px] text-[var(--faint)] mt-3 break-all">{preview.url}</div>
              <a className="btn btn-sm mt-3 inline-flex" href={preview.dataUrl} download="qr.png">Tải PNG</a>
            </>
          ) : <p className="text-sm text-[var(--muted)] py-8">Nhấp “QR” ở một dòng để xem mã.</p>}
        </div>
      </div>
      <Drawer open={!!assignQr} onClose={() => setAssignQr(null)}
        title={assignQr && <><b>Gán QR cho lô</b><div className="text-xs text-[var(--muted)] mono">{assignQr.gtin} {assignQr.lot ?? ''}</div></>}>
        <p className="text-sm text-[var(--muted)] mb-3">Chọn lô (traceable item) để gán mã QR này.</p>
        {items.isLoading ? <Spinner /> : (
          <div className="flex flex-col gap-2">
            {(items.data ?? []).map((it: any) => (
              <button key={it.id} className="flex items-center gap-3 p-2.5 rounded-[10px] text-left" style={{ border: '1px solid var(--border)' }}
                onClick={() => assignQr && assign.mutate({ qrId: assignQr.id, itemId: it.id })}>
                <div className="flex-1"><b className="text-[13.5px]">{it.product?.name}</b><div className="text-[11.5px] text-[var(--muted)] mono">{it.batchOrLot ?? it.serialNumber ?? it.gtin}</div></div>
                <Link2 size={15} className="text-[var(--accent)]" />
              </button>
            ))}
            {(items.data ?? []).length === 0 && <p className="text-sm text-[var(--muted)]">Chưa có lô nào.</p>}
          </div>
        )}
      </Drawer>
    </>
  );
}
