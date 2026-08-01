import { useQuery } from '@tanstack/react-query';
import { Package, GitBranch, QrCode, ScanLine, CheckCircle2, FileEdit } from '../lib/icons';
import { api } from '../lib/api';
import { PageHead, Spinner, StatCard, ProgressBar } from '../components/ui';

const CARDS = [
  { key: 'products', label: 'Sản phẩm', icon: Package, tone: 'accent' },
  { key: 'flows', label: 'Flow', icon: GitBranch, tone: 'accent' },
  { key: 'qrCodes', label: 'Mã QR', icon: QrCode, tone: 'accent' },
  { key: 'scans', label: 'Lượt quét', icon: ScanLine, tone: 'good' },
  { key: 'pendingApprovals', label: 'Chờ duyệt', icon: CheckCircle2, tone: 'warn' },
  { key: 'drafts', label: 'Bản nháp', icon: FileEdit, tone: 'warn' },
] as const;

export default function Reports() {
  const q = useQuery<Record<string, number>>({ queryKey: ['stats'], queryFn: () => api.get('/dashboard/stats').then((r) => r.data) });
  if (q.isLoading) return <Spinner />;
  const max = Math.max(1, ...CARDS.map((c) => q.data?.[c.key] ?? 0));
  return (
    <>
      <PageHead eyebrow="Thống kê" title="Báo cáo & phân tích" subtitle="Thống kê tổng quan hệ thống" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 mb-5">
        {CARDS.map((c) => (
          <StatCard key={c.key} icon={<c.icon size={16} />} label={c.label} value={<span className="num">{q.data?.[c.key] ?? 0}</span>} tone={c.tone} />
        ))}
      </div>
      <div className="card p-5">
        <h3 className="font-semibold mb-4">So sánh chỉ số</h3>
        <div className="flex flex-col gap-3.5">
          {CARDS.map((c) => (
            <div key={c.key} className="flex items-center gap-3">
              <span className="text-sm w-28 text-[var(--muted)] flex-none">{c.label}</span>
              <div className="flex-1"><ProgressBar value={((q.data?.[c.key] ?? 0) / max) * 100} /></div>
              <b className="num text-sm w-12 text-right flex-none">{q.data?.[c.key] ?? 0}</b>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
