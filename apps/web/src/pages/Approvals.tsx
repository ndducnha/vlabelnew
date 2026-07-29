import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Edit3, Lock } from 'lucide-react';
import { api, apiError, fileUrl } from '../lib/api';
import { useToast } from '../lib/toast';
import { PageHead, Spinner, EmptyState, StatusPill } from '../components/ui';

export default function Approvals() {
  const toast = useToast();
  const qc = useQueryClient();
  const [view, setView] = useState<'pending' | 'approved'>('pending');
  const q = useQuery({ queryKey: ['approvals', view], queryFn: () => api.get(`/approvals/${view}`).then((r) => r.data) });
  const [comments, setComments] = useState<Record<string, string>>({});

  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => api.post(`/approvals/${id}/${action}`, { comment: comments[id] }),
    onSuccess: (_d, v) => {
      const msg: Record<string, string> = { approve: '✅ Đã duyệt', reject: 'Đã từ chối', 'request-changes': '↩️ Đã yêu cầu sửa', lock: '🔒 Đã khoá' };
      toast(msg[v.action] ?? 'Đã xử lý', v.action !== 'reject');
      qc.invalidateQueries({ queryKey: ['approvals'] });
    },
    onError: (e) => toast(apiError(e), false),
  });

  return (
    <>
      <PageHead title="Duyệt hồ sơ" subtitle="Phê duyệt & khoá dữ liệu sau duyệt"
        actions={
          <div className="inline-flex rounded-[10px] p-0.5 gap-0.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {(['pending', 'approved'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className="px-3 py-1.5 rounded-lg text-[13px] font-semibold"
                style={view === v ? { background: 'var(--bg)', color: 'var(--ink)' } : { color: 'var(--muted)' }}>
                {v === 'pending' ? 'Chờ duyệt' : 'Đã duyệt'}
              </button>
            ))}
          </div>
        } />
      {q.isLoading ? <Spinner /> : (q.data?.length ?? 0) === 0 ? (
        <div className="card"><EmptyState title={view === 'pending' ? 'Không có hồ sơ chờ duyệt' : 'Chưa có hồ sơ đã duyệt'} /></div>
      ) : (
        <div className="flex flex-col gap-4">
          {q.data.map((r: any) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-center gap-3 mb-3.5">
                <div className="w-14 h-14 rounded-2xl grid place-items-center text-2xl flex-none" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>📦</div>
                <div className="flex-1">
                  <h3 className="font-semibold">{r.traceableItem?.product?.name}</h3>
                  <div className="text-sm text-[var(--muted)]">Lô <span className="mono">{r.traceableItem?.batchOrLot ?? '—'}</span> · Sự kiện <b>{r.eventDefinition?.name}</b></div>
                </div>
                <StatusPill status={r.status} />
              </div>
              <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-xl mb-3" style={{ background: 'var(--surface)' }}>
                {(r.values ?? []).map((v: any) => (
                  <div key={v.id}><div className="text-[11.5px] text-[var(--muted)]">{v.fieldKey}</div><b className="text-sm">{String(v.valueJson)}</b></div>
                ))}
              </div>
              {(r.media ?? []).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {r.media.map((m: any) => m.kind === 'image'
                    ? <img key={m.id} src={fileUrl(m.url)} alt="" className="w-16 h-16 rounded-lg object-cover border" style={{ borderColor: 'var(--border)' }} />
                    : <a key={m.id} href={fileUrl(m.url)} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-lg grid place-items-center text-[10px] border" style={{ borderColor: 'var(--border)' }}>{m.kind}</a>)}
                </div>
              )}
              <div className="text-sm text-[var(--muted)] mb-3">Gửi bởi <b className="text-[var(--ink-2)]">{r.enteredBy?.fullName}</b></div>
              {view === 'pending' ? (
                <div className="flex gap-2 flex-wrap items-center">
                  <button className="btn btn-primary" onClick={() => act.mutate({ id: r.id, action: 'approve' })}><Check size={16} />Duyệt</button>
                  <button className="btn" onClick={() => act.mutate({ id: r.id, action: 'request-changes' })}><Edit3 size={15} />Yêu cầu sửa</button>
                  <button className="btn btn-danger" onClick={() => act.mutate({ id: r.id, action: 'reject' })}><X size={15} />Từ chối</button>
                  <input className="input flex-1 min-w-[140px]" placeholder="Nhận xét…" value={comments[r.id] ?? ''} onChange={(e) => setComments((s) => ({ ...s, [r.id]: e.target.value }))} />
                </div>
              ) : (
                <div className="flex gap-2">
                  {r.status === 'APPROVED'
                    ? <button className="btn" onClick={() => act.mutate({ id: r.id, action: 'lock' })}><Lock size={15} />Khoá dữ liệu</button>
                    : <span className="pill pill-good"><i />Đã khoá — bất biến</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
