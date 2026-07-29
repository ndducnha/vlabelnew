/**
 * GTIN theo GS1 — hỗ trợ GTIN-8, GTIN-12, GTIN-13, GTIN-14.
 * - Chỉ chữ số.
 * - Kiểm tra độ dài hợp lệ.
 * - Kiểm tra check digit (mod-10) theo GS1.
 * - Lưu dạng chuỗi để giữ số 0 ở đầu.
 * Không tự sinh GTIN (§2).
 */

export const VALID_GTIN_LENGTHS = [8, 12, 13, 14] as const;
export type GtinLength = (typeof VALID_GTIN_LENGTHS)[number];

export interface GtinValidationResult {
  valid: boolean;
  /** Chuỗi số đã được trim (giữ nguyên số 0 đầu). */
  normalized: string;
  length?: number;
  /** Mã lỗi khi không hợp lệ. */
  error?: 'EMPTY' | 'NON_DIGIT' | 'INVALID_LENGTH' | 'BAD_CHECK_DIGIT';
  message?: string;
}

/**
 * Tính check digit GS1 cho phần thân (không gồm check digit).
 * Từ phải qua trái, nhân xen kẽ 3,1,3,1...
 */
export function gs1CheckDigit(bodyDigits: string): number {
  let sum = 0;
  // duyệt từ phải qua trái của phần thân
  for (let i = 0; i < bodyDigits.length; i++) {
    const digit = bodyDigits.charCodeAt(bodyDigits.length - 1 - i) - 48;
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

export function validateGtin(input: string | null | undefined): GtinValidationResult {
  const normalized = (input ?? '').trim();
  if (!normalized) {
    return { valid: false, normalized, error: 'EMPTY', message: 'GTIN không được để trống.' };
  }
  if (!/^\d+$/.test(normalized)) {
    return { valid: false, normalized, error: 'NON_DIGIT', message: 'GTIN chỉ được chứa chữ số.' };
  }
  if (!VALID_GTIN_LENGTHS.includes(normalized.length as GtinLength)) {
    return {
      valid: false,
      normalized,
      length: normalized.length,
      error: 'INVALID_LENGTH',
      message: `Độ dài GTIN không hợp lệ (${normalized.length}). Cho phép: ${VALID_GTIN_LENGTHS.join(', ')}.`,
    };
  }
  const body = normalized.slice(0, -1);
  const provided = normalized.charCodeAt(normalized.length - 1) - 48;
  const expected = gs1CheckDigit(body);
  if (provided !== expected) {
    return {
      valid: false,
      normalized,
      length: normalized.length,
      error: 'BAD_CHECK_DIGIT',
      message: `Sai check digit (mong đợi ${expected}).`,
    };
  }
  return { valid: true, normalized, length: normalized.length };
}

export function isValidGtin(input: string | null | undefined): boolean {
  return validateGtin(input).valid;
}

/** Chuẩn hóa GTIN về 14 ký tự (đệm số 0 ở đầu) — tiện cho index/so khớp. */
export function toGtin14(input: string): string {
  const r = validateGtin(input);
  if (!r.valid) throw new Error(r.message ?? 'GTIN không hợp lệ');
  return r.normalized.padStart(14, '0');
}
