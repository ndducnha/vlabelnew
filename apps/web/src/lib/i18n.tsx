import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// i18n gọn nhẹ, không phụ thuộc thư viện. Mỗi file khai báo bảng chuỗi cục bộ (co-located)
// dạng { vi: {...}, en: {...} } rồi dùng `const t = useT(MSG)`. Ngôn ngữ là state toàn cục.
export type Lang = 'vi' | 'en';
export type Messages = { vi: Record<string, string>; en: Record<string, string> };

const KEY = 'vlabel.lang';

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: 'vi', setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = (typeof localStorage !== 'undefined' && localStorage.getItem(KEY)) as Lang | null;
    return saved === 'en' || saved === 'vi' ? saved : 'vi';
  });
  const setLang = useCallback((l: Lang) => {
    try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
    if (typeof document !== 'undefined') document.documentElement.lang = l;
    setLangState(l);
  }, []);
  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}

// Trả về hàm dịch t(key, vars?) gắn với bảng chuỗi của file. Hỗ trợ nội suy {biến}.
// Fallback: ngôn ngữ hiện tại -> tiếng Việt -> chính key.
export function useT(messages: Messages) {
  const { lang } = useLang();
  return useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const table = messages[lang] ?? messages.vi;
      let s = table[key] ?? messages.vi[key] ?? key;
      if (vars) for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
      return s;
    },
    [lang, messages],
  );
}

// Nút chuyển ngôn ngữ VI/EN.
export function LangToggle({ className = 'btn btn-sm btn-ghost' }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <button type="button" className={className} onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')} title="Ngôn ngữ / Language" aria-label="Chuyển ngôn ngữ">
      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: 1 }}>{lang === 'vi' ? 'VI' : 'EN'}</span>
    </button>
  );
}
