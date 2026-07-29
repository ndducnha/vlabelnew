// Làm sạch HTML từ trình soạn thảo để tránh XSS + thay biến động {{...}}.
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  let s = String(html);
  s = s.replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  s = s.replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?\s*>/gi, '');
  s = s.replace(/\son\w+\s*=\s*"[^"]*"/gi, '');
  s = s.replace(/\son\w+\s*=\s*'[^']*'/gi, '');
  s = s.replace(/\son\w+\s*=\s*[^\s>]+/gi, '');
  s = s.replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*("|')/gi, '$1=$2#$3');
  return s;
}

export type VarCtx = {
  product_name?: string; gtin?: string; batch_number?: string;
  manufacturing_date?: string; expiry_date?: string;
  manufacturer_name?: string; manufacturer_address?: string;
  origin?: string; qr_code?: string; // qr_code = thẻ <img> hoặc rỗng
};

export function renderVars(html: string, ctx: VarCtx): string {
  if (!html) return '';
  return html.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, key: string) => {
    const v = (ctx as any)[key.toLowerCase()];
    return v == null ? '' : String(v);
  });
}
