import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Info, Network, Package, GitBranch, ClipboardEdit,
  CalendarClock, Sun, Moon, LogOut, Users as UsersIcon, Tag, LayoutDashboard, FileText, Sparkles, LayoutList, Route as RouteIcon,
} from '../lib/icons';
import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useT, LangToggle, type Messages } from '../lib/i18n';
import { PERMISSIONS } from '@vlabel/shared';

type NavItem = { to: string; key: string; icon: any; end?: boolean; perm?: string };
const SECTIONS: { titleKey: string; items: NavItem[] }[] = [
  {
    titleKey: 'sec.chung',
    items: [
      { to: '/intro', key: 'nav.intro', icon: Info },
      { to: '/org', key: 'nav.org', icon: Network, perm: PERMISSIONS.ORGANIZATION_MANAGE },
      { to: '/users', key: 'nav.users', icon: UsersIcon, perm: PERMISSIONS.USER_MANAGE },
      { to: '/products', key: 'nav.products', icon: Package, perm: PERMISSIONS.PRODUCT_CREATE },
    ],
  },
  {
    titleKey: 'sec.trace',
    items: [
      { to: '/trace-manage', key: 'nav.traceManage', icon: LayoutList, perm: PERMISSIONS.FLOW_MANAGE },
      { to: '/journey', key: 'nav.journey', icon: RouteIcon, perm: PERMISSIONS.PRODUCT_READ },
      { to: '/flows', key: 'nav.flows', icon: GitBranch, perm: PERMISSIONS.FLOW_MANAGE },
      { to: '/entry', key: 'nav.entry', icon: ClipboardEdit, perm: PERMISSIONS.EVENT_RECORD_CREATE },
      { to: '/tasks', key: 'nav.tasks', icon: CalendarClock, perm: PERMISSIONS.EVENT_RECORD_CREATE },
    ],
  },
  {
    titleKey: 'sec.elabel',
    items: [
      { to: '/elabels', key: 'nav.elabels', icon: Tag, perm: PERMISSIONS.PRODUCT_CREATE },
      { to: '/supplementary', key: 'nav.supp', icon: FileText, perm: PERMISSIONS.PRODUCT_READ },
    ],
  },
  {
    titleKey: 'sec.vlabel',
    items: [
      { to: '/helper', key: 'nav.helper', icon: Sparkles, perm: PERMISSIONS.PRODUCT_UPDATE },
      { to: '/', key: 'nav.workspace', icon: LayoutDashboard, end: true },
    ],
  },
];

const MSG: Messages = {
  vi: {
    'sec.chung': 'Chung', 'sec.trace': 'Truy xuất nguồn gốc', 'sec.elabel': 'Nhãn điện tử', 'sec.vlabel': 'VLabel',
    'nav.intro': 'Giới thiệu', 'nav.org': 'Tổ chức', 'nav.users': 'Người dùng', 'nav.products': 'Quản lý sản phẩm',
    'nav.traceManage': 'Quản lý', 'nav.journey': 'Hành trình', 'nav.flows': 'Luồng & Sự kiện', 'nav.entry': 'Kê khai', 'nav.tasks': 'Lịch truy xuất',
    'nav.elabels': 'Quản lý nhãn', 'nav.supp': 'Nhãn phụ', 'nav.helper': 'Trợ lý VLabel', 'nav.workspace': 'Không gian làm việc VLabel',
    tagline: 'Số hóa niềm tin', themeLight: 'Giao diện sáng', themeDark: 'Giao diện tối', logout: 'Đăng xuất',
  },
  en: {
    'sec.chung': 'General', 'sec.trace': 'Traceability', 'sec.elabel': 'E-label', 'sec.vlabel': 'VLabel',
    'nav.intro': 'Introduction', 'nav.org': 'Organizations', 'nav.users': 'Users', 'nav.products': 'Products',
    'nav.traceManage': 'Manage', 'nav.journey': 'Journey', 'nav.flows': 'Flows & Events', 'nav.entry': 'Data entry', 'nav.tasks': 'Trace schedule',
    'nav.elabels': 'Labels', 'nav.supp': 'Supplementary', 'nav.helper': 'VLabel Assistant', 'nav.workspace': 'VLabel Workspace',
    tagline: 'Digitizing trust', themeLight: 'Light theme', themeDark: 'Dark theme', logout: 'Log out',
  },
};

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(-2).join('').toUpperCase();
}

export default function Layout() {
  const { user, logout, can } = useAuth();
  const nav = useNavigate();
  const t = useT(MSG);
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') ?? 'light');

  const sections = SECTIONS
    .map((s) => ({ ...s, items: s.items.filter((n) => !n.perm || can(n.perm)) }))
    .filter((s) => s.items.length > 0);
  const flatItems = sections.flatMap((s) => s.items);
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('vlabel.theme', next);
    setTheme(next);
  };

  return (
    <div className="min-h-screen md:grid" style={{ gridTemplateColumns: '264px 1fr' }}>
      {/* Rail (desktop) */}
      <aside className="hidden md:flex flex-col gap-0.5 p-3 sticky top-0 h-screen"
        style={{ background: 'var(--bg)', borderRight: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5 px-2 pt-2 pb-3.5">
          <img src="/logo.jpg" alt="Vlabel" className="w-8 h-8 rounded-[9px] border" style={{ borderColor: 'var(--border)' }} />
          <div>
            <b className="serif text-[19px] leading-none">Vlabel</b>
            <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--faint)] mt-1" style={{ fontFamily: 'var(--mono)' }}>{t('tagline')}</div>
          </div>
        </div>
        <nav className="flex flex-col gap-0.5">
          {sections.map((s) => (
            <div key={s.titleKey} className="flex flex-col gap-0.5 mb-1.5">
              <div className="px-2.5 pt-2.5 pb-1 text-[10px] font-medium uppercase text-[var(--faint)]" style={{ fontFamily: 'var(--mono)', letterSpacing: '1.4px' }}>{t(s.titleKey)}</div>
              {s.items.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-2.5 rounded-[11px] text-[14.5px] font-medium transition-colors ${isActive ? 'font-semibold' : 'hover:bg-[var(--surface)]'}`}
                  style={({ isActive }) => isActive
                    ? { background: 'var(--accent-soft)', color: 'var(--accent-ink)', boxShadow: 'inset 3px 0 0 var(--accent)' }
                    : { color: 'var(--ink-2)' }}>
                  <n.icon size={19} /> {t(n.key)}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <button onClick={toggleTheme} className="flex-1 flex items-center gap-2.5 px-2.5 py-2.5 rounded-[10px] text-[14.5px] font-medium text-[var(--ink-2)] hover:bg-[var(--surface)]">
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />} {theme === 'dark' ? t('themeLight') : t('themeDark')}
          </button>
          <LangToggle className="btn btn-sm" />
        </div>
        <div className="flex items-center gap-2.5 p-2 rounded-xl mt-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="serif w-8 h-8 rounded-full grid place-items-center text-sm font-bold"
            style={{ color: 'var(--accent-contrast)', background: 'linear-gradient(135deg,var(--accent),var(--accent-2))' }}>{initials(user?.fullName ?? '')}</div>
          <div className="flex-1 min-w-0">
            <b className="block text-[13.5px] truncate">{user?.fullName}</b>
            <span className="text-[11.5px] text-[var(--muted)]">{user?.roles?.[0]}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { logout(); nav('/login'); }} title={t('logout')}><LogOut size={16} /></button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col min-w-0">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 h-14 px-4 sticky top-0 z-30"
          style={{ background: 'color-mix(in srgb,var(--bg) 85%,transparent)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--border)' }}>
          <img src="/logo.jpg" alt="" className="w-7 h-7 rounded-lg border" style={{ borderColor: 'var(--border)' }} />
          <b className="serif text-lg">Vlabel</b>
          <div className="flex-1" />
          <LangToggle className="btn btn-ghost btn-sm" />
          <button onClick={toggleTheme} className="btn btn-ghost btn-sm">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
        </div>

        <main className="px-4 md:px-7 py-5 pb-24 md:pb-10 max-w-[1180px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Bottom tabs (mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex px-1 pt-1.5 pb-[env(safe-area-inset-bottom)]"
        style={{ height: 62, background: 'color-mix(in srgb,var(--bg) 92%,transparent)', backdropFilter: 'blur(16px)', borderTop: '1px solid var(--border)' }}>
        {flatItems.slice(0, 5).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className="flex-1 flex flex-col items-center gap-0.5 py-1 text-[10.5px] font-semibold"
            style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : 'var(--muted)' })}>
            <n.icon size={22} /> {t(n.key)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
