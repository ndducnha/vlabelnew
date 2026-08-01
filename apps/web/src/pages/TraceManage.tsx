import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, GitBranch, Search, CalendarClock, AlertTriangle, ListChecks, ShieldCheck } from '../lib/icons';
import { api } from '../lib/api';
import { PageHead, Spinner, EmptyState, SegmentedControl, Paginator, usePaged } from '../components/ui';
import type { Product, Flow, TraceTask } from '@vlabel/shared';
import { TableRow, CardRow, ProductDetail } from './TraceManage.parts';

const daysBetween = (a: Date, b: Date) => Math.ceil((a.getTime() - b.getTime()) / 864e5);

export default function TraceManage() {
  const products = useQuery<Product[]>({ queryKey: ['products'], queryFn: () => api.get('/products').then((r) => r.data) });
  const elabels = useQuery({ queryKey: ['elabels', ''], queryFn: () => api.get('/elabels').then((r) => r.data) });
  const tasks = useQuery<TraceTask[]>({ queryKey: ['trace-tasks', false], queryFn: () => api.get('/trace-tasks').then((r) => r.data) });
  const flowsAll = useQuery<Flow[]>({ queryKey: ['flows-all'], queryFn: () => api.get('/flows').then((r) => r.data) });

  const [q, setQ] = useState('');
  const [flowFilter, setFlowFilter] = useState<'all' | 'has' | 'none'>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<any>(null);

  const now = new Date();

  // Gộp sản phẩm + số lô (từ elabels) + lịch (trace-tasks) để tính chỉ số quản lý
  const rows = useMemo(() => {
    const elById = new Map<string, any>((elabels.data ?? []).map((e: any) => [e.id, e]));
    const tasksByProduct = new Map<string, TraceTask[]>();
    for (const t of tasks.data ?? []) { const a = tasksByProduct.get(t.product?.id ?? '') ?? []; a.push(t); tasksByProduct.set(t.product?.id ?? '', a); }
    return (products.data ?? []).map((p: Product) => {
      const el = elById.get(p.id);
      const ptasks = tasksByProduct.get(p.id) ?? [];
      const flowCount = (p.flows ?? []).length;
      const doneTasks = ptasks.filter((t) => t.status === 'DONE').length;
      const overdue = ptasks.filter((t) => t.status !== 'DONE' && new Date(t.endDate) < now).length;
      const status = flowCount === 0 ? 'noflow' : overdue > 0 ? 'overdue' : ptasks.length > 0 && doneTasks === ptasks.length ? 'done' : ptasks.length > 0 ? 'active' : 'ready';
      return {
        ...p, el, batchCount: el?.batchCount ?? 0, image: el?.labelImages?.[0]?.url ?? null,
        flowCount, taskCount: ptasks.length, doneTasks, overdue, status,
        pct: ptasks.length ? Math.round((doneTasks / ptasks.length) * 100) : flowCount ? 0 : 0,
      };
    });
  }, [products.data, elabels.data, tasks.data]);

  const filtered = rows.filter((r) => {
    if (flowFilter === 'has' && r.flowCount === 0) return false;
    if (flowFilter === 'none' && r.flowCount > 0) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });
  const paged = usePaged<any>(filtered, (r, ql) => r.name.toLowerCase().includes(ql) || (r.gtin ?? '').includes(ql), q, page);

  // Dashboard
  const totalProducts = rows.length;
  const noFlow = rows.filter((r) => r.flowCount === 0).length;
  const activeFlows = (flowsAll.data ?? []).filter((f) => (f._count?.products ?? 0) > 0).length;
  const allTasks = tasks.data ?? [];
  const dueSoon = allTasks.filter((t) => t.status !== 'DONE' && new Date(t.endDate) >= now && daysBetween(new Date(t.endDate), now) <= 7).length;
  const overdueTasks = allTasks.filter((t) => t.status !== 'DONE' && new Date(t.endDate) < now).length;
  const openTasks = allTasks.filter((t) => t.status !== 'DONE').length;

  const loading = products.isLoading || tasks.isLoading;

  return (
    <>
      <PageHead eyebrow="Truy xuất nguồn gốc" title="Quản lý truy xuất" subtitle="Tổng quan sản phẩm, Luồng, phân công và lịch truy xuất"
        actions={
          <div className="flex items-center gap-2 rounded-full px-3.5 h-10" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
            <Search size={15} className="text-[var(--muted)]" />
            <input className="bg-transparent outline-none text-sm" style={{ width: 200 }} placeholder="Tìm tên / GTIN…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
        } />

      {/* Bản kê chỉ số — khối kẻ ô kiểu sổ cái */}
      <div className="rule rule-strong" style={{ margin: '0 0 0' }} />
      <div className="kpi grid-cols-2 lg:grid-cols-6 mb-6" style={{ borderTop: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
        {[
          { icon: <Package size={13} />, label: 'Tổng sản phẩm', value: totalProducts, color: 'var(--ink)' },
          { icon: <GitBranch size={13} />, label: 'Chưa có Luồng', value: noFlow, color: noFlow ? 'var(--warn)' : 'var(--ink)' },
          { icon: <ShieldCheck size={13} />, label: 'Luồng hoạt động', value: activeFlows, color: 'var(--ink)' },
          { icon: <CalendarClock size={13} />, label: 'Sắp đến hạn', value: dueSoon, color: dueSoon ? 'var(--warn)' : 'var(--ink)' },
          { icon: <AlertTriangle size={13} />, label: 'Quá hạn', value: overdueTasks, color: overdueTasks ? 'var(--danger)' : 'var(--ink)' },
          { icon: <ListChecks size={13} />, label: 'Lịch chưa xong', value: openTasks, color: 'var(--ink)' },
        ].map((k) => (
          <div key={k.label}>
            <div className="k">{k.icon}{k.label}</div>
            <div className="v" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <SegmentedControl value={flowFilter} onChange={(v) => { setFlowFilter(v); setPage(1); }} options={[{ value: 'all', label: 'Tất cả' }, { value: 'has', label: 'Có Luồng' }, { value: 'none', label: 'Chưa Luồng' }]} />
        <select className="input" style={{ width: 180 }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="all">Mọi trạng thái</option>
          <option value="noflow">Chưa có Luồng</option>
          <option value="ready">Sẵn sàng</option>
          <option value="active">Đang khai báo</option>
          <option value="overdue">Có lịch quá hạn</option>
          <option value="done">Đã hoàn thành</option>
        </select>
      </div>

      {loading ? <Spinner /> : paged.total === 0 ? (
        <div className="card"><EmptyState title="Không có sản phẩm" hint="Thử bỏ bớt bộ lọc hoặc tạo sản phẩm ở Quản lý sản phẩm." /></div>
      ) : (
        <>
          {/* Sổ cái cho desktop */}
          <div className="hidden lg:block anim-in overflow-x-auto">
            <table className="ledger text-sm">
              <thead><tr>
                <th style={{ width: 52 }}>Mục</th>
                {['Sản phẩm', 'Luồng', 'Lô', 'Lịch', 'Tiến độ', 'Trạng thái'].map((h) => <th key={h}>{h}</th>)}
              </tr></thead>
              <tbody>
                {paged.rows.map((r: any, i: number) => <TableRow key={r.id} r={r} index={(paged.page - 1) * 10 + i + 1} onOpen={() => setDetail(r)} />)}
              </tbody>
            </table>
          </div>
          {/* Card cho mobile */}
          <div className="flex flex-col gap-3 lg:hidden">
            {paged.rows.map((r: any) => <CardRow key={r.id} r={r} onOpen={() => setDetail(r)} />)}
          </div>
          <Paginator page={paged.page} pageSize={10} total={paged.total} onPage={setPage} />
        </>
      )}

      {detail && <ProductDetail product={detail} onClose={() => setDetail(null)} />}
    </>
  );
}
