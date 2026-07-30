import { useState, type ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, MapPin, Leaf, AlertTriangle, Building2, FileText, Package, Globe, Boxes, ImageIcon, Award, Info, ChevronRight, Check } from 'lucide-react';
import { api, fileUrl } from '../lib/api';
import { Spinner } from '../components/ui';

const RISK = ['Chưa xác định', 'Cao', 'Trung bình', 'Thấp'];

export default function PublicTrace() {
  const { gtin } = useParams();
  const [sp] = useSearchParams();
  const lot = sp.get('lot') ?? undefined;
  const serial = sp.get('serial') ?? undefined;
  const [manualTab, setManualTab] = useState<'sp' | 'dn' | 'tx' | 'np' | null>(null);

  const q = useQuery({ queryKey: ['trace', gtin, lot, serial], queryFn: () => api.get(`/public/t/${gtin}`, { params: { lot, serial } }).then((r) => r.data) });

  if (q.isLoading) return <div style={{ background: 'var(--surface)', minHeight: '100vh' }}><Spinner label="Đang xác thực…" /></div>;
  if (q.isError) return (
    <div className="min-h-screen grid place-items-center p-6 text-center" style={{ background: 'var(--surface)' }}>
      <div><div className="text-5xl mb-3">🔍</div><b className="text-lg">Không tìm thấy sản phẩm</b><p className="text-[var(--muted)] mt-1 mono">{gtin}</p></div>
    </div>
  );

  const d = q.data;
  const label = d.label;
  const owner = label?.owner ?? null;
  const recalled = label?.status === 'recalled';
  const heroImg = (Array.isArray(label?.images) && label.images.find((i: any) => i?.url)?.url) || (d.product.image ? fileUrl(d.product.image) : null);

  // Có những loại nội dung nào?
  const hasNp = !!d.supplementary;                 // nhãn phụ
  const hasLabel = !!label;                         // nhãn điện tử (đã công bố / thu hồi)
  const hasTx = (d.timeline?.length ?? 0) > 0;      // truy xuất nguồn gốc (txng)

  // Tab mặc định theo ưu tiên: nhãn phụ > nhãn điện tử > truy xuất
  const defaultTab: 'sp' | 'dn' | 'tx' | 'np' = hasNp ? 'np' : hasLabel ? 'sp' : hasTx ? 'tx' : 'sp';
  const tab = manualTab ?? defaultTab;

  // Danh sách tab, đưa tab mặc định lên đầu tiên
  const baseTabs = [
    { k: 'sp' as const, label: 'Nhãn điện tử', icon: Package },
    { k: 'dn' as const, label: 'Doanh nghiệp', icon: Building2 },
    ...(hasNp ? [{ k: 'np' as const, label: 'Nhãn phụ', icon: FileText }] : []),
    { k: 'tx' as const, label: 'Truy xuất', icon: Leaf },
  ];
  const TABS = [...baseTabs.filter((t) => t.k === defaultTab), ...baseTabs.filter((t) => t.k !== defaultTab)];

  return (
    <div style={{ background: 'var(--surface)', minHeight: '100vh' }}>
      <div className="max-w-[540px] mx-auto pb-16">
        {/* Banner nổi bật: tên sản phẩm + ảnh + trạng thái đồng bộ */}
        <div className="relative px-6 pt-8 pb-20 text-white overflow-hidden"
          style={{ borderRadius: '0 0 30px 30px', background: 'linear-gradient(155deg,var(--accent-press),var(--accent) 55%,var(--accent-2))' }}>
          <div aria-hidden className="absolute -right-10 -top-10 w-52 h-52 rounded-full" style={{ background: 'rgba(255,255,255,.10)' }} />
          <div aria-hidden className="absolute -left-14 bottom-0 w-40 h-40 rounded-full" style={{ background: 'rgba(255,255,255,.08)' }} />
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 text-[13px] font-semibold opacity-95 mb-5"><ShieldCheck size={16} /> Đã xác thực bởi Vlabel</div>

            <div className="flex items-center gap-4">
              {heroImg
                ? <img src={heroImg} alt="" className="w-[76px] h-[76px] rounded-2xl object-cover flex-none" style={{ border: '3px solid rgba(255,255,255,.55)', boxShadow: '0 8px 22px rgba(0,0,0,.22)' }} />
                : <span className="w-[76px] h-[76px] rounded-2xl grid place-items-center text-4xl flex-none" style={{ background: 'rgba(255,255,255,.18)' }}>🏷️</span>}
              <div className="min-w-0">
                <h1 className="text-[25px] font-extrabold leading-[1.12] tracking-tight" style={{ textWrap: 'balance' as any }}>{d.product.name}</h1>
                <div className="text-[12.5px] opacity-90 mt-1 mono">{label?.brand ? `${label.brand} · ` : ''}{d.product.gtin}</div>
              </div>
            </div>

            {label?.portalConnected && (
              <div className="mt-5 inline-flex items-center gap-2 rounded-full pl-2 pr-4 py-1.5 font-bold text-[13.5px]"
                style={{ background: 'rgba(255,255,255,.22)', backdropFilter: 'blur(6px)' }}>
                <span className="w-[22px] h-[22px] rounded-full grid place-items-center flex-none" style={{ background: '#fff', color: 'var(--good)' }}><Check size={14} strokeWidth={3.5} /></span>
                Đã đồng bộ với cơ sở dữ liệu Quốc gia
              </div>
            )}

            <div className="flex gap-2 flex-wrap mt-3.5">
              {label && label.status === 'published' && <span className="pill-glass" style={{ fontSize: 14, padding: '8px 15px' }}><ShieldCheck size={16} />Nhãn điện tử</span>}
              {label?.status === 'recalled' && <span className="pill-glass" style={{ fontSize: 14, padding: '8px 15px', background: 'rgba(226,55,68,.35)' }}><AlertTriangle size={16} />Đã thu hồi</span>}
              {hasNp && <span className="pill-glass"><FileText size={13} />Có nhãn phụ</span>}
              {hasTx && <span className="pill-glass"><Leaf size={13} />Truy xuất nguồn gốc</span>}
            </div>
          </div>
        </div>

        {/* Thẻ thông tin nhanh nổi lên trên banner */}
        {(label?.batch?.batchCode || d.item?.batchOrLot || label || label?.netContent) && (
          <div className="px-5 -mt-12 relative z-10">
            <div className="card p-3.5 flex flex-wrap items-center gap-2" style={{ boxShadow: 'var(--shadow-md)' }}>
              {(label?.batch?.batchCode || d.item?.batchOrLot) && <span className="chip"><Boxes size={13} />Lô {label?.batch?.batchCode ?? d.item?.batchOrLot}</span>}
              {label?.netContent && <span className="chip"><Package size={13} />{label.netContent}</span>}
              {label && <span className="chip chip-accent">Rủi ro: {RISK[label.riskLevel ?? 0]}</span>}
              {label?.countryOfOrigin && <span className="chip"><Globe size={13} />{label.countryOfOrigin}</span>}
            </div>
          </div>
        )}

        <div className="px-5 pt-4 flex flex-col gap-3.5">
          {recalled && (
            <div className="card p-3.5 flex items-start gap-2.5" style={{ background: 'var(--danger-soft)', borderColor: 'var(--danger)' }}>
              <AlertTriangle size={18} className="text-[var(--danger)] flex-none mt-0.5" />
              <div><b className="text-[var(--danger)]">Sản phẩm đã bị thu hồi</b>{label.recallReason && <p className="text-sm text-[var(--ink-2)] mt-0.5">Lý do: {label.recallReason}</p>}</div>
            </div>
          )}

          {/* Tabs dính */}
          <div className="sticky top-2 z-20 flex gap-1 p-1 rounded-[13px]" style={{ background: 'color-mix(in srgb,var(--bg) 88%,transparent)', border: '1px solid var(--border)', backdropFilter: 'blur(10px)', boxShadow: 'var(--shadow-sm)' }}>
            {TABS.map((t) => (
              <button key={t.k} onClick={() => setManualTab(t.k)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[9px] text-[12.5px] font-bold transition-colors"
                style={tab === t.k ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--muted)' }}>
                <t.icon size={15} /> {t.label}
              </button>
            ))}
          </div>

          {tab === 'sp' && (
            <div className="flex flex-col gap-3.5 anim-in">
              <Card icon={<Info size={16} />} title="Thông tin sản phẩm">
                <div className="rows-list">
                  <Row k="Nhãn hiệu" v={label?.brand} />
                  <Row k="Định lượng" v={label?.netContent} />
                  <Row k="Xuất xứ" v={label?.countryOfOrigin} />
                  <Row k="Mã HS" v={label?.hsCode} mono />
                  <Row k="Thị trường" v={label?.targetMarket} />
                  <Row k="Nhà cung cấp" v={label?.supplier} />
                  <Row k="Mô tả" v={d.product.description} />
                </div>
              </Card>

              {label?.ingredients && <Card icon={<Leaf size={16} />} title="Thành phần"><p className="text-sm whitespace-pre-line">{label.ingredients}</p></Card>}
              {(label?.usageInstructions || label?.storageInstructions) && (
                <Card icon={<Info size={16} />} title="Hướng dẫn sử dụng & bảo quản">
                  {label.usageInstructions && <p className="text-sm mb-1.5"><b>Sử dụng: </b>{label.usageInstructions}</p>}
                  {label.storageInstructions && <p className="text-sm"><b>Bảo quản: </b>{label.storageInstructions}</p>}
                </Card>
              )}
              {label?.safetyWarnings && (
                <div className="card p-4" style={{ background: 'var(--warn-soft)', borderColor: 'var(--warn)' }}>
                  <h3 className="font-bold mb-1.5 flex items-center gap-1.5 text-[14px]"><AlertTriangle size={16} className="text-[var(--warn)]" />Cảnh báo an toàn</h3>
                  <p className="text-sm whitespace-pre-line">{label.safetyWarnings}</p>
                </div>
              )}

              {Array.isArray(label?.appendixFields) && label.appendixFields.length > 0 && (
                <Card icon={<FileText size={16} />} title={`Nhóm hàng hóa${label.appendixGroup ? ` · ${label.appendixGroup}` : ''}`}>
                  <div className="rows-list">{label.appendixFields.map((a: any, i: number) => <Row key={i} k={a.label} v={String(a.value)} />)}</div>
                </Card>
              )}

              {(d.item?.batchOrLot || label?.batch) && (
                <Card icon={<Boxes size={16} />} title="Thông tin lô">
                  <div className="rows-list">
                    <Row k="Số lô" v={label?.batch?.batchCode ?? d.item?.batchOrLot} mono />
                    <Row k="Ngày sản xuất" v={label?.batch?.manufacturingDate ? new Date(label.batch.manufacturingDate).toLocaleDateString('vi-VN') : undefined} />
                    <Row k="Số lượng" v={label?.batch?.totalQuantity != null ? String(label.batch.totalQuantity) : undefined} />
                  </div>
                  {label?.batch?.traceabilityUrl && <a className="btn btn-sm mt-3" href={label.batch.traceabilityUrl} target="_blank" rel="noreferrer">Tra cứu trên Cổng quốc gia <ChevronRight size={14} /></a>}
                </Card>
              )}

              {Array.isArray(label?.images) && label.images.filter((i: any) => i?.url).length > 0 && (
                <Card icon={<ImageIcon size={16} />} title="Ảnh sản phẩm">
                  <div className="flex gap-2 overflow-x-auto -mx-1 px-1">
                    {label.images.filter((i: any) => i?.url).map((im: any, i: number) => (
                      <img key={i} src={im.url} alt={im.note ?? ''} className="w-32 h-32 rounded-xl object-cover border flex-none" style={{ borderColor: 'var(--border)' }} />
                    ))}
                  </div>
                </Card>
              )}

              {Array.isArray(label?.attributes) && label.attributes.filter((a: any) => a?.field_value).length > 0 && (
                <Card icon={<Info size={16} />} title="Thông tin khác">
                  <div className="rows-list">{label.attributes.filter((a: any) => a?.field_value).map((a: any, i: number) => <Row key={i} k={a.field_name || '—'} v={a.field_value} />)}</div>
                </Card>
              )}

              {Array.isArray(label?.certificates) && label.certificates.filter(Boolean).length > 0 && (
                <Card icon={<Award size={16} />} title="Chứng nhận">
                  <div className="flex flex-col gap-1.5">
                    {label.certificates.filter(Boolean).map((c: string, i: number) => (
                      <a key={i} href={c} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-[var(--accent)]"><FileText size={15} />Chứng nhận {i + 1}</a>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {tab === 'dn' && (
            <div className="flex flex-col gap-3.5 anim-in">
              <Card icon={<Building2 size={16} />} title="Doanh nghiệp chịu trách nhiệm">
                {owner && (owner.name || owner.tax_code || owner.address) ? (
                  <div className="rows-list">
                    <Row k="Tên" v={owner.name} />
                    <Row k="Mã số thuế" v={owner.tax_code} mono />
                    <Row k="Địa chỉ" v={owner.address} />
                    <Row k="Người đại diện" v={owner.representative} />
                  </div>
                ) : <p className="text-sm text-[var(--muted)]">Chưa có thông tin.</p>}
              </Card>
              <Card icon={<Building2 size={16} />} title="Đơn vị kê khai nhãn"><p className="text-sm">{label?.company ?? d.product.company ?? '—'}</p></Card>
            </div>
          )}

          {tab === 'np' && d.supplementary && (
            <Card icon={<FileText size={16} />} title={d.supplementary.name}>
              <div className="text-sm np-content" style={{ lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: d.supplementary.html }} />
            </Card>
          )}

          {tab === 'tx' && (
            <div className="flex flex-col gap-3.5 anim-in">
              <Card icon={<Leaf size={16} />} title="Hành trình sản phẩm">
                {d.timeline.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">Chưa có dữ liệu truy xuất công khai cho lô này.</p>
                ) : (
                  <div className="relative pl-1">
                    {d.timeline.map((t: any, i: number) => (
                      <div key={i} className="flex gap-3.5 pb-5 relative">
                        {i < d.timeline.length - 1 && <span className="absolute left-[15px] top-[34px] bottom-0 w-0.5" style={{ background: 'var(--border-strong)' }} />}
                        <div className="w-8 h-8 rounded-full grid place-items-center text-white text-[12px] font-bold flex-none z-10" style={{ background: 'var(--accent)', boxShadow: '0 0 0 4px var(--card)' }}>{i + 1}</div>
                        <div className="flex-1">
                          <b className="text-[14.5px]">{t.event}</b>
                          {t.where && <span className="text-xs text-[var(--faint)] font-semibold"> · {t.where}</span>}
                          {t.when && <div className="text-xs text-[var(--faint)]">{new Date(t.when).toLocaleDateString('vi-VN')}{t.who ? ` · ${t.who}` : ''}</div>}
                          {t.action && <div className="text-sm mt-0.5">{t.action}</div>}
                          <div className="flex flex-wrap gap-1.5 mt-1.5">{Object.entries(t.info ?? {}).map(([k, v]) => <span key={k} className="chip">{k}: {String(v)}</span>)}</div>
                          {(t.media ?? []).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {t.media.filter((m: any) => m.kind === 'image').map((m: any, j: number) => (
                                <img key={j} src={fileUrl(m.url)} alt="" className="w-16 h-16 rounded-lg object-cover border" style={{ borderColor: 'var(--border)' }} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              {d.timeline.some((t: any) => t.gps) && (
                <Card icon={<MapPin size={16} />} title="Vùng nguyên liệu">
                  <div className="h-[150px] rounded-2xl grid place-items-center" style={{ background: 'linear-gradient(135deg,var(--accent-soft),var(--surface))', border: '1px solid var(--border)' }}>
                    <MapPin size={30} className="text-[var(--accent)]" />
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Hỗ trợ bởi Vlabel */}
          <a href="https://vlabel.vn" target="_blank" rel="noreferrer"
            className="flex flex-col items-center gap-2 pt-6 pb-2 mt-1 transition-opacity hover:opacity-80">
            <img src="/logo.jpg" alt="Vlabel" className="h-9 rounded-xl" style={{ boxShadow: 'var(--shadow-sm)' }} />
            <span className="text-[12.5px] text-[var(--muted)]">Hỗ trợ bởi <b className="text-[var(--ink-2)]">Vlabel</b></span>
          </a>
        </div>
      </div>
    </div>
  );
}

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="card p-4">
      <h3 className="font-bold mb-2.5 flex items-center gap-2 text-[14px]"><span className="w-6 h-6 rounded-lg grid place-items-center flex-none" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>{icon}</span>{title}</h3>
      {children}
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v?: string | null; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm" style={{ borderTop: '1px solid var(--border)' }}>
      <span className="text-[var(--muted)] flex-none">{k}</span>
      <span className={`text-right ${mono ? 'mono' : ''}`}>{v || '—'}</span>
    </div>
  );
}
