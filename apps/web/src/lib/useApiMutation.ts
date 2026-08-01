import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiError } from './api';
import { useToast } from './toast';

type Opts<TData, TVars> = {
  /** Query keys cần invalidate sau khi thành công. */
  invalidate?: readonly unknown[][];
  /** Toast thành công (chuỗi hoặc hàm theo data/vars). */
  successMessage?: string | ((data: TData, vars: TVars) => string);
  onSuccess?: (data: TData, vars: TVars) => void;
  /** Bỏ qua toast lỗi mặc định nếu tự xử lý. */
  onError?: (e: unknown) => void;
};

/**
 * Gói bộ ba lặp lại ~70 lần trong web: toast thành công + invalidateQueries + toast lỗi (apiError).
 * Giữ nguyên hành vi; chỉ bớt boilerplate.
 *   const del = useApiMutation((id: string) => api.delete(`/x/${id}`), { successMessage: 'Đã xóa', invalidate: [['x']] });
 */
export function useApiMutation<TData = unknown, TVars = void>(
  mutationFn: (vars: TVars) => Promise<TData>,
  opts: Opts<TData, TVars> = {},
) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation<TData, unknown, TVars>({
    mutationFn,
    onSuccess: (data, vars) => {
      if (opts.successMessage) {
        toast(typeof opts.successMessage === 'function' ? opts.successMessage(data, vars) : opts.successMessage, true);
      }
      for (const key of opts.invalidate ?? []) qc.invalidateQueries({ queryKey: key });
      opts.onSuccess?.(data, vars);
    },
    onError: (e) => (opts.onError ? opts.onError(e) : toast(apiError(e), false)),
  });
}
