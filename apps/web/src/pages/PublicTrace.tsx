import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, MapPin, Leaf, AlertTriangle, Building2, FileText, Package, Globe } from 'lucide-react';
import { api, fileUrl } from '../lib/api';
import { Spinner } from '../components/ui';

const RISK = ['Chưa xác định', 'Cao', 'Trung bình', 'Thấp'];

export default function PublicTrace() {
  const { gtin } = useParams();
  const [sp] = useSearchParams();
  const lot = sp.get('lot') ?? undefined;
  const serial = sp.get('serial') ?? undefined;
  const [tab, setTab] = useState<'sp' | 'dn' | 'tx' | 'np'>('sp');

  const q = useQuery({
    queryKey: ['trace', gtin, lot, serial],
    queryFn: () => api.get(`/public/t/${gtin}`, { params: { lot, serial } }).then((r) => r.data),
  });

  if (q.isLoading) return <div style={{ background: 'var(--surface)', minHeight: '100vh' }}><Spinner label="Đang xác thực…" /></div>;
  if (q.isError) return (
    <div className="min-h-screen grid place-items-center p-6 text-center" style={{ background: 'var(--surface)' }}>
      <div><div className="text-5xl mb-3">🔍</div><b>Không tìm thấy sản phẩm</b><p className="text-[var(--muted)] mt-1 mono">{gtin}</p></div>
    </div>
  );

  const d = q.data;
  const label = d.label;
  const owner = label?.owner ?? null;
  const recalled = label?.status === 'recalled';
  const TABS = [
    { k: 'sp' as const, label: 'Sản phẩm', icon: Package },
    { k: 'dn' as const, label: 'Doanh nghiệp', icon: Building2 },
    ...(d.supplementary ? [{ k: 'np' as const, label: 'Nhãn phụ', icon: FileText }] : []),
    { k: 'tx' as const, label: 'Truy xuất', icon: Leaf },
  ];

  return (
    <div style={{ background: 'var(--surface)', minHeight: '100vh' }}>
      <div className="max-w-[520px] mx-auto pb-16">
        {/* Hero */}
        <div className="relative h-[220px] flex items-end p-6 text-white overflow-hidden"
          style={{ borderRadius: '0 0 30px 30px', background: 'linear-gradient(160deg,#1b6b3f,#2f9e5f 60%,#7bd39a)' }}>
          <div className="relative z-10">
            <div className="flex flex-wrap gap-2 mb-3">
              <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-bold" style={{ background: 'rgba(255,255,255,.22)', backdropFilter: 'blur(6px)' }}>
                <ShieldCheck size={14} /> Nhãn điện tử đã xác thực
              </div>
              {label?.portalConnected && (
                <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-bold" style={{ background: 'rgba(255,255,255,.22)', backdropFilter: 'blur(6px)' }}>
                  <Globe size={14} /> Hộ chiếu số · Cổng quốc gia
                </div>
              )}
            </div>
            <h1 className="text-[25px] font-extrabold leading-tight">{d.product.name}</h1>
            <p className="opacity-90 text-sm mt-1.5">{d.item?.batchOrLot ? `Lô ${d.item.batchOrLot} · ` : ''}{label?.company ?? d.product.company ?? ''}</p>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-3.5">
          {recalled && (
            <div className="card p-3.5 flex items-start gap-2.5" style={{ background: '#fff4f4', borderColor: '#f3c0c0' }}>
              <AlertTriangle size={18} className="text-[var(--danger)] flex-none mt-0.5" />
              <div><b className="text-[var(--danger)]">Sản phẩm đã bị thu hồi</b>{label.recallReason && <p className="text-sm text-[var(--ink-2)] mt-0.5">Lý do: {label.recallReason}</p>}</div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-[12px]" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
            {TABS.map((t) => (
              <button key={t.k} onClick={() => setTab(t.k)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[9px] text-[13px] font-semibold"
                style={tab === t.k ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--muted)' }}>
                <t.icon size={15} /> {t.label}
              </button>
            ))}
          </div>

          {tab === 'sp' && (
            <>
              <div className="card p-4">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-14 h-14 rounded-2xl grid place-items-center text-2xl flex-none" style={{ background: 'var(--surface)' }}>🏷️</div>
                  <div className="flex-1"><b className="text-base">{d.product.name}</b><div className="text-sm text-[var(--muted)] mono">GTIN {d.product.gtin}</div></div>
                </div>
                <div className="flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
                  <Row k="Nhãn hiệu" v={label?.brand} />
                  <Row k="Định lượng" v={label?.netContent} />
                  <Row k="Xuất xứ" v={label?.countryOfOrigin} />
                  <Row k="Mã HS" v={label?.hsCode} mono />
                  <Row k="Thị trường" v={label?.targetMarket} />
                  <Row k="Nhà cung cấp" v={label?.supplier} />
                  <Row k="Mức rủi ro" v={label ? RISK[label.riskLevel ?? 0] : undefined} />
                  <Row k="Mô tả" v={d.product.description} />
                </div>
              </div>

              {label?.ingredients && (
                <div className="card p-4"><h3 className="font-semibold mb-1.5">Thành phần</h3><p className="text-sm whitespace-pre-line">{label.ingredients}</p></div>
              )}
              {(label?.usageInstructions || label?.storageInstructions) && (
                <div className="card p-4">
                  <h3 className="font-semibold mb-2">Hướng dẫn sử dụng & bảo quản</h3>
                  {label.usageInstructions && <p className="text-sm mb-1.5"><b>Sử dụng: </b>{label.usageInstructions}</p>}
                  {label.storageInstructions && <p className="text-sm"><b>Bảo quản: </b>{label.storageInstructions}</p>}
                </div>
              )}
              {label?.safetyWarnings && (
                <div className="card p-4" style={{ background: '#fff7ed', borderColor: '#f0d0a0' }}>
                  <h3 className="font-semibold mb-1.5 flex items-center gap-1.5"><AlertTriangle size={16} className="text-[var(--warn)]" />Cảnh báo an toàn</h3>
                  <p className="text-sm whitespace-pre-line">{label.safetyWarnings}</p>
                </div>
              )}

              {Array.isArray(label?.appendixFields) && label.appendixFields.length > 0 && (
                <div className="card p-4">
                  <h3 className="font-semibold mb-2.5">Thông tin theo nhóm hàng hóa{label.appendixGroup ? ` · ${label.appendixGroup}` : ''}</h3>
                  <div className="flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
                    {label.appendixFields.map((a: any, i: number) => <Row key={i} k={a.label} v={String(a.value)} />)}
                  </div>
                </div>
              )}

              {(d.item?.batchOrLot || label?.batch) && (
                <div className="card p-4">
                  <h3 className="font-semibold mb-2.5">Thông tin lô</h3>
                  <div className="flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
                    <Row k="Số lô" v={label?.batch?.batchCode ?? d.item?.batchOrLot} mono />
                    <Row k="Ngày sản xuất" v={label?.batch?.manufacturingDate ? new Date(label.batch.manufacturingDate).toLocaleDateString('vi-VN') : undefined} />
                    <Row k="Số lượng" v={label?.batch?.totalQuantity != null ? String(label.batch.totalQuantity) : undefined} />
                  </div>
                  {label?.batch?.traceabilityUrl && <a className="btn btn-sm mt-3" href={label.batch.traceabilityUrl} target="_blank" rel="noreferrer">Tra cứu trên Cổng quốc gia</a>}
                </div>
              )}

              {Array.isArray(label?.images) && label.images.filter((i: any) => i?.url).length > 0 && (
                <div className="card p-4">
                  <h3 className="font-semibold mb-2.5">Ảnh sản phẩm</h3>
                  <div className="flex gap-2 overflow-x-auto">
                    {label.images.filter((i: any) => i?.url).map((im: any, i: number) => (
                      <img key={i} src={im.url} alt={im.note ?? ''} className="w-32 h-32 rounded-xl object-cover border flex-none" style={{ borderColor: 'var(--border)' }} />
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(label?.attributes) && label.attributes.filter((a: any) => a?.field_value).length > 0 && (
                <div className="card p-4">
                  <h3 className="font-semibold mb-2.5">Thông tin khác</h3>
                  <div className="flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
                    {label.attributes.filter((a: any) => a?.field_value).map((a: any, i: number) => <Row key={i} k={a.field_name || '—'} v={a.field_value} />)}
                  </div>
                </div>
              )}

              {Array.isArray(label?.certificates) && label.certificates.filter(Boolean).length > 0 && (
                <div className="card p-4">
                  <h3 className="font-semibold mb-2.5">Chứng nhận</h3>
                  <div className="flex flex-col gap-1.5">
                    {label.certificates.filter(Boolean).map((c: string, i: number) => (
                      <a key={i} href={c} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-[var(--accent)]"><FileText size={15} />Chứng nhận {i + 1}</a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'dn' && (
            <>
              <div className="card p-4">
                <h3 className="font-semibold mb-2.5">Doanh nghiệp chịu trách nhiệm</h3>
                {owner && (owner.name || owner.tax_code || owner.address) ? (
                  <div className="flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
                    <Row k="Tên" v={owner.name} />
                    <Row k="Mã số thuế" v={owner.tax_code} mono />
                    <Row k="Địa chỉ" v={owner.address} />
                    <Row k="Người đại diện" v={owner.representative} />
                  </div>
                ) : <p className="text-sm text-[var(--muted)]">Chưa có thông tin.</p>}
              </div>
              <div className="card p-4">
                <h3 className="font-semibold mb-2.5">Đơn vị kê khai nhãn</h3>
                <p className="text-sm">{label?.company ?? d.product.company ?? '—'}</p>
              </div>
            </>
          )}

          {tab === 'np' && d.supplementary && (
            <div className="card p-4">
              <h3 className="font-semibold mb-2.5">{d.supplementary.name}</h3>
              <div className="text-sm np-content" style={{ lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: d.supplementary.html }} />
            </div>
          )}

          {tab === 'tx' && (
            <>
              <div className="card p-4">
                <h3 className="font-semibold mb-3.5">Hành trình sản phẩm</h3>
                {d.timeline.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">Chưa có dữ liệu truy xuất công khai cho lô này.</p>
                ) : (
                  <div className="relative pl-1.5">
                    {d.timeline.map((t: any, i: number) => (
                      <div key={i} className="flex gap-3.5 pb-5 relative">
                        {i < d.timeline.length - 1 && <span className="absolute left-[15px] top-[34px] bottom-0 w-0.5" style={{ background: 'var(--border)' }} />}
                        <div className="w-8 h-8 rounded-full grid place-items-center text-white flex-none z-10" style={{ background: 'var(--accent)', boxShadow: '0 0 0 4px var(--card)' }}><Leaf size={15} /></div>
                        <div className="flex-1">
                          <b className="text-[14.5px]">{t.event}</b>
                          {t.where && <span className="text-xs text-[var(--faint)] font-semibold"> · {t.where}</span>}
                          {t.when && <div className="text-xs text-[var(--faint)]">{new Date(t.when).toLocaleDateString('vi-VN')}{t.who ? ` · ${t.who}` : ''}</div>}
                          {t.action && <div className="text-sm mt-0.5">{t.action}</div>}
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {Object.entries(t.info ?? {}).map(([k, v]) => <span key={k} className="chip">{k}: {String(v)}</span>)}
                          </div>
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
              </div>
              {d.timeline.some((t: any) => t.gps) && (
                <div className="card p-4">
                  <h3 className="font-semibold mb-3">Vùng nguyên liệu</h3>
                  <div className="h-[150px] rounded-2xl grid place-items-center" style={{ background: 'linear-gradient(135deg,#e7edf7,#d4e0f0)', border: '1px solid var(--border)' }}>
                    <MapPin size={30} className="text-[var(--danger)]" />
                  </div>
                </div>
              )}
            </>
          )}

          <div className="text-center text-xs text-[var(--faint)] py-2">Được xác thực bởi <b>Vlabel</b></div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v?: string | null; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-[var(--muted)] flex-none">{k}</span>
      <span className={`text-right ${mono ? 'mono' : ''}`}>{v || '—'}</span>
    </div>
  );
}
