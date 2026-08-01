import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Package, CalendarClock, Tag, ChevronRight, CircleCheck, AlertTriangle } from '../lib/icons';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { PERMISSIONS } from '@vlabel/shared';

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
  const products = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products').then((r) => r.data) });
  const tasks = useQuery({ queryKey: ['trace-tasks', 'all'], queryFn: () => api.get('/trace-tasks').then((r) => r.data) });

  const nProducts = (products.data ?? []).length;
  const noFlow = (products.data ?? []).filter((p: any) => (p.flows ?? []).length === 0).length;
  const open = (tasks.data ?? []).filter((x: any) => x.status !== 'DONE');
  const overdue = open.filter((x: any) => new Date(x.endDate) < new Date()).length;
  const done = (tasks.data ?? []).filter((x: any) => x.status === 'DONE').length;
  const completion = (tasks.data ?? []).length ? Math.round((done / (tasks.data ?? []).length) * 100) : 0;
  const needAttention = overdue + noFlow;
  const firstName = (user?.fullName ?? '').split(' ').slice(-1)[0] || 'bạn';

  const actions = [
    { to: '/helper', icon: <Sparkles size={24} />, title: 'Tạo mới', subtitle: 'Truy xuất nguồn gốc · Nhãn điện tử · Nhãn phụ', perm: PERMISSIONS.PRODUCT_UPDATE },
    { to: '/products', icon: <Package size={24} />, title: 'Sản phẩm', subtitle: `${nProducts} sản phẩm · gắn quy trình, phân công`, perm: PERMISSIONS.PRODUCT_CREATE },
    { to: '/tasks', icon: <CalendarClock size={24} />, title: 'Lịch & việc kê khai', subtitle: 'Giao việc, theo dõi tiến độ', perm: PERMISSIONS.EVENT_RECORD_CREATE },
    { to: '/elabels', icon: <Tag size={24} />, title: 'Nhãn điện tử', subtitle: 'Soạn nội dung và phát hành nhãn', perm: PERMISSIONS.PRODUCT_CREATE },
  ].filter((a) => !a.perm || can(a.perm));

  return (
    <>
      <div className="mb-6">
        <span className="eyebrow mb-1.5">Xin chào, {firstName}</span>
        <h1 className="serif text-[28px] font-bold leading-tight">Bạn muốn làm gì hôm nay?</h1>
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
            <b className="text-[15px]">{needAttention ? `${needAttention} việc cần chú ý` : 'Mọi thứ ổn định'}</b>
            <div className="text-[13px] text-[var(--muted)] mt-0.5">
              {needAttention
                ? [overdue ? `${overdue} lịch quá hạn` : '', noFlow ? `${noFlow} sản phẩm chưa có quy trình` : ''].filter(Boolean).join(' · ')
                : 'Không có việc quá hạn hay thiếu quy trình'}
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--hairline)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] text-[var(--muted)]">Đã hoàn thành</span>
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
