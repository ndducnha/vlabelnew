import { useState, type ReactNode, type CSSProperties } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Check, Building2, FileText, MapPin, Globe, AlertTriangle, Award, ExternalLink } from '../lib/icons';
import { api, fileUrl } from '../lib/api';
import { Spinner } from '../components/ui';

const RISK = ['Chưa xác định', 'Cao', 'Trung bình', 'Thấp'];

// Bảng màu editorial "hộ chiếu sản phẩm"
const C = {
  outer: '#e7e4dd', page: '#f7f4ee', card: '#fff', line: '#efece4', line2: '#ebe7df', rowLine: '#f0ede6', dash: '#e6e1d8',
  navy: '#14486f', navyDeep: '#16213f', ink: '#1b1a18', body: '#54514a', muted: '#6f6b62',
  label: '#8a857c', faint: '#a6a096', faint2: '#b0a99e', chipBg: '#eef1fb', chipBorder: '#dde3f5',
  green: '#7dd4a6', footer: '#f1ede5',
};
const MONO = "'JetBrains Mono',ui-monospace,monospace";
const SERIF = "'Playfair Display',Georgia,serif";
const STRIPE = 'repeating-linear-gradient(135deg,#edeae1 0,#edeae1 9px,#e5e0d6 9px,#e5e0d6 18px)';

const vnDate = (x?: string | null) => (x ? new Date(x).toLocaleDateString('vi-VN') : null);

export default function PublicTrace() {
  const { gtin } = useParams();
  const [sp] = useSearchParams();
  const lot = sp.get('lot') ?? undefined;
  const serial = sp.get('serial') ?? undefined;
  const [manualTab, setManualTab] = useState<'sp' | 'dn' | 'tx' | 'np' | null>(null);

  const q = useQuery({ queryKey: ['trace', gtin, lot, serial], queryFn: () => api.get(`/public/t/${gtin}`, { params: { lot, serial } }).then((r) => r.data) });

  if (q.isLoading) return <div style={{ background: C.outer, minHeight: '100vh' }}><Spinner label="Đang xác thực…" /></div>;
  if (q.isError) return (
    <div style={{ background: C.outer, minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', fontFamily: "'Be Vietnam Pro',system-ui,sans-serif" }}>
      <div><div style={{ fontSize: 46, marginBottom: 10 }}>🔍</div><b style={{ fontSize: 18 }}>Không tìm thấy sản phẩm</b><p style={{ color: C.label, marginTop: 4, fontFamily: MONO }}>{gtin}</p></div>
    </div>
  );

  const d = q.data;
  const label = d.label;
  const owner = label?.owner ?? null;
  const recalled = label?.status === 'recalled';
  const company = label?.company ?? owner?.name ?? d.product.company ?? null;
  const heroImg = (Array.isArray(label?.images) && label.images.find((i: any) => i?.url)?.url) || (d.product.image ? fileUrl(d.product.image) : null);
  const category = d.product.category ?? label?.appendixGroup ?? null;
  const lotCode = lot ?? label?.batch?.batchCode ?? d.item?.batchOrLot ?? null;
  const nsx = vnDate(label?.batch?.manufacturingDate);

  // Có những nội dung nào?
  const hasNp = !!d.supplementary;
  const hasLabel = !!label;
  const hasTx = (d.timeline?.length ?? 0) > 0;
  const synced = hasLabel || hasTx || hasNp;   // có nội dung đã công bố = đã đồng bộ Quốc gia

  // Tab mặc định theo ưu tiên: nhãn phụ > nhãn điện tử > truy xuất; đưa tab đó lên đầu
  const defaultTab: 'sp' | 'dn' | 'tx' | 'np' = hasNp ? 'np' : hasLabel ? 'sp' : hasTx ? 'tx' : 'sp';
  const tab = manualTab ?? defaultTab;
  const baseTabs = [
    { k: 'sp' as const, label: 'Nhãn điện tử' },
    ...(hasNp ? [{ k: 'np' as const, label: 'Nhãn phụ' }] : []),
    ...(hasTx ? [{ k: 'tx' as const, label: 'Truy xuất' }] : []),
    { k: 'dn' as const, label: 'Doanh nghiệp' },
  ];
  const TABS = [...baseTabs.filter((t) => t.k === defaultTab), ...baseTabs.filter((t) => t.k !== defaultTab)];

  const stats = [
    label?.netContent ? { k: 'ĐỊNH LƯỢNG', v: label.netContent } : null,
    lotCode ? { k: 'MÃ LÔ', v: lotCode, mono: true } : null,
    nsx ? { k: 'NGÀY SX', v: nsx } : null,
  ].filter(Boolean) as { k: string; v: string; mono?: boolean }[];

  return (
    <div style={{ minHeight: '100vh', background: C.outer, display: 'flex', justifyContent: 'center', fontFamily: "'Be Vietnam Pro',system-ui,sans-serif", color: C.ink }}>
      <div style={{ width: '100%', maxWidth: 440, background: C.page, minHeight: '100vh', boxShadow: '0 0 70px -24px rgba(28,28,48,.32)', position: 'relative', overflow: 'hidden' }}>

        {/* APP BAR */}
        <div style={{ position: 'sticky', top: 0, zIndex: 30, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: 'rgba(247,244,238,.82)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: `1px solid ${C.line2}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 29, height: 29, borderRadius: 9, background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px -3px rgba(31,58,109,.6)' }}>
              <span style={{ fontFamily: SERIF, fontWeight: 700, color: '#fff', fontSize: 17, lineHeight: 1 }}>V</span>
            </div>
            <div style={{ lineHeight: 1.05 }}>
              <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-.2px' }}>Vlabel</div>
              <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '1.5px', color: C.faint, marginTop: 1 }}>NHÃN ĐIỆN TỬ</div>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: C.chipBg, border: `1px solid ${C.chipBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.navy }}>
              <ShieldCheck size={16} />
            </div>
            <span className="vl-pulse" style={{ position: 'absolute', top: -3, right: -3, width: 10, height: 10, borderRadius: '50%', background: C.green, border: '2px solid #f7f4ee' }} />
          </div>
        </div>

        {/* DẢI XÁC THỰC · ĐỒNG BỘ QUỐC GIA */}
        <div style={{ margin: '13px 16px 0', background: 'linear-gradient(135deg,#eef1fb,#f6f4ee)', border: `1px solid ${C.chipBorder}`, borderRadius: 16, padding: '13px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 7px 18px -6px rgba(31,58,109,.6)' }}>
              <ShieldCheck size={22} color="#fff" />
            </div>
            <span className="vl-pulse" style={{ position: 'absolute', top: -3, right: -3, width: 13, height: 13, borderRadius: '50%', background: C.green, border: '2.5px solid #f3f2ee' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1.5px', color: C.navy, fontWeight: 700, marginBottom: 4 }}>ĐÃ XÁC THỰC BỞI VLABEL</div>
            {synced ? (
              <>
                <div style={{ fontSize: 12.5, lineHeight: 1.45, color: C.ink, fontWeight: 500 }}>Đã đồng bộ thông tin về cơ sở dữ liệu Quốc gia</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 7 }}>
                  {['Truy xuất nguồn gốc', 'Nhãn điện tử'].map((x) => (
                    <span key={x} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff', border: `1px solid ${C.chipBorder}`, borderRadius: 999, padding: '4px 9px 4px 6px', fontSize: 10.5, fontWeight: 600, color: C.navy }}>
                      <span style={{ width: 14, height: 14, borderRadius: '50%', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Check size={9} color="#fff" /></span>
                      {x}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12.5, lineHeight: 1.45, color: C.ink, fontWeight: 500 }}>Thông tin nhãn điện tử đã được xác thực trên nền tảng Vlabel.</div>
            )}
          </div>
        </div>

        {/* HERO */}
        <div style={{ padding: '16px 16px 6px' }}>
          {company && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: C.chipBg, border: '1px solid #e0e5f4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.navy, flexShrink: 0 }}>
                <Building2 size={16} />
              </div>
              <div style={{ lineHeight: 1.15, minWidth: 0 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '2px', color: C.faint }}>CUNG CẤP BỞI</div>
                <div style={{ fontWeight: 600, fontSize: 14.5, marginTop: 1 }}>{company}</div>
              </div>
            </div>
          )}

          <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 22, padding: 14, position: 'relative', boxShadow: '0 1px 2px rgba(20,20,30,.04),0 14px 34px -18px rgba(20,20,40,.16)' }}>
            {heroImg ? (
              <img src={heroImg} alt="" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 15, display: 'block' }} />
            ) : (
              <div style={{ aspectRatio: '1/1', borderRadius: 15, backgroundImage: STRIPE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '2px', color: C.faint2, background: 'rgba(255,255,255,.7)', padding: '6px 12px', borderRadius: 999 }}>ẢNH SẢN PHẨM</div>
              </div>
            )}
            {category && (
              <div style={{ position: 'absolute', top: 24, left: 24, display: 'flex', alignItems: 'center', gap: 6, background: '#fff', padding: '6px 11px', borderRadius: 999, boxShadow: '0 4px 14px -4px rgba(20,20,40,.22)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.navy }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#33322f' }}>{category}</span>
              </div>
            )}
          </div>

          <h1 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 26, lineHeight: 1.18, marginTop: 16, letterSpacing: '-.3px', textWrap: 'balance' as any }}>{d.product.name}</h1>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.5px', color: C.faint, marginTop: 7 }}>
            GTIN {d.product.gtin}{label?.brand ? ` · ${label.brand}` : ''}
          </div>
          {d.product.description && <p style={{ fontSize: 13.5, lineHeight: 1.55, color: C.muted, marginTop: 8, textWrap: 'pretty' as any }}>{d.product.description}</p>}

          {stats.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {stats.map((s, i) => (
                <div key={i} style={{ flex: 1, background: C.card, border: `1px solid ${C.line}`, borderRadius: 13, padding: '10px 11px', minWidth: 0 }}>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '1.5px', color: C.faint }}>{s.k}</div>
                  <div style={{ fontWeight: 700, fontSize: s.mono ? 12.5 : 14, marginTop: 4, fontFamily: s.mono ? MONO : 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.v}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {recalled && (
          <div style={{ margin: '14px 16px 0', background: '#fbeaec', border: '1px solid #e7a9b0', borderRadius: 16, padding: 14, display: 'flex', gap: 11, alignItems: 'flex-start' }}>
            <AlertTriangle size={19} color="#c0384a" style={{ flexShrink: 0, marginTop: 1 }} />
            <div><b style={{ color: '#c0384a' }}>Sản phẩm đã bị thu hồi</b>{label.recallReason && <p style={{ fontSize: 13, color: C.body, marginTop: 3, lineHeight: 1.5 }}>Lý do: {label.recallReason}</p>}</div>
          </div>
        )}

        {/* TAB BAR */}
        <div style={{ position: 'sticky', top: 54, zIndex: 20, display: 'flex', background: 'rgba(247,244,238,.9)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: `1px solid ${C.line2}`, marginTop: 18 }}>
          {TABS.map((t) => {
            const on = tab === t.k;
            return (
              <button key={t.k} onClick={() => setManualTab(t.k)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '11px 2px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: on ? C.navy : '#9a948a', transition: 'color .18s' }}>{t.label}</span>
                <span style={{ width: '100%', height: 2.5, borderRadius: '3px 3px 0 0', background: on ? C.navy : 'transparent', transition: 'background .18s' }} />
              </button>
            );
          })}
        </div>

        {/* PANEL: NHÃN ĐIỆN TỬ */}
        {tab === 'sp' && (
          <div style={{ padding: '20px 16px 8px', display: 'flex', flexDirection: 'column', gap: 18 }} className="anim-in">
            <Section title="THÔNG TIN SẢN PHẨM">
              <RowsCard rows={[
                ['Tên sản phẩm', d.product.name],
                ['Nhãn hiệu', label?.brand],
                ['GTIN', d.product.gtin, true],
                ['Mã lô', lotCode, true],
                ['Xuất xứ', label?.countryOfOrigin],
                ['Thành phần', label?.ingredients],
                ['Khối lượng tịnh', label?.netContent],
                ['Mã HS', label?.hsCode, true],
                ['Thị trường', label?.targetMarket],
                ['Nhà cung cấp', label?.supplier],
                ['Phân loại rủi ro', label ? RISK[label.riskLevel ?? 0] : null],
                ['Ngày sản xuất', nsx],
              ]} />
            </Section>

            {(label?.usageInstructions || label?.storageInstructions) && (
              <Section title="HƯỚNG DẪN">
                <div style={cardBox}>
                  {label.usageInstructions && <p style={{ fontSize: 13, lineHeight: 1.55 }}><b>Sử dụng: </b>{label.usageInstructions}</p>}
                  {label.storageInstructions && <p style={{ fontSize: 13, lineHeight: 1.55, marginTop: label.usageInstructions ? 8 : 0 }}><b>Bảo quản: </b>{label.storageInstructions}</p>}
                </div>
              </Section>
            )}

            {label?.safetyWarnings && (
              <div style={{ background: '#fff7ec', border: '1px solid #f0d9ad', borderRadius: 16, padding: 14, display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <AlertTriangle size={18} color="#b7791f" style={{ flexShrink: 0, marginTop: 1 }} />
                <div><b style={{ fontSize: 13.5, color: '#8a5a12' }}>Cảnh báo an toàn</b><p style={{ fontSize: 12.5, lineHeight: 1.5, color: C.body, marginTop: 3, whiteSpace: 'pre-line' }}>{label.safetyWarnings}</p></div>
              </div>
            )}

            {hasLabel && (
              <div style={{ background: C.navy, borderRadius: 18, padding: 16, display: 'flex', gap: 13, alignItems: 'flex-start', boxShadow: '0 12px 30px -14px rgba(31,58,109,.55)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.05)' }} />
                <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(255,255,255,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldCheck size={20} color="#eaf0ff" />
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, boxShadow: '0 0 0 3px rgba(125,212,166,.25)' }} />
                    <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.5px', color: '#aebbe0', fontWeight: 600 }}>ĐÃ ĐỒNG BỘ DỮ LIỆU</span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: '#f2f5fc', fontWeight: 500 }}>Đã đồng bộ lên Cổng thông tin truy xuất nguồn gốc hàng hóa quốc gia và Hệ thống Nhãn điện tử Quốc gia.</div>
                </div>
              </div>
            )}

            {Array.isArray(label?.appendixFields) && label.appendixFields.length > 0 && (
              <Section title={`NHÓM HÀNG HÓA${label.appendixGroup ? ` · ${label.appendixGroup}` : ''}`}>
                <RowsCard rows={label.appendixFields.map((a: any) => [a.label, String(a.value)])} />
              </Section>
            )}

            {Array.isArray(label?.images) && label.images.filter((i: any) => i?.url).length > 0 && (
              <Section title="ẢNH SẢN PHẨM">
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -4px', padding: '0 4px' }}>
                  {label.images.filter((i: any) => i?.url).map((im: any, i: number) => (
                    <img key={i} src={im.url} alt={im.note ?? ''} style={{ width: 128, height: 128, borderRadius: 13, objectFit: 'cover', border: `1px solid ${C.line}`, flexShrink: 0 }} />
                  ))}
                </div>
              </Section>
            )}

            {Array.isArray(label?.certificates) && label.certificates.filter(Boolean).length > 0 && (
              <Section title="HỒ SƠ CHỨNG CHỈ">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {label.certificates.filter(Boolean).map((c: string, i: number) => (
                    <a key={i} href={c} target="_blank" rel="noreferrer" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 2px rgba(20,20,30,.04)' }}>
                      <span style={{ width: 36, height: 36, borderRadius: 10, background: C.chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: C.navy }}><Award size={17} /></span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.ink }}>Chứng nhận {i + 1}</span>
                      <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.navy, background: '#f6f4ef', border: `1px solid ${C.line2}`, padding: '5px 9px', borderRadius: 8 }}>XEM</span>
                    </a>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}

        {/* PANEL: NHÃN PHỤ */}
        {tab === 'np' && d.supplementary && (
          <div style={{ padding: '20px 16px 8px', display: 'flex', flexDirection: 'column', gap: 16 }} className="anim-in">
            <Section title="NHÃN PHỤ · BẮT BUỘC">
              <div style={{ background: C.card, border: `1.5px solid ${C.navy}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 14px 34px -20px rgba(20,20,40,.22)' }}>
                <div style={{ background: C.navy, color: '#fff', padding: '14px 16px' }}>
                  <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 19, lineHeight: 1 }}>NHÃN PHỤ</div>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '1.5px', color: '#aebbe0', marginTop: 4 }}>SUPPLEMENTARY LABEL</div>
                </div>
                <div style={{ padding: '4px 16px 14px' }} className="np-content" dangerouslySetInnerHTML={{ __html: d.supplementary.html }} />
                <div style={{ background: '#f7f8fc', borderTop: `1px solid ${C.dash}`, padding: '11px 16px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.navy, marginTop: 6, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, lineHeight: 1.5, color: C.muted }}>Nhãn phụ thể hiện bằng tiếng Việt theo <b style={{ color: C.navy }}>Nghị định 43/2017/NĐ-CP</b> về nhãn hàng hóa.</span>
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* PANEL: TRUY XUẤT */}
        {tab === 'tx' && (
          <div style={{ padding: '20px 16px 8px', display: 'flex', flexDirection: 'column', gap: 20 }} className="anim-in">
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '2px', color: C.label, fontWeight: 600, marginBottom: 6 }}>CHUỖI CUNG ỨNG MINH BẠCH</div>
                  <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 26, lineHeight: 1.1, letterSpacing: '-.3px' }}>Truy xuất<br />nguồn gốc</div>
                </div>
                {lotCode && <div style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 600, color: C.navy, background: C.chipBg, border: `1px solid ${C.chipBorder}`, padding: '6px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>{lotCode}</div>}
              </div>

              {d.timeline.length === 0 ? (
                <div style={cardBox}><p style={{ fontSize: 13, color: C.muted }}>Chưa có dữ liệu truy xuất công khai cho lô này.</p></div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: 34 }}>
                  <div style={{ position: 'absolute', left: 11, top: 12, bottom: 12, width: 2, background: 'linear-gradient(#dfe4f2,#eae6dd)' }} />
                  {d.timeline.map((s: any, i: number) => {
                    const img = (s.media ?? []).find((m: any) => m.kind === 'image');
                    return (
                      <div key={i} style={{ position: 'relative', marginBottom: 16 }}>
                        <div style={{ position: 'absolute', left: -34, top: 0, width: 24, height: 24, borderRadius: '50%', background: C.navy, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 11, fontWeight: 700, boxShadow: `0 0 0 4px ${C.page}` }}>{i + 1}</div>
                        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 2px rgba(20,20,30,.04),0 10px 26px -18px rgba(20,20,40,.18)' }}>
                          {img && <div style={{ height: 140, backgroundImage: `url(${fileUrl(img.url)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
                          <div style={{ padding: 14 }}>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{s.event}</div>
                            {(s.when || s.where) && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, color: C.navy }}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.navy }} />
                                <span style={{ fontFamily: MONO, fontSize: 11, color: C.label }}>{[vnDate(s.when), s.where].filter(Boolean).join(' · ')}</span>
                              </div>
                            )}
                            {s.action && <div style={{ fontSize: 12.5, lineHeight: 1.55, color: C.muted, marginTop: 9, textWrap: 'pretty' as any }}>{s.action}</div>}
                            {Object.keys(s.info ?? {}).length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
                                {Object.entries(s.info).map(([k, v]) => (
                                  <span key={k} style={{ fontFamily: MONO, fontSize: 10, color: C.body, background: '#f6f4ef', border: `1px solid ${C.line2}`, padding: '3px 8px', borderRadius: 7 }}>{k}: {String(v)}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {label?.batch?.traceabilityUrl && (
              <div style={{ background: C.navyDeep, borderRadius: 18, padding: 18, position: 'relative', overflow: 'hidden', boxShadow: '0 16px 36px -18px rgba(22,33,63,.7)' }}>
                <div style={{ position: 'absolute', right: -40, top: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(120,150,255,.06)' }} />
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', position: 'relative', marginBottom: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: '#2f4bb0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Globe size={19} color="#eaf0ff" /></div>
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1.5px', color: '#8a97c9', fontWeight: 600 }}>CỔNG QUỐC GIA</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#eef1fb', marginTop: 3 }}>Đã đồng bộ Cổng truy xuất Quốc gia</div>
                  </div>
                </div>
                <a href={label.batch.traceabilityUrl} target="_blank" rel="noreferrer" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 12, padding: '11px', color: '#eaf0ff', fontSize: 13, fontWeight: 600 }}>
                  Tra cứu trên Cổng quốc gia <ExternalLink size={15} />
                </a>
              </div>
            )}
          </div>
        )}

        {/* PANEL: DOANH NGHIỆP */}
        {tab === 'dn' && (
          <div style={{ padding: '20px 16px 8px', display: 'flex', flexDirection: 'column', gap: 20 }} className="anim-in">
            <Section title="DOANH NGHIỆP CHỊU TRÁCH NHIỆM">
              {company && (
                <div style={{ display: 'flex', gap: 13, alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: C.chipBg, border: '1px solid #e0e5f4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.navy, flexShrink: 0 }}><Building2 size={24} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>{company}</div>
                    {owner?.representative && <div style={{ fontSize: 12, color: C.label, marginTop: 3 }}>Đại diện: {owner.representative}</div>}
                  </div>
                </div>
              )}
              {owner && (owner.name || owner.tax_code || owner.address) ? (
                <RowsCard rows={[
                  ['Tên tổ chức', owner.name],
                  ['Mã số thuế', owner.tax_code, true],
                  ['Địa chỉ', owner.address],
                  ['Người đại diện', owner.representative],
                ]} />
              ) : <div style={cardBox}><p style={{ fontSize: 13, color: C.muted }}>Chưa có thông tin doanh nghiệp.</p></div>}
            </Section>

            {owner?.address && (
              <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: '13px 14px', display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: C.chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: C.navy }}><MapPin size={16} /></div>
                <div><div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '1.5px', color: C.faint }}>ĐỊA CHỈ</div><div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{owner.address}</div></div>
              </div>
            )}
          </div>
        )}

        {/* FOOTER */}
        <div style={{ marginTop: 28, padding: '26px 20px 30px', background: C.footer, borderTop: `1px solid ${C.dash}`, textAlign: 'center' }}>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '2px', color: C.faint, marginBottom: 12 }}>CUNG CẤP BỞI</div>
          <a href="https://vlabel.vn" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontFamily: SERIF, fontWeight: 700, color: '#fff', fontSize: 16 }}>V</span></div>
            <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 22, color: C.ink }}>Vlabel</span>
          </a>
          <div style={{ fontSize: 12, color: C.label, marginBottom: 16 }}>Nền tảng nhãn điện tử &amp; truy xuất nguồn gốc</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center', marginBottom: 16 }}>
            {['vlabel.vn', 'contact@vlabel.vn'].map((x) => (
              <span key={x} style={{ background: '#fff', border: `1px solid ${C.dash}`, borderRadius: 999, padding: '6px 12px', fontSize: 11.5, color: C.body }}>{x}</span>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.faint }}>© 2026 Vlabel. Bảo lưu mọi quyền.</div>
        </div>
      </div>
    </div>
  );
}

const cardBox: CSSProperties = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 14, boxShadow: '0 1px 2px rgba(20,20,30,.04)' };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ width: 15, height: 2, background: C.navy, borderRadius: 2 }} />
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '2px', color: C.label, fontWeight: 600 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function RowsCard({ rows }: { rows: any[][] }) {
  const items = rows.filter((r) => r[1] != null && r[1] !== '');
  if (!items.length) return null;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: '4px 16px', boxShadow: '0 1px 2px rgba(20,20,30,.04)' }}>
      {items.map(([k, v, mono], i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, padding: '13px 0', borderBottom: i < items.length - 1 ? `1px solid ${C.rowLine}` : 'none' }}>
          <span style={{ fontSize: 12.5, color: C.label, flexShrink: 0 }}>{k}</span>
          <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right', fontFamily: mono ? MONO : 'inherit' }}>{String(v)}</span>
        </div>
      ))}
    </div>
  );
}
