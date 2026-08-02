import { useQuery } from '@tanstack/react-query';
import { Package, GitBranch, QrCode, ScanLine, CheckCircle2, FileEdit } from '../lib/icons';
import { api } from '../lib/api';
import { PageHead, Spinner, ProgressBar } from '../components/ui';
import { useT, type Messages } from '../lib/i18n';

const CARDS = [
  { key: 'products', label: 'Sản phẩm', icon: Package, tone: 'accent' },
  { key: 'flows', label: 'Luồng', icon: GitBranch, tone: 'accent' },
  { key: 'qrCodes', label: 'Mã QR', icon: QrCode, tone: 'accent' },
  { key: 'scans', label: 'Lượt quét', icon: ScanLine, tone: 'good' },
  { key: 'pendingApprovals', label: 'Chờ duyệt', icon: CheckCircle2, tone: 'warn' },
  { key: 'drafts', label: 'Bản nháp', icon: FileEdit, tone: 'warn' },
] as const;

const MSG: Messages = {
  vi: {
    eyebrow: 'Thống kê', title: 'Báo cáo & phân tích', subtitle: 'Thống kê tổng quan hệ thống', compare: 'So sánh chỉ số',
    products: 'Sản phẩm', flows: 'Luồng', qrCodes: 'Mã QR', scans: 'Lượt quét', pendingApprovals: 'Chờ duyệt', drafts: 'Bản nháp',
  },
  en: {
    eyebrow: 'Statistics', title: 'Reports & analytics', subtitle: 'System overview statistics', compare: 'Metric comparison',
    products: 'Products', flows: 'Flow', qrCodes: 'QR codes', scans: 'Scans', pendingApprovals: 'Pending approvals', drafts: 'Drafts',
  },
};

export default function Reports() {
  const t = useT(MSG);
  const q = useQuery<Record<string, number>>({ queryKey: ['stats'], queryFn: () => api.get('/dashboard/stats').then((r) => r.data) });
  if (q.isLoading) return <Spinner />;
  const max = Math.max(1, ...CARDS.map((c) => q.data?.[c.key] ?? 0));
  return (
    <>
      <PageHead eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

      {/* Bản kê chỉ số — khối kẻ ô kiểu sổ cái */}
      <div className="rule rule-strong" style={{ margin: '0 0 0' }} />
      <div className="kpi grid-cols-2 md:grid-cols-3 mb-6" style={{ borderTop: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
        {CARDS.map((c) => {
          const value = q.data?.[c.key] ?? 0;
          return (
            <div key={c.key}>
              <div className="k"><c.icon size={13} />{t(c.key)}</div>
              <div className="v" style={{ color: c.tone === 'warn' && value ? 'var(--warn)' : 'var(--ink)' }}>{value}</div>
            </div>
          );
        })}
      </div>

      <div className="card p-5">
        <div className="eyebrow mb-4">{t('compare')}</div>
        <div className="flex flex-col gap-3.5">
          {CARDS.map((c) => (
            <div key={c.key} className="flex items-center gap-3">
              <span className="text-sm w-28 text-[var(--muted)] flex-none">{t(c.key)}</span>
              <div className="flex-1"><ProgressBar value={((q.data?.[c.key] ?? 0) / max) * 100} /></div>
              <b className="num text-sm w-12 text-right flex-none">{q.data?.[c.key] ?? 0}</b>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
