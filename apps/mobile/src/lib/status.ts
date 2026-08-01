// Hằng trạng thái dùng chung trong app mobile - bỏ magic string trùng lặp giữa các màn.
export const RECORD_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
  LOCKED: 'LOCKED',
} as const;

export const TRACE_TASK_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
} as const;

/** Event record đã "chốt" (được duyệt/khóa) - hiển thị công khai & tính vào hành trình. */
export const RECORD_DONE_STATUSES = new Set<string>([RECORD_STATUS.APPROVED, RECORD_STATUS.LOCKED]);
export const isRecordDone = (status: string) => RECORD_DONE_STATUSES.has(status);
