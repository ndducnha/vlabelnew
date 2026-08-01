/** Nhãn + tông màu trạng thái dùng chung cho web + mobile (nguồn chân lý duy nhất).
 *  Tông màu là ngữ nghĩa (neutral/good/warn/danger/accent); mỗi nền tảng tự map sang style. */

export type StatusTone = 'neutral' | 'good' | 'warn' | 'danger' | 'accent';
export interface StatusMeta {
  label: string;
  tone: StatusTone;
}

/** Trạng thái lịch truy xuất (trace task). */
export const TRACE_TASK_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
} as const;
export type TraceTaskStatus = (typeof TRACE_TASK_STATUS)[keyof typeof TRACE_TASK_STATUS];

export const RECORD_STATUS_LABELS: Record<string, StatusMeta> = {
  DRAFT: { label: 'Nháp', tone: 'warn' },
  SUBMITTED: { label: 'Chờ duyệt', tone: 'neutral' },
  APPROVED: { label: 'Đã duyệt', tone: 'good' },
  REJECTED: { label: 'Từ chối', tone: 'danger' },
  CHANGES_REQUESTED: { label: 'Cần sửa', tone: 'warn' },
  LOCKED: { label: 'Đã khóa', tone: 'good' },
};

export const QR_STATUS_LABELS: Record<string, StatusMeta> = {
  ACTIVE: { label: 'Hoạt động', tone: 'good' },
  LOCKED: { label: 'Đã khóa', tone: 'good' },
  REVOKED: { label: 'Thu hồi', tone: 'danger' },
};

export const TRACE_TASK_STATUS_LABELS: Record<string, StatusMeta> = {
  PENDING: { label: 'Chưa bắt đầu', tone: 'warn' },
  IN_PROGRESS: { label: 'Đang thực hiện', tone: 'accent' },
  DONE: { label: 'Hoàn thành', tone: 'good' },
};

export const ELABEL_STATUS_LABELS: Record<string, StatusMeta> = {
  draft: { label: 'Nháp', tone: 'warn' },
  published: { label: 'Đã công bố', tone: 'good' },
  recalled: { label: 'Thu hồi', tone: 'danger' },
};

export const SUPPLEMENTARY_STATUS_LABELS: Record<string, StatusMeta> = {
  draft: { label: 'Nháp', tone: 'warn' },
  published: { label: 'Đã xuất bản', tone: 'good' },
  archived: { label: 'Ngừng dùng', tone: 'neutral' },
};

/** Gộp record + qr (StatusPill dùng chung union này như trước). */
export const STATUS_LABELS: Record<string, StatusMeta> = { ...RECORD_STATUS_LABELS, ...QR_STATUS_LABELS };

/** Tra cứu an toàn, fallback về label thô + neutral. */
export function statusMeta(status: string, table: Record<string, StatusMeta> = STATUS_LABELS): StatusMeta {
  return table[status] ?? { label: status, tone: 'neutral' };
}
