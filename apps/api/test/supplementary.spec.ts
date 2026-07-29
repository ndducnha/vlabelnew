import { sanitizeHtml, renderVars } from '../src/supplementary-labels/supplementary-labels.util';

describe('supplementary label util', () => {
  it('loại bỏ script và sự kiện on* để chống XSS', () => {
    const dirty = '<p onclick="steal()">Hi</p><script>alert(1)</script><a href="javascript:evil()">x</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toMatch(/<script/i);
    expect(clean).not.toMatch(/onclick/i);
    expect(clean).not.toMatch(/javascript:/i);
    expect(clean).toContain('Hi');
  });

  it('giữ lại định dạng hợp lệ', () => {
    const html = '<h2>Tiêu đề</h2><ul><li><b>Đậm</b></li></ul>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it('thay biến động {{...}} bằng dữ liệu thật', () => {
    const out = renderVars('SP {{product_name}} - GTIN {{gtin}} - Lô {{batch_number}} - {{unknown}}', {
      product_name: 'Paracetamol', gtin: '893110000001', batch_number: 'LOT-01',
    });
    expect(out).toBe('SP Paracetamol - GTIN 893110000001 - Lô LOT-01 - ');
  });
});
