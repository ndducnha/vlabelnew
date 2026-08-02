import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Package, CalendarClock, Tag, ChevronRight, CircleCheck, AlertTriangle } from '../lib/icons';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useT, type Messages } from '../lib/i18n';
import { PERMISSIONS } from '@vlabel/shared';

const MSG: Messages = {
  vi: {
    'action.create.title': 'Tạo mới', 'action.create.sub': 'Truy xuất nguồn gốc · Nhãn điện tử · Nhãn phụ',
    'action.products.title': 'Sản phẩm', 'action.products.sub': '{n} sản phẩm · gắn quy trình, phân công',
    'action.tasks.title': 'Lịch & việc kê khai', 'action.tasks.sub': 'Giao việc, theo dõi tiến độ',
    'action.elabel.title': 'Nhãn điện tử', 'action.elabel.sub': 'Soạn nội dung và phát hành nhãn',
    greeting: 'Xin chào, {name}', youFallback: 'bạn', question: 'Bạn muốn làm gì hôm nay?',
    needAttention: '{n} việc cần chú ý', allStable: 'Mọi thứ ổn định',
    overdue: '{n} lịch quá hạn', noFlow: '{n} sản phẩm chưa có quy trình',
    allGood: 'Không có việc quá hạn hay thiếu quy trình', completed: 'Đã hoàn thành',
  },
  en: {
    'action.create.title': 'Create new', 'action.create.sub': 'Traceability · E-label · Supplementary label',
    'action.products.title': 'Products', 'action.products.sub': '{n} products · attach process, assign',
    'action.tasks.title': 'Schedule & data entry', 'action.tasks.sub': 'Assign work, track progress',
    'action.elabel.title': 'E-label', 'action.elabel.sub': 'Compose content and publish label',
    greeting: 'Hello, {name}', youFallback: 'you', question: 'What would you like to do today?',
    needAttention: '{n} items need attention', allStable: 'Everything is stable',
    overdue: '{n} overdue schedules', noFlow: '{n} products without a process',
    allGood: 'No overdue tasks or missing processes', completed: 'Completed',
  },
};

// Thẻ hành động lớn, dễ bấm - trang chủ đơn giản cho người không rành kỹ thuật.
function ActionCard({ to, icon, title, subtitle }: { to: string; icon: ReactNode; title: string; subtitle: string }) {
  return (
    <Link to={to} className="card card-hover p-4 flex items-center gap-4">
      <span className="iconbox" style={{ width: 52, height: 52, borderRadius: 16 }}>{icon}</span>
      <span className="flex-1 min-w-0">
        <b className="serif text-[17px] block leading-tight">{title}</b>
        <span className="text-[13px] text-[var(--muted)]">{subtitle}</span>
      </span>
      <ChevronRight size={20} className="text-[var(--faint)]" />
    </Link>
  );
}

export default function Home() {
  const { user, can } = useAuth();
  const t = useT(MSG);
  const products = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products').then((r) => r.data) });
  const tasks = useQuery({ queryKey: ['trace-tasks', 'all'], queryFn: () => api.get('/trace-tasks').then((r) => r.data) });

  const nProducts = (products.data ?? []).length;
  const noFlow = (products.data ?? []).filter((p: any) => (p.flows ?? []).length === 0).length;
  const open = (tasks.data ?? []).filter((x: any) => x.status !== 'DONE');
  const overdue = open.filter((x: any) => new Date(x.endDate) < new Date()).length;
  const done = (tasks.data ?? []).filter((x: any) => x.status === 'DONE').length;
  const completion = (tasks.data ?? []).length ? Math.round((done / (tasks.data ?? []).length) * 100) : 0;
  const needAttention = overdue + noFlow;
  const firstName = (user?.fullName ?? '').split(' ').slice(-1)[0] || t('youFallback');

  const actions = [
    { to: '/helper', icon: <Sparkles size={24} />, title: t('action.create.title'), subtitle: t('action.create.sub'), perm: PERMISSIONS.PRODUCT_UPDATE },
    { to: '/products', icon: <Package size={24} />, title: t('action.products.title'), subtitle: t('action.products.sub', { n: nProducts }), perm: PERMISSIONS.PRODUCT_CREATE },
    { to: '/tasks', icon: <CalendarClock size={24} />, title: t('action.tasks.title'), subtitle: t('action.tasks.sub'), perm: PERMISSIONS.EVENT_RECORD_CREATE },
    { to: '/elabels', icon: <Tag size={24} />, title: t('action.elabel.title'), subtitle: t('action.elabel.sub'), perm: PERMISSIONS.PRODUCT_CREATE },
  ].filter((a) => !a.perm || can(a.perm));

  return (
    <>
      <div className="mb-6">
        <span className="eyebrow mb-1.5">{t('greeting', { name: firstName })}</span>
        <h1 className="serif text-[28px] font-bold leading-tight">{t('question')}</h1>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-8">
        {actions.map((a) => (
          <ActionCard key={a.to} to={a.to} icon={a.icon} title={a.title} subtitle={a.subtitle} />
        ))}
      </div>

      <div className="card p-5 max-w-[560px]">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center rounded-2xl flex-none" style={{ width: 46, height: 46, background: needAttention ? 'var(--warn-soft)' : 'var(--good-soft)', color: needAttention ? 'var(--warn)' : 'var(--good)' }}>
            {needAttention ? <AlertTriangle size={22} /> : <CircleCheck size={22} />}
          </span>
          <div className="flex-1 min-w-0">
            <b className="text-[15px]">{needAttention ? t('needAttention', { n: needAttention }) : t('allStable')}</b>
            <div className="text-[13px] text-[var(--muted)] mt-0.5">
              {needAttention
                ? [overdue ? t('overdue', { n: overdue }) : '', noFlow ? t('noFlow', { n: noFlow }) : ''].filter(Boolean).join(' · ')
                : t('allGood')}
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--hairline)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] text-[var(--muted)]">{t('completed')}</span>
            <span className="serif font-bold text-[17px]" style={{ color: 'var(--accent)' }}>{completion}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${completion}%`, background: 'linear-gradient(90deg,var(--accent),var(--accent-2))' }} />
          </div>
        </div>
      </div>
    </>
  );
}
