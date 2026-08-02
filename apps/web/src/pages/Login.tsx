import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { apiError } from '../lib/api';
import { useT, type Messages } from '../lib/i18n';
import { Loader2, ShieldCheck, ArrowRight } from '../lib/icons';

const DEMO = [
  { label: 'demo.superadmin', email: 'superadmin@vlabel.vn' },
  { label: 'demo.admin', email: 'admin@vlabel.vn' },
  { label: 'demo.manager', email: 'manager@vlabel.vn' },
  { label: 'demo.keKhai', email: 'user@vlabel.vn' },
];

const MSG: Messages = {
  vi: {
    tagline: 'Chuẩn hóa dữ liệu · Số hóa niềm tin', signIn: 'Đăng nhập', signInSub: 'Truy cập không gian làm việc của bạn.',
    email: 'Email', password: 'Mật khẩu', signingIn: 'Đang đăng nhập…', demoAccounts: 'Tài khoản demo · mật khẩu Vlabel@123',
    'demo.superadmin': 'Superadmin', 'demo.admin': 'Admin', 'demo.manager': 'Quản lý', 'demo.keKhai': 'Kê khai',
  },
  en: {
    tagline: 'Standardizing data · Digitizing trust', signIn: 'Sign in', signInSub: 'Access your workspace.',
    email: 'Email', password: 'Password', signingIn: 'Signing in…', demoAccounts: 'Demo accounts · password Vlabel@123',
    'demo.superadmin': 'Superadmin', 'demo.admin': 'Admin', 'demo.manager': 'Manager', 'demo.keKhai': 'Data entry',
  },
};

export default function Login() {
  const { login } = useAuth();
  const t = useT(MSG);
  const nav = useNavigate();
  const [email, setEmail] = useState('manager@vlabel.vn');
  const [password, setPassword] = useState('Vlabel@123');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      await login(email, password);
      nav('/');
    } catch (e2) {
      setErr(apiError(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-5" style={{ background: 'var(--surface)' }}>
      <div className="w-full max-w-[420px] anim-in">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-7">
          <img src="/logo.jpg" alt="Vlabel" className="w-14 h-14 rounded-2xl border mb-4" style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }} />
          <b className="serif text-[34px] leading-none">Vlabel</b>
          <span className="eyebrow mt-3">{t('tagline')}</span>
        </div>

        {/* Form card */}
        <form onSubmit={submit} className="card p-6 sm:p-7">
          <h1 className="serif text-2xl font-bold">{t('signIn')}</h1>
          <p className="text-sm text-[var(--muted)] mt-1 mb-6">{t('signInSub')}</p>

          <label className="block mb-4">
            <span className="label">{t('email')}</span>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" placeholder="ban@vlabel.vn" />
          </label>
          <label className="block mb-5">
            <span className="label">{t('password')}</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••" />
          </label>

          {err && <div className="mb-4 text-sm px-3 py-2.5 rounded-[10px] pill-bad anim-in">{err}</div>}

          <button className="btn btn-primary btn-lg" disabled={busy}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : null}
            {busy ? t('signingIn') : <>{t('signIn')} <ArrowRight size={18} /></>}
          </button>
        </form>

        {/* Demo accounts */}
        <div className="mt-5">
          <div className="flex items-center gap-2 mb-2.5 px-1">
            <ShieldCheck size={14} className="text-[var(--faint)]" />
            <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--faint)]">{t('demoAccounts')}</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {DEMO.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => { setEmail(d.email); setPassword('Vlabel@123'); }}
                className={`opt ${email === d.email ? 'sel' : ''}`}
                style={{ minHeight: 56, paddingTop: 10, paddingBottom: 10 }}
              >
                <span className="iconbox" style={{ width: 32, height: 32 }}>{t(d.label)[0]}</span>
                <span className="flex flex-col min-w-0">
                  <b className="text-[13.5px] leading-tight">{t(d.label)}</b>
                  <span className="text-[11.5px] text-[var(--muted)] truncate">{d.email}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
