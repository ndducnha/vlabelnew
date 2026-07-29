import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { PageHead, Spinner, EmptyState } from '../components/ui';

export default function Audit() {
  const q = useQuery({ queryKey: ['audit'], queryFn: () => api.get('/audit').then((r) => r.data) });
  return (
    <>
      <PageHead title="Nhật ký hệ thống" subtitle="Toàn bộ hoạt động — bất biến" />
      {q.isLoading ? <Spinner /> : (q.data?.length ?? 0) === 0 ? (
        <div className="card"><EmptyState title="Chưa có hoạt động" /></div>
      ) : (
        <div className="card">
          {q.data.map((a: any) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="w-9 h-9 rounded-full grid place-items-center text-white text-xs font-bold flex-none" style={{ background: 'linear-gradient(135deg,#2F6BFF,#7aa0ff)' }}>
                {(a.actor?.fullName ?? 'HT').split(' ').map((w: string) => w[0]).slice(-2).join('')}
              </div>
              <div className="flex-1 text-sm">
                <b>{a.actor?.fullName ?? 'Hệ thống'}</b> <span className="chip mx-1">{a.action}</span>
                <span className="text-[var(--muted)]">{a.resource}</span>
              </div>
              <time className="text-xs text-[var(--faint)] mono">{new Date(a.createdAt).toLocaleString('vi-VN')}</time>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
