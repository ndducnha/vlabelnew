import { createContext, useContext, useState, type ReactNode } from 'react';
import { Check, X } from './icons';

type Toast = { id: number; msg: string; ok: boolean };
const Ctx = createContext<(msg: string, ok?: boolean) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = (msg: string, ok = true) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, msg, ok }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 2600);
  };
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] flex flex-col items-center gap-2">
        {items.map((t) => (
          <div key={t.id} className="flex items-center gap-2.5 rounded-full px-4 py-2.5 text-[13.5px] font-semibold shadow-lg"
            style={{ background: 'var(--ink)', color: 'var(--bg)' }}>
            <span className="grid place-items-center w-5 h-5 rounded-full text-white"
              style={{ background: t.ok ? 'var(--good)' : 'var(--danger)' }}>
              {t.ok ? <Check size={12} /> : <X size={12} />}
            </span>
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
