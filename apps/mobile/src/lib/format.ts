export const vnDate = (x?: string | null) => (x ? new Date(x).toLocaleDateString('vi-VN') : '—');
export const vnDateTime = (x?: string | null) =>
  x ? new Date(x).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

export const daysTo = (x?: string | null) => (x ? Math.ceil((new Date(x).getTime() - Date.now()) / 86400000) : 0);
export const isOverdue = (endDate?: string | null, status?: string) =>
  !!endDate && status !== 'DONE' && new Date(endDate).getTime() < Date.now();

export const initials = (name?: string) =>
  (name ?? '?').split(' ').map((w) => w[0]).slice(-2).join('').toUpperCase();
