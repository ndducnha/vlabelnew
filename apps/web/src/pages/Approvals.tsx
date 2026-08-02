import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, X, Edit3, Lock } from '../lib/icons';
import { api, fileUrl } from '../lib/api';
import { useToast } from '../lib/toast';
import { useApiMutation } from '../lib/useApiMutation';
import { PageHead, Spinner, EmptyState, StatusPill, SegmentedControl } from '../components/ui';
import { useT, type Messages } from '../lib/i18n';

const MSG: Messages = {
  vi: {
    eyebrow: 'Kiểm duyệt', title: 'Duyệt hồ sơ', subtitle: 'Phê duyệt & khoá dữ liệu sau duyệt',
    pending: 'Chờ duyệt', approved: 'Đã duyệt',
    emptyPending: 'Không có hồ sơ chờ duyệt', emptyApproved: 'Chưa có hồ sơ đã duyệt',
    lot: 'Lô', event: 'Sự kiện', submittedBy: 'Gửi bởi',
    approve: 'Duyệt', requestChanges: 'Yêu cầu sửa', reject: 'Từ chối', commentPh: 'Nhận xét…',
    lockData: 'Khoá dữ liệu', locked: 'Đã khoá — bất biến',
    toastApprove: '✅ Đã duyệt', toastReject: 'Đã từ chối', toastRequestChanges: '↩️ Đã yêu cầu sửa', toastLock: '🔒 Đã khoá', toastDone: 'Đã xử lý',
  },
  en: {
    eyebrow: 'Review', title: 'Approve records', subtitle: 'Approve & lock data after approval',
    pending: 'Pending', approved: 'Approved',
    emptyPending: 'No records pending approval', emptyApproved: 'No approved records yet',
    lot: 'Lot', event: 'Event', submittedBy: 'Submitted by',
    approve: 'Approve', requestChanges: 'Request changes', reject: 'Reject', commentPh: 'Comment…',
    lockData: 'Lock data', locked: 'Locked · immutable',
    toastApprove: '✅ Approved', toastReject: 'Rejected', toastRequestChanges: '↩️ Changes requested', toastLock: '🔒 Locked', toastDone: 'Processed',
  },
};

export default function Approvals() {
  const toast = useToast();
  const t = useT(MSG);
  const [view, setView] = useState<'pending' | 'approved'>('pending');
  const q = useQuery({ queryKey: ['approvals', view], queryFn: () => api.get(`/approvals/${view}`).then((r) => r.data) });
  const [comments, setComments] = useState<Record<string, string>>({});

  const act = useApiMutation(
    ({ id, action }: { id: string; action: string }) => api.post(`/approvals/${id}/${action}`, { comment: comments[id] }),
    {
      invalidate: [['approvals']],
      onSuccess: (_d, v) => {
        const msg: Record<string, string> = { approve: t('toastApprove'), reject: t('toastReject'), 'request-changes': t('toastRequestChanges'), lock: t('toastLock') };
        toast(msg[v.action] ?? t('toastDone'), v.action !== 'reject');
      },
    },
  );

  return (
    <>
      <PageHead eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')}
        actions={
          <SegmentedControl value={view} onChange={setView} options={[
            { value: 'pending', label: t('pending') },
            { value: 'approved', label: t('approved') },
          ]} />
        } />
      {q.isLoading ? <Spinner /> : (q.data?.length ?? 0) === 0 ? (
        <div className="card"><EmptyState title={view === 'pending' ? t('emptyPending') : t('emptyApproved')} /></div>
      ) : (
        <div className="flex flex-col gap-4">
          {q.data.map((r: any) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-center gap-3 mb-3.5">
                <div className="w-14 h-14 rounded-2xl grid place-items-center text-2xl flex-none" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>📦</div>
                <div className="flex-1">
                  <h3 className="font-semibold">{r.traceableItem?.product?.name}</h3>
                  <div className="text-sm text-[var(--muted)]">{t('lot')} <span className="mono">{r.traceableItem?.batchOrLot ?? '—'}</span> · {t('event')} <b>{r.eventDefinition?.name}</b></div>
                </div>
                <StatusPill status={r.status} />
              </div>
              <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-xl mb-3" style={{ background: 'var(--surface)' }}>
                {(r.values ?? []).map((v: any) => (
                  <div key={v.id}><div className="text-[11.5px] text-[var(--muted)] mono">{v.fieldKey}</div><b className="text-sm">{String(v.valueJson)}</b></div>
                ))}
              </div>
              {(r.media ?? []).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {r.media.map((m: any) => m.kind === 'image'
                    ? <img key={m.id} src={fileUrl(m.url)} alt="" className="w-16 h-16 rounded-lg object-cover border" style={{ borderColor: 'var(--border)' }} />
                    : <a key={m.id} href={fileUrl(m.url)} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-lg grid place-items-center text-[10px] border" style={{ borderColor: 'var(--border)' }}>{m.kind}</a>)}
                </div>
              )}
              <div className="text-sm text-[var(--muted)] mb-3">{t('submittedBy')} <b className="text-[var(--ink-2)]">{r.enteredBy?.fullName}</b></div>
              {view === 'pending' ? (
                <div className="flex gap-2 flex-wrap items-center">
                  <button className="btn btn-primary" onClick={() => act.mutate({ id: r.id, action: 'approve' })}><Check size={16} />{t('approve')}</button>
                  <button className="btn" onClick={() => act.mutate({ id: r.id, action: 'request-changes' })}><Edit3 size={15} />{t('requestChanges')}</button>
                  <button className="btn btn-danger" onClick={() => act.mutate({ id: r.id, action: 'reject' })}><X size={15} />{t('reject')}</button>
                  <input className="input flex-1 min-w-[140px]" placeholder={t('commentPh')} value={comments[r.id] ?? ''} onChange={(e) => setComments((s) => ({ ...s, [r.id]: e.target.value }))} />
                </div>
              ) : (
                <div className="flex gap-2">
                  {r.status === 'APPROVED'
                    ? <button className="btn" onClick={() => act.mutate({ id: r.id, action: 'lock' })}><Lock size={15} />{t('lockData')}</button>
                    : <span className="pill pill-good"><i />{t('locked')}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
