import { useQuery } from '@tanstack/react-query';
import type { UserSummary } from '@vlabel/shared';
import { api } from '../lib/api';
import { PageHead, Spinner, EmptyState, Avatar } from '../components/ui';

interface AuditEntry {
  id: string;
  actor?: UserSummary | null;
  action: string;
  resource: string;
  createdAt: string;
}

export default function Audit() {
  const q = useQuery<AuditEntry[]>({ queryKey: ['audit'], queryFn: () => api.get('/audit').then((r) => r.data) });
  return (
    <>
      <PageHead eyebrow="Kiểm toán" title="Nhật ký hệ thống" subtitle="Toàn bộ hoạt động · bất biến" />
      {q.isLoading ? <Spinner /> : (q.data?.length ?? 0) === 0 ? (
        <div className="card"><EmptyState title="Chưa có hoạt động" hint="Mọi thao tác trên hệ thống sẽ được ghi lại tại đây." /></div>
      ) : (
        <>
          {/* Sổ cái nhật ký cho desktop */}
          <div className="hidden md:block anim-in overflow-x-auto">
            <table className="ledger text-sm">
              <thead><tr>
                <th style={{ width: 52 }}>Mục</th>
                <th style={{ width: 190 }}>Thời gian</th>
                <th>Người</th>
                <th>Hành động</th>
                <th>Đối tượng</th>
              </tr></thead>
              <tbody>
                {(q.data ?? []).map((a, i) => (
                  <tr key={a.id}>
                    <td><span className="ledger-idx">{String(i + 1).padStart(2, '0')}</span></td>
                    <td><span className="num text-xs text-[var(--muted)]">{new Date(a.createdAt).toLocaleString('vi-VN')}</span></td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={a.actor?.fullName ?? 'Hệ thống'} size={28} />
                        <b className="truncate">{a.actor?.fullName ?? 'Hệ thống'}</b>
                      </div>
                    </td>
                    <td><span className="chip">{a.action}</span></td>
                    <td><span className="mono text-[13px] text-[var(--ink-2)] break-all">{a.resource}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Card cho mobile */}
          <div className="card overflow-hidden rows md:hidden">
            {(q.data ?? []).map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3 card-hover">
                <Avatar name={a.actor?.fullName ?? 'Hệ thống'} size={36} />
                <div className="flex-1 text-sm min-w-0">
                  <b>{a.actor?.fullName ?? 'Hệ thống'}</b> <span className="chip mx-1">{a.action}</span>
                  <span className="text-[var(--muted)]">{a.resource}</span>
                </div>
                <time className="text-xs text-[var(--faint)] mono flex-none">{new Date(a.createdAt).toLocaleString('vi-VN')}</time>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
