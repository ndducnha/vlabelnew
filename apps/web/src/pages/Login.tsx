import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { apiError } from '../lib/api';
import { Loader2, ShieldCheck, ArrowRight } from 'lucide-react';

const DEMO = [
  { label: 'Superadmin', email: 'superadmin@vlabel.vn' },
  { label: 'Admin', email: 'admin@vlabel.vn' },
  { label: 'Quản lý', email: 'manager@vlabel.vn' },
  { label: 'Kê khai', email: 'user@vlabel.vn' },
];

export default function Login() {
  const { login } = useAuth();
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
          <img src="/logo.jpg" alt="Vlabel" className="w-14 h-14 rounded-2xl border shadow-sm mb-3.5" style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }} />
          <b className="text-2xl tracking-tight leading-none">Vlabel</b>
          <div className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--faint)]">Truy xuất nguồn gốc</div>
        </div>

        {/* Form card */}
        <form onSubmit={submit} className="card p-6 sm:p-7">
          <h1 className="text-xl font-bold tracking-tight">Đăng nhập</h1>
          <p className="text-sm text-[var(--muted)] mt-1 mb-6">Truy cập không gian làm việc của bạn.</p>

          <label className="block mb-4">
            <span className="label">Email</span>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" placeholder="ban@vlabel.vn" />
          </label>
          <label className="block mb-5">
            <span className="label">Mật khẩu</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••" />
          </label>

          {err && <div className="mb-4 text-sm px-3 py-2.5 rounded-[10px] pill-bad anim-in">{err}</div>}

          <button className="btn btn-primary btn-lg" disabled={busy}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : null}
            {busy ? 'Đang đăng nhập…' : <>Đăng nhập <ArrowRight size={18} /></>}
          </button>
        </form>

        {/* Demo accounts */}
        <div className="mt-5">
          <div className="flex items-center gap-2 mb-2.5 px-1">
            <ShieldCheck size={14} className="text-[var(--faint)]" />
            <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--faint)]">Tài khoản demo · mật khẩu Vlabel@123</span>
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
                <span className="iconbox" style={{ width: 32, height: 32 }}>{d.label[0]}</span>
                <span className="flex flex-col min-w-0">
                  <b className="text-[13.5px] leading-tight">{d.label}</b>
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
