import { useQuery } from '@tanstack/react-query';
import { Package, GitBranch, QrCode, ScanLine, CheckCircle2, FileEdit } from 'lucide-react';
import { api } from '../lib/api';
import { PageHead, Spinner } from '../components/ui';

const CARDS = [
  { key: 'products', label: 'Sản phẩm', icon: Package },
  { key: 'flows', label: 'Flow', icon: GitBranch },
  { key: 'qrCodes', label: 'Mã QR', icon: QrCode },
  { key: 'scans', label: 'Lượt quét', icon: ScanLine },
  { key: 'pendingApprovals', label: 'Chờ duyệt', icon: CheckCircle2 },
  { key: 'drafts', label: 'Bản nháp', icon: FileEdit },
] as const;

export default function Reports() {
  const q = useQuery({ queryKey: ['stats'], queryFn: () => api.get('/dashboard/stats').then((r) => r.data) });
  if (q.isLoading) return <Spinner />;
  const max = Math.max(1, ...CARDS.map((c) => q.data?.[c.key] ?? 0));
  return (
    <>
      <PageHead title="Báo cáo & phân tích" subtitle="Thống kê tổng quan hệ thống" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 mb-4">
        {CARDS.map((c) => (
          <div key={c.key} className="card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--muted)]">
              <span className="w-8 h-8 rounded-[9px] grid place-items-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><c.icon size={17} /></span>{c.label}
            </div>
            <div className="text-[28px] font-bold num mt-2">{q.data?.[c.key] ?? 0}</div>
          </div>
        ))}
      </div>
      <div className="card p-5">
        <h3 className="font-semibold mb-4">So sánh chỉ số</h3>
        <div className="flex flex-col gap-3">
          {CARDS.map((c) => (
            <div key={c.key} className="flex items-center gap-3">
              <span className="text-sm w-28 text-[var(--muted)]">{c.label}</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
                <div className="h-full rounded-full" style={{ width: `${((q.data?.[c.key] ?? 0) / max) * 100}%`, background: 'var(--accent)' }} />
              </div>
              <b className="num text-sm w-12 text-right">{q.data?.[c.key] ?? 0}</b>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
