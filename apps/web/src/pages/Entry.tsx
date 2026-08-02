import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Check, Loader2, Copy, MapPin, ChevronLeft, ScanLine, Camera, Trash2, Link2, Search, Package, ShieldAlert, ClipboardList, ArrowRight } from '../lib/icons';
import { api, apiError, fileUrl } from '../lib/api';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import { Spinner, ProgressBar, Row } from '../components/ui';
import QrScanner from '../components/QrScanner';
import { useT, type Messages } from '../lib/i18n';
import type { Product, TraceTask, EventDefinition } from '@vlabel/shared';

function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const MSG: Messages = {
  vi: {
    'title.product': 'Kê khai sản phẩm nào?',
    'title.event': 'Chọn Sự kiện cần kê khai',
    'title.who': 'Ai thực hiện?',
    'title.where': 'Thực hiện ở đâu?',
    'title.what': 'Đã làm gì?',
    'title.fields': 'Thông tin chi tiết',
    'title.media': 'Hình ảnh / minh chứng',
    'title.time': 'Thực hiện khi nào?',
    'title.review': 'Xem lại & gửi',
    done: 'Đã kê khai', doneSub: 'Dữ liệu truy xuất đã được ghi nhận.',
    step: 'Bước {n} / {total}', appTitle: 'Kê khai truy xuất',
    lotPrefix: 'Lô', productHint: 'Quét QR, chọn nhiệm vụ được giao, hoặc chọn sản phẩm.',
    back: 'Trước', next: 'Tiếp tục', finish: 'Hoàn tất kê khai',
    myTasks: 'Nhiệm vụ của bạn', need: 'Cần:', due: 'hạn', note: 'Ghi chú:', doNow: 'Làm ngay',
    scanQr: 'Quét QR', gtinPh: 'Mã GTIN từ QR', receive: 'Nhận', camOff: 'Tắt', camera: 'Camera',
    searchProductPh: 'Tìm sản phẩm theo tên / GTIN…', flowsUnit: 'luồng', noProducts: 'Không có sản phẩm nào trong phạm vi của bạn.',
    lotLabel: 'Lô / ngày sản xuất', lotPerLot: '· mỗi lô một QR riêng', lotByLot: '· phân định theo lô', lotPh: 'VD: LOT-2407-01',
    noFlow: 'Sản phẩm chưa gán Luồng. Nhờ quản lý gán trong "Quản lý sản phẩm".',
    flowApply: 'Luồng áp dụng', flowChoose: '— chọn Luồng —', chooseFlowFirst: 'Chọn Luồng để tiếp tục.',
    noPerm: 'Bạn chưa được cấp quyền kê khai theo Luồng này. Liên hệ quản lý.',
    epcis5: '5 yếu tố EPCIS', fieldsUnit: 'trường',
    me: 'Tôi', orEnterPerformer: 'Hoặc nhập tên người thực hiện', performerPh: 'Tên người thực hiện',
    whereLabel: 'Địa điểm thực hiện', wherePh: 'VD: Nhà máy An Giang', gpsToast: '📍 Đã lấy GPS', whereHint: 'Có thể để trống nếu không cần.',
    whatLabel: 'Hành động đã thực hiện', whatPh: 'VD: Đóng gói lô, kiểm định đạt chuẩn…',
    fillPrev: 'Điền theo lần trước', linkPh: 'Dán link ảnh/video/file (https://…)', mediaHint: 'Bước này không bắt buộc.',
    timeLabel: 'Thời gian thực hiện',
    rProduct: 'Sản phẩm', rGtin: 'GTIN', rLot: 'Lô / ngày SX', rEvent: 'Sự kiện', rPerformer: 'Người thực hiện',
    rLocation: 'Địa điểm', rAction: 'Hành động', rTime: 'Thời gian', rMedia: 'Media', mediaCount: '{n} tệp',
    toastReceived: 'Đã nhận sản phẩm {name}', toastFilledPrev: 'Đã điền theo lần trước', toastNoPrev: 'Chưa có dữ liệu lần trước',
  },
  en: {
    'title.product': 'Which product to declare?',
    'title.event': 'Choose the Event to declare',
    'title.who': 'Who performed it?',
    'title.where': 'Where was it done?',
    'title.what': 'What was done?',
    'title.fields': 'Detailed information',
    'title.media': 'Photos / evidence',
    'title.time': 'When was it done?',
    'title.review': 'Review & submit',
    done: 'Declaration submitted', doneSub: 'Traceability data has been recorded.',
    step: 'Step {n} / {total}', appTitle: 'Traceability entry',
    lotPrefix: 'Lot', productHint: 'Scan a QR, pick an assigned task, or choose a product.',
    back: 'Back', next: 'Continue', finish: 'Complete declaration',
    myTasks: 'Your tasks', need: 'Need:', due: 'due', note: 'Note:', doNow: 'Do now',
    scanQr: 'Scan QR', gtinPh: 'GTIN from QR', receive: 'Receive', camOff: 'Off', camera: 'Camera',
    searchProductPh: 'Search product by name / GTIN…', flowsUnit: 'flows', noProducts: 'No products within your scope.',
    lotLabel: 'Lot / production date', lotPerLot: '· one QR per lot', lotByLot: '· identified by lot', lotPh: 'e.g. LOT-2407-01',
    noFlow: 'This product has no Flow assigned. Ask a manager to assign it in "Products".',
    flowApply: 'Applied Flow', flowChoose: '— choose Flow —', chooseFlowFirst: 'Choose a Flow to continue.',
    noPerm: 'You are not authorized to declare for this Flow. Contact a manager.',
    epcis5: '5 EPCIS elements', fieldsUnit: 'fields',
    me: 'Me', orEnterPerformer: 'Or enter the performer name', performerPh: 'Performer name',
    whereLabel: 'Place of performance', wherePh: 'e.g. An Giang factory', gpsToast: '📍 GPS captured', whereHint: 'Can be left blank if not needed.',
    whatLabel: 'Action performed', whatPh: 'e.g. Packed the lot, passed inspection…',
    fillPrev: 'Fill from last time', linkPh: 'Paste image/video/file link (https://…)', mediaHint: 'This step is optional.',
    timeLabel: 'Time performed',
    rProduct: 'Product', rGtin: 'GTIN', rLot: 'Lot / prod. date', rEvent: 'Event', rPerformer: 'Performer',
    rLocation: 'Location', rAction: 'Action', rTime: 'Time', rMedia: 'Media', mediaCount: '{n} files',
    toastReceived: 'Received product {name}', toastFilledPrev: 'Filled from last time', toastNoPrev: 'No data from last time',
  },
};

export default function Entry() {
  const nav = useNavigate();
  const toast = useToast();
  const t = useT(MSG);
  const { user } = useAuth();
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [when, setWhen] = useState(nowLocal());
  const [action, setAction] = useState('');
  const [performerName, setPerformerName] = useState(user?.fullName ?? '');
  const [lot, setLot] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [item, setItem] = useState<any>(null);
  const [flowId, setFlowId] = useState('');
  const [event, setEvent] = useState<any>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [location, setLocation] = useState('');
  const [media, setMedia] = useState<any[]>([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [productQ, setProductQ] = useState('');
  const [scanGtin, setScanGtin] = useState('');
  const [camera, setCamera] = useState(false);

  const products = useQuery<Product[]>({ queryKey: ['products'], queryFn: () => api.get('/products').then((r) => r.data) });
  const myTasks = useQuery<TraceTask[]>({ queryKey: ['my-tasks'], queryFn: () => api.get('/trace-tasks', { params: { mine: 1 } }).then((r) => r.data) });
  const flowDetail = useQuery({ queryKey: ['flow', flowId], enabled: !!flowId, queryFn: () => api.get(`/flows/${flowId}`).then((r) => r.data) });
  const version = flowDetail.data?.versions?.[0];
  const events = useQuery<EventDefinition[]>({ queryKey: ['entry-events', version?.id], enabled: !!version?.id, queryFn: () => api.get(`/flow-versions/${version.id}/entry-events`).then((r) => r.data) });

  const flowOptions = (product?.flows ?? []).map((x: any) => x.flow);
  const ensureItem = useMutation({ mutationFn: (vars: { productId: string; lot?: string }) => api.post('/traceable-items/ensure', vars).then((r) => r.data), onSuccess: (data) => setItem(data) });

  const selectProduct = (p: any, lotVal?: string) => {
    const useLot = lotVal ?? lot;
    setProduct(p); setEvent(null); setValues({}); setMedia([]); setLot(useLot);
    const fl = (p.flows ?? []).map((x: any) => x.flow);
    setFlowId(fl.length === 1 ? fl[0].id : '');
    ensureItem.mutate({ productId: p.id, lot: useLot || undefined });
  };

  const [sp] = useSearchParams();
  const preProductId = sp.get('productId');
  useEffect(() => {
    if (preProductId && !product && products.data) {
      const p = products.data.find((x) => x.id === preProductId);
      if (p) selectProduct(p, sp.get('lot') ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preProductId, products.data]);

  const resolveScan = async (gtin: string) => {
    try { const { data } = await api.get('/products/by-gtin', { params: { gtin } }); selectProduct(data); toast(t('toastReceived', { name: data.name })); }
    catch (e) { toast(apiError(e), false); }
  };
  const onScan = (text: string) => {
    setCamera(false);
    let gtin = text;
    try { const u = new URL(text); gtin = u.pathname.split('/t/')[1] || u.searchParams.get('gtin') || text; } catch { /* raw */ }
    setScanGtin(gtin); resolveScan(gtin);
  };

  const applySuggestion = async () => {
    if (!event || !item) return;
    const { data } = await api.get('/event-records/suggestions', { params: { eventDefinitionId: event.id, traceableItemId: item.id } });
    if (data.hasPrevious) { setValues((v) => ({ ...data.copyPrevious, ...v })); toast(t('toastFilledPrev')); }
    else toast(t('toastNoPrev'), false);
  };
  const uploadFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      const fd = new FormData(); fd.append('file', f);
      try { const { data } = await api.post('/uploads', fd); setMedia((m) => [...m, data]); } catch (e) { toast(apiError(e), false); }
    }
  };
  const addLink = () => {
    const u = linkUrl.trim(); if (!u) return;
    const kind = /\.(png|jpe?g|webp|gif|svg)$/i.test(u) ? 'image' : /\.(mp4|webm|mov|avi|mkv)$/i.test(u) ? 'video' : 'file';
    setMedia((m) => [...m, { kind, url: u, fileName: u.split('/').pop() }]); setLinkUrl('');
  };

  const submit = useMutation({
    mutationFn: async () => {
      const draft = await api.post('/event-records', {
        traceableItemId: item.id, flowVersionId: version.id, eventDefinitionId: event.id,
        location, performedAt: new Date(when).toISOString(), action, performedByName: performerName || undefined, values,
        media: media.map((m) => ({ kind: m.kind, url: m.url, fileName: m.fileName, mimeType: m.mimeType, sizeBytes: m.sizeBytes, publicVisible: true })),
      });
      return api.post(`/event-records/${draft.data.id}/submit`);
    },
    onSuccess: () => { setDone(true); setTimeout(() => nav('/'), 1400); },
    onError: (e) => toast(apiError(e), false),
  });

  const noFlow = product && flowOptions.length === 0;
  const noPermission = !!version && !events.isLoading && (events.data ?? []).length === 0;

  // Progressive disclosure: chỉ hiện bước cần thiết
  const screens = useMemo(() => {
    const s = ['product', 'event'];
    if (event) { s.push('who', 'where', 'what'); if ((event.fields?.length ?? 0) > 0) s.push('fields'); s.push('media', 'time', 'review'); }
    return s;
  }, [event]);
  useEffect(() => { if (idx > screens.length - 1) setIdx(screens.length - 1); }, [screens.length, idx]);

  const screen = screens[idx];
  const total = screens.length;
  const requiredOk = (event?.fields ?? []).filter((f: any) => f.required).every((f: any) => values[f.key] !== undefined && values[f.key] !== '');
  const canNext =
    screen === 'product' ? !!(product && item && flowOptions.length > 0) :
    screen === 'event' ? !!event :
    screen === 'fields' ? requiredOk : true;
  const isLast = screen === 'review';

  const shownProducts = (products.data ?? []).filter((p) => !productQ || p.name.toLowerCase().includes(productQ.toLowerCase()) || (p.gtin ?? '').includes(productQ));
  const openTasks = (myTasks.data ?? []).filter((t) => t.status !== 'DONE');
  // Nhãn tĩnh cho danh sách nhiệm vụ (biến map dùng tên `t` nên trích trước để tránh che khuất hàm dịch).
  const taskLbl = { need: t('need'), lot: t('lotPrefix'), due: t('due'), note: t('note'), doNow: t('doNow') };

  if (done) return (
    <div className="min-h-[70vh] grid place-items-center text-center px-6">
      <div>
        <div className="w-24 h-24 rounded-3xl grid place-items-center mx-auto mb-5 pop" style={{ background: 'var(--good-soft)', color: 'var(--good)' }}><Check size={48} /></div>
        <h2 className="text-2xl font-extrabold">{t('done')}</h2>
        <p className="text-[var(--muted)] mt-1">{t('doneSub')}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-[480px] mx-auto pb-4">
      {/* App bar */}
      <div className="flex items-center gap-2 mb-3">
        <button className="btn btn-ghost btn-sm" disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}><ChevronLeft size={20} /></button>
        <div className="flex-1 text-center">
          <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--faint)]">{t('step', { n: idx + 1, total })}</div>
          <div className="text-[13px] font-semibold">{t('appTitle')}</div>
        </div>
        <div className="w-9" />
      </div>
      <div className="mb-5"><ProgressBar value={((idx + 1) / total) * 100} /></div>

      <div key={screen} className="anim-in">
        <h2 className="text-[23px] font-extrabold tracking-tight mb-1" style={{ textWrap: 'balance' } as any}>{t('title.' + screen)}</h2>
        {product && screen !== 'product' && <p className="text-[13px] text-[var(--muted)] mb-4">{product.name} · <span className="mono">{product.gtin}</span>{lot ? ` · ${t('lotPrefix')} ${lot}` : ''}</p>}
        {screen === 'product' && <p className="text-[13px] text-[var(--muted)] mb-4">{t('productHint')}</p>}
        <div className="mt-1">{renderScreen()}</div>
      </div>

      {/* Sticky CTA */}
      <div className="sticky bottom-3 mt-6 flex gap-2.5" style={{ zIndex: 5 }}>
        {idx > 0 && <button className="btn" style={{ minHeight: 52 }} onClick={() => setIdx((i) => i - 1)}><ChevronLeft size={18} />{t('back')}</button>}
        {!isLast
          ? <button className="btn btn-primary btn-lg" disabled={!canNext} onClick={() => setIdx((i) => i + 1)}>{t('next')} <ArrowRight size={18} /></button>
          : <button className="btn btn-primary btn-lg" disabled={submit.isPending} onClick={() => submit.mutate()}>{submit.isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} {t('finish')}</button>}
      </div>
    </div>
  );

  function renderScreen() {
    if (screen === 'product') return (
      <div className="flex flex-col gap-3">
        {openTasks.length > 0 && (
          <div className="card p-3.5" style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent)' }}>
            <div className="flex items-center gap-2 mb-2 text-[13px] font-bold" style={{ color: 'var(--accent-ink)' }}><ClipboardList size={16} />{t('myTasks')}</div>
            <div className="flex flex-col gap-1.5 overflow-y-auto pr-1" style={{ maxHeight: 176 }}>
              {openTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2 flex-wrap p-2.5 rounded-xl" style={{ background: 'var(--card)' }}>
                  <div className="flex-1 min-w-[150px]">
                    <b className="text-[13px]">{t.name || t.product?.name}</b>
                    <div className="text-[11px] text-[var(--muted)]">{taskLbl.need} {t.product?.name}{t.lot ? ` · ${taskLbl.lot} ${t.lot}` : ''} · {taskLbl.due} {new Date(t.endDate).toLocaleDateString('vi-VN')}</div>
                    {t.note && <div className="text-[11px] text-[var(--ink-2)]">{taskLbl.note} {t.note}</div>}
                  </div>
                  <button className="btn btn-sm btn-primary" onClick={() => { const p = (products.data ?? []).find((x) => x.id === t.product?.id); if (p) selectProduct(p, t.lot ?? ''); }}>{taskLbl.doNow}</button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="card p-3.5">
          <div className="flex items-center gap-2 mb-2 text-[13px] font-semibold"><ScanLine size={16} className="text-[var(--accent)]" />{t('scanQr')}</div>
          <div className="flex flex-wrap gap-2">
            <input className="input mono flex-1 min-w-[150px]" placeholder={t('gtinPh')} value={scanGtin} onChange={(e) => setScanGtin(e.target.value)} />
            <button className="btn btn-primary" disabled={!scanGtin} onClick={() => resolveScan(scanGtin)}><ScanLine size={15} />{t('receive')}</button>
            <button className="btn" onClick={() => setCamera((c) => !c)}><Camera size={15} />{camera ? t('camOff') : t('camera')}</button>
          </div>
          {camera && <div className="mt-3"><QrScanner onResult={onScan} onClose={() => setCamera(false)} /></div>}
        </div>

        <div className="flex items-center gap-2 rounded-full px-4 py-2.5" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
          <Search size={16} className="text-[var(--muted)]" />
          <input className="flex-1 bg-transparent outline-none text-sm" placeholder={t('searchProductPh')} value={productQ} onChange={(e) => setProductQ(e.target.value)} />
        </div>
        {products.isLoading ? <Spinner /> : (
          <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: 268 }}>
            {shownProducts.map((p) => (
              <button key={p.id} onClick={() => selectProduct(p)} className={`opt ${product?.id === p.id ? 'sel' : ''}`}>
                <span className="w-9 h-9 rounded-xl grid place-items-center flex-none" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Package size={17} /></span>
                <div className="flex-1"><b className="text-sm">{p.name}</b><div className="text-xs text-[var(--muted)] mono">{p.gtin} · {(p.flows ?? []).length} {t('flowsUnit')}</div></div>
                {product?.id === p.id && <Check size={18} className="text-[var(--accent)]" />}
              </button>
            ))}
            {shownProducts.length === 0 && <p className="text-sm text-[var(--muted)] py-2">{t('noProducts')}</p>}
          </div>
        )}
        {product && (
          <label className="block">
            <span className="label">{t('lotLabel')} {product.traceMode === 'PER_LOT' ? t('lotPerLot') : t('lotByLot')}</span>
            <input className="input mono" value={lot} onChange={(e) => setLot(e.target.value)} onBlur={() => ensureItem.mutate({ productId: product.id, lot: lot || undefined })} placeholder={t('lotPh')} />
          </label>
        )}
        {noFlow && <div className="p-3 rounded-xl text-sm flex items-center gap-2 pill-warn"><ShieldAlert size={16} />{t('noFlow')}</div>}
      </div>
    );

    if (screen === 'event') return (
      <div className="flex flex-col gap-2">
        {flowOptions.length > 1 && (
          <label className="block mb-1">
            <span className="label">{t('flowApply')}</span>
            <select className="input" value={flowId} onChange={(e) => { setFlowId(e.target.value); setEvent(null); }}>
              <option value="">{t('flowChoose')}</option>
              {flowOptions.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
        )}
        {!flowId ? <p className="text-sm text-[var(--muted)]">{t('chooseFlowFirst')}</p>
          : events.isLoading ? <Spinner />
          : noPermission ? <div className="p-4 rounded-xl text-sm flex items-center gap-2 pill-bad"><ShieldAlert size={18} />{t('noPerm')}</div>
          : <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: 300 }}>{(events.data ?? []).map((ev) => (
            <button key={ev.id} onClick={() => setEvent(ev)} className={`opt ${event?.id === ev.id ? 'sel' : ''}`}>
              <span className="w-8 h-8 rounded-full grid place-items-center flex-none text-[13px] font-bold" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>{ev.order}</span>
              <div className="flex-1"><b className="text-sm">{ev.name}</b><div className="text-xs text-[var(--muted)]">{t('epcis5')}{(ev.fields?.length ?? 0) > 0 ? ` · +${ev.fields?.length} ${t('fieldsUnit')}` : ''}</div></div>
              {event?.id === ev.id && <Check size={18} className="text-[var(--accent)]" />}
            </button>
          ))}</div>}
      </div>
    );

    if (screen === 'who') return (
      <div className="flex flex-col gap-2.5">
        {user?.fullName && <button className={`opt ${performerName === user.fullName ? 'sel' : ''}`} onClick={() => setPerformerName(user.fullName)}>
          <span className="serif w-9 h-9 rounded-full grid place-items-center text-sm font-bold flex-none" style={{ color: 'var(--accent-contrast)', background: 'linear-gradient(135deg,var(--accent),var(--accent-2))' }}>{user.fullName.split(' ').slice(-1)[0]?.[0]}</span>
          <div className="flex-1"><b className="text-sm">{t('me')}</b><div className="text-xs text-[var(--muted)]">{user.fullName}</div></div>
          {performerName === user.fullName && <Check size={18} className="text-[var(--accent)]" />}
        </button>}
        <label className="block"><span className="label">{t('orEnterPerformer')}</span>
          <input className="input" value={performerName} onChange={(e) => setPerformerName(e.target.value)} placeholder={t('performerPh')} /></label>
      </div>
    );

    if (screen === 'where') return (
      <label className="block"><span className="label">{t('whereLabel')}</span>
        <div className="flex gap-2">
          <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t('wherePh')} />
          <button type="button" className="btn" onClick={() => { setLocation('GPS 10.523, 105.126'); toast(t('gpsToast')); }}><MapPin size={18} /></button>
        </div>
        <p className="ws-hint text-[12px] text-[var(--muted)] mt-2">{t('whereHint')}</p>
      </label>
    );

    if (screen === 'what') return (
      <label className="block"><span className="label">{t('whatLabel')}</span>
        <textarea className="input min-h-[90px]" value={action} onChange={(e) => setAction(e.target.value)} placeholder={t('whatPh')} />
      </label>
    );

    if (screen === 'fields') return (
      <div className="flex flex-col gap-3.5">
        <button className="btn btn-sm self-start" onClick={applySuggestion}><Copy size={14} />{t('fillPrev')}</button>
        {(event.fields ?? []).map((f: any) => (
          <label key={f.id} className="block">
            <span className="label">{f.label}{f.required && <span className="text-[var(--danger)]"> *</span>}</span>
            <FieldInput field={f} value={values[f.key]} onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))} />
          </label>
        ))}
      </div>
    );

    if (screen === 'media') return (
      <div>
        <div className="flex flex-wrap gap-2.5">
          {media.map((m, i) => (
            <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
              {m.kind === 'image' ? <img src={fileUrl(m.url)} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full grid place-items-center text-[9px] text-center text-[var(--muted)] p-1">{m.kind}<br />{m.url?.startsWith('http') ? '🔗' : ''}</div>}
              <button className="absolute top-0 right-0 bg-black/50 text-white p-1" onClick={() => setMedia(media.filter((_, j) => j !== i))}><Trash2 size={12} /></button>
            </div>
          ))}
          <label className="w-20 h-20 rounded-xl border-2 border-dashed grid place-items-center cursor-pointer text-[var(--accent)]" style={{ borderColor: 'var(--border-strong)' }}>
            <Camera size={22} />
            <input type="file" accept="image/*,video/*,application/pdf" multiple className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
          </label>
        </div>
        <div className="flex gap-2 mt-3">
          <input className="input flex-1" placeholder={t('linkPh')} value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }} />
          <button className="btn" disabled={!linkUrl.trim()} onClick={addLink}><Link2 size={15} /></button>
        </div>
        <p className="text-[12px] text-[var(--muted)] mt-3">{t('mediaHint')}</p>
      </div>
    );

    if (screen === 'time') return (
      <label className="block"><span className="label">{t('timeLabel')}</span>
        <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </label>
    );

    if (screen === 'review') return (
      <div className="card p-4 flex flex-col rows">
        <Row k={t('rProduct')} v={product?.name} />
        <Row k={t('rGtin')} v={product?.gtin} mono />
        <Row k={t('rLot')} v={lot || '—'} />
        <Row k={t('rEvent')} v={event?.name} />
        <Row k={t('rPerformer')} v={performerName} />
        <Row k={t('rLocation')} v={location || '—'} />
        <Row k={t('rAction')} v={action || '—'} />
        {(event?.fields ?? []).map((f: any) => <Row key={f.id} k={f.label} v={String(values[f.key] ?? '—')} />)}
        <Row k={t('rTime')} v={when.replace('T', ' ')} />
        <Row k={t('rMedia')} v={t('mediaCount', { n: media.length })} />
      </div>
    );

    return null;
  }
}

function FieldInput({ field, value, onChange }: { field: any; value: any; onChange: (v: any) => void }) {
  const t = field.type;
  if (t === 'textarea') return <textarea className="input min-h-[70px]" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
  if (t === 'number') return <input className="input num" type="number" value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))} />;
  if (t === 'date') return <input className="input" type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
  if (t === 'datetime') return <input className="input" type="datetime-local" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
  if (t === 'boolean' || t === 'checkbox') return <input type="checkbox" className="w-6 h-6" checked={!!value} onChange={(e) => onChange(e.target.checked)} />;
  if (t === 'select' && Array.isArray(field.options))
    return <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}><option value="">—</option>{field.options.map((o: string) => <option key={o}>{o}</option>)}</select>;
  return <input className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
}

