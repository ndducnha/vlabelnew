import { validateGtin, isValidGtin, gs1CheckDigit, toGtin14 } from '@vlabel/shared';

describe('GTIN (GS1)', () => {
  it('chấp nhận GTIN hợp lệ các độ dài', () => {
    expect(isValidGtin('8938505970011')).toBe(true); // GTIN-13
    expect(isValidGtin('00012345600012')).toBe(true); // GTIN-14
    expect(isValidGtin('96385074')).toBe(true);        // GTIN-8
  });

  it('từ chối sai check digit', () => {
    const r = validateGtin('8938505970017'); // sai check digit (đúng phải là ...011)
    expect(r.valid).toBe(false);
    expect(r.error).toBe('BAD_CHECK_DIGIT');
  });

  it('từ chối ký tự không phải số', () => {
    expect(validateGtin('89385A5970017').error).toBe('NON_DIGIT');
  });

  it('từ chối độ dài không hợp lệ', () => {
    expect(validateGtin('12345').error).toBe('INVALID_LENGTH');
  });

  it('từ chối rỗng', () => {
    expect(validateGtin('').error).toBe('EMPTY');
    expect(validateGtin(undefined).error).toBe('EMPTY');
  });

  it('giữ số 0 đầu & chuẩn hóa 14', () => {
    expect(toGtin14('96385074')).toBe('00000096385074');
  });

  it('tính đúng check digit', () => {
    expect(gs1CheckDigit('893850597001')).toBe(1);
    expect(gs1CheckDigit('400638133393')).toBe(1);
  });
});
