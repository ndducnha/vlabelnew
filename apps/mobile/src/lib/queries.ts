import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { Product, Flow, TraceTask, EventRecord, UserSummary } from '@vlabel/shared';
import { api } from './api';

// Hook truy vấn dùng chung - gom các queryKey/queryFn lặp lại ở nhiều màn (giữ nguyên hành vi).
// Kiểu trả về được chú thích tường minh để dữ liệu có type (react-query suy luận về any với cấu hình hiện tại).
export function useProducts(): UseQueryResult<Product[]> {
  return useQuery({ queryKey: ['products'], queryFn: () => api.get('/products').then((r) => r.data as Product[]) });
}

export function useFlowsAll(): UseQueryResult<Flow[]> {
  return useQuery({ queryKey: ['flows-all'], queryFn: () => api.get('/flows').then((r) => r.data as Flow[]) });
}

/** mine=true: chỉ nhiệm vụ của tôi; mine=false: toàn bộ (quản lý). */
export function useTraceTasks(mine = false): UseQueryResult<TraceTask[]> {
  return useQuery({
    queryKey: ['trace-tasks', mine ? 'mine' : 'all'],
    queryFn: () => api.get('/trace-tasks', { params: mine ? { mine: 1 } : {} }).then((r) => r.data as TraceTask[]),
  });
}

export function useRecordsByProduct(productId: string, enabled = true): UseQueryResult<EventRecord[]> {
  return useQuery({
    queryKey: ['recs-by-product', productId],
    enabled: enabled && !!productId,
    queryFn: () => api.get('/event-records/by-product', { params: { productId } }).then((r) => r.data as EventRecord[]),
  });
}

export function useBranchUsers(q = ''): UseQueryResult<UserSummary[]> {
  return useQuery({
    queryKey: ['users-branch', q],
    queryFn: () => api.get('/users/branch', { params: q ? { q } : {} }).then((r) => r.data as UserSummary[]),
  });
}
