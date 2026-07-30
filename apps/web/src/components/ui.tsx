import type { ReactNode } from 'react';
import { Loader2, Inbox, X } from 'lucide-react';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-[var(--muted)]">
      <Loader2 className="animate-spin" size={18} /> {label ?? 'Đang tải…'}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-12 px-5 text-[var(--muted)]">
      <div className="w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-3.5" style={{ background: 'var(--surface)' }}>
        <Inbox size={26} className="text-[var(--faint)]" />
      </div>
      <b className="text-[var(--ink)]">{title}</b>
      {hint && <p className="mt-1.5 text-sm">{hint}</p>}
      {action && <div className="mt-3.5">{action}</div>}
    </div>
  );
}

export function PageHead({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-end gap-3.5 mb-5 flex-wrap">
      <div>
        <h2 className="text-[23px] font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-[var(--muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="ml-auto flex gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

const STATUS: Record<string, { cls: string; label: string }> = {
  DRAFT: { cls: 'pill-warn', label: 'Nháp' },
  SUBMITTED: { cls: 'pill-neutral', label: 'Chờ duyệt' },
  APPROVED: { cls: 'pill-good', label: 'Đã duyệt' },
  REJECTED: { cls: 'pill-bad', label: 'Từ chối' },
  CHANGES_REQUESTED: { cls: 'pill-warn', label: 'Cần sửa' },
  LOCKED: { cls: 'pill-good', label: 'Đã khóa' },
  ACTIVE: { cls: 'pill-good', label: 'Hoạt động' },
  REVOKED: { cls: 'pill-bad', label: 'Thu hồi' },
};
export function StatusPill({ status }: { status: string }) {
  const s = STATUS[status] ?? { cls: 'pill-neutral', label: status };
  return <span className={`pill ${s.cls}`}><i />{s.label}</span>;
}

export function StatCard({ icon, label, value, tone = 'accent' }: { icon?: ReactNode; label: string; value: ReactNode; tone?: 'accent' | 'good' | 'warn' | 'danger' }) {
  const bg = { accent: 'var(--accent-soft)', good: 'var(--good-soft)', warn: 'var(--warn-soft)', danger: 'var(--danger-soft)' }[tone];
  const fg = { accent: 'var(--accent)', good: 'var(--good)', warn: 'var(--warn)', danger: 'var(--danger)' }[tone];
  return (
    <div className="stat">
      <div className="flex items-center gap-2">
        {icon && <span className="iconbox" style={{ width: 30, height: 30, background: bg, color: fg }}>{icon}</span>}
        <span className="k">{label}</span>
      </div>
      <span className="v">{value}</span>
    </div>
  );
}

export function SegmentedControl<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="seg">
      {options.map((o) => <button key={o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>)}
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: 'linear-gradient(90deg,var(--accent),var(--accent-2))' }} />
    </div>
  );
}

export function Paginator({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 mt-5">
      <button className="btn btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Trước</button>
      <span className="text-sm text-[var(--muted)]">Trang {page}/{pages} · {total} mục</span>
      <button className="btn btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Sau →</button>
    </div>
  );
}

// Hook lọc theo từ khóa + phân trang phía client (dùng cho các trang quản lý).
export function usePaged<T>(items: T[], match: (it: T, q: string) => boolean, q: string, page: number, pageSize = 10) {
  const filtered = q.trim() ? items.filter((it) => match(it, q.trim().toLowerCase())) : items;
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safe = Math.min(page, pages);
  const rows = filtered.slice((safe - 1) * pageSize, safe * pageSize);
  return { rows, total, page: safe, pages };
}

export function Avatar({ name, size = 32 }: { name?: string; size?: number }) {
  const initials = (name ?? '?').split(' ').map((w) => w[0]).slice(-2).join('').toUpperCase();
  return (
    <span className="rounded-full grid place-items-center text-white font-bold flex-none" style={{ width: size, height: size, fontSize: size * 0.36, background: 'linear-gradient(135deg,var(--accent),var(--accent-2))' }}>{initials}</span>
  );
}

export function Drawer({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode;
}) {
  return (
    <>
      <div onClick={onClose}
        className={`fixed inset-0 z-[60] transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(8,12,22,.42)' }} />
      <aside
        className={`fixed top-0 right-0 h-full w-[440px] max-w-[94vw] z-[70] flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'var(--bg)', borderLeft: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center gap-3 px-4.5 py-4 px-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex-1 font-semibold">{title}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
        {footer && <div className="p-4 flex gap-2" style={{ borderTop: '1px solid var(--border)' }}>{footer}</div>}
      </aside>
    </>
  );
}
