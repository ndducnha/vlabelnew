import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ReactFlow, Background, Controls, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Route as RouteIcon, MapPin, Map as MapIcon, ListChecks, Play, Pause, SkipBack, SkipForward, Gauge,
  Ruler, Clock, Navigation, CircleCheck, Circle, Printer, Plus, Trash2, Pencil, X, Search, Building2, Milestone,
} from '../lib/icons';
import { api } from '../lib/api';
import { PageHead, Spinner, EmptyState, StatCard, Drawer } from '../components/ui';
import { useT, type Messages } from '../lib/i18n';
import { loadLocations, saveLocations, matchLocation, distanceKm, LOC_TYPES, typeColor, DEFAULT_LOCATIONS, type Loc } from './journey/locations';

const MSG: Messages = {
  vi: {
    title: 'Hành trình truy xuất', subtitle: 'Trực quan hóa đường đi của sản phẩm theo Sự kiện trong Luồng',
    locations: 'Địa điểm', exportPdf: 'Xuất PDF',
    product: 'Sản phẩm', searchPh: 'Tìm nhanh…', lotQr: 'Lô / QR', allLots: 'Tất cả lô', flow: 'Luồng', allFlows: 'Tất cả Luồng',
    kpiDistance: 'Tổng quãng đường', kpiVisited: 'Điểm đã qua', kpiTime: 'Thời gian', kpiEvents: 'Sự kiện', kpiCurrent: 'Điểm hiện tại', kpiNext: 'Tiếp theo',
    tabMap: 'Bản đồ', tabEnterprise: 'Sơ đồ DN', tabTimeline: 'Dòng thời gian',
    tgPath: 'Đường đi', tgMarkers: 'Điểm mốc', tgDistance: 'Khoảng cách', tgInfo: 'Thông tin',
    emptyTitle: 'Chưa có điểm hành trình', emptyHint: 'Sản phẩm/lô này chưa có Sự kiện nào được duyệt kèm địa điểm. Kê khai Sự kiện hoặc gán địa điểm doanh nghiệp để hiện trên bản đồ.',
    done: 'Đã hoàn thành', eventFallback: 'Sự kiện', dash: '—',
    hoursUnit: '{n} giờ', daysUnit: '{n} ngày',
    noGps: 'Các điểm chưa có toạ độ · gán GPS trong "Địa điểm"',
    tlEmptyTitle: 'Chưa có Sự kiện', tlEmptyHint: 'Sản phẩm chưa gắn Luồng có Sự kiện.', tlDone: 'Đã hoàn thành', tlPending: 'Chưa thực hiện', lotPrefix: 'Lô',
    lmTitle: 'Địa điểm doanh nghiệp', lmReset: 'Khôi phục mặc định', lmAdd: 'Thêm địa điểm', lmEdit: 'Sửa địa điểm', lmNew: 'Địa điểm mới',
    fName: 'Tên *', fCode: 'Mã', fType: 'Loại', fAddress: 'Địa chỉ', fLat: 'Vĩ độ (lat)', fLng: 'Kinh độ (lng)', fColor: 'Màu hiển thị', fColorHint: 'Mặc định theo loại; đổi nếu cần.', fNote: 'Ghi chú', lmSave: 'Lưu địa điểm',
    lmMatch1: 'Sự kiện khớp địa điểm theo ', lmMatchBold: 'tên', lmMatch2: '. Toạ độ dùng cho bản đồ thực; màu/loại dùng cho sơ đồ.', lmEmpty: 'Chưa có địa điểm nào.', noGpsShort: 'chưa có GPS',
  },
  en: {
    title: 'Traceability journey', subtitle: 'Visualize the product path by Events across the Flow',
    locations: 'Locations', exportPdf: 'Export PDF',
    product: 'Product', searchPh: 'Quick search…', lotQr: 'Batch / QR', allLots: 'All batches', flow: 'Flow', allFlows: 'All Flows',
    kpiDistance: 'Total distance', kpiVisited: 'Points visited', kpiTime: 'Duration', kpiEvents: 'Events', kpiCurrent: 'Current point', kpiNext: 'Next',
    tabMap: 'Map', tabEnterprise: 'Diagram', tabTimeline: 'Timeline',
    tgPath: 'Path', tgMarkers: 'Markers', tgDistance: 'Distance', tgInfo: 'Info',
    emptyTitle: 'No journey points yet', emptyHint: 'This product/batch has no approved Events with a location yet. Record Events or assign business locations to show them on the map.',
    done: 'Completed', eventFallback: 'Event', dash: '—',
    hoursUnit: '{n} h', daysUnit: '{n} days',
    noGps: 'Points have no coordinates · assign GPS in "Locations"',
    tlEmptyTitle: 'No Events yet', tlEmptyHint: 'Product has no Flow with Events attached.', tlDone: 'Completed', tlPending: 'Not done', lotPrefix: 'Batch',
    lmTitle: 'Business locations', lmReset: 'Restore defaults', lmAdd: 'Add location', lmEdit: 'Edit location', lmNew: 'New location',
    fName: 'Name *', fCode: 'Code', fType: 'Type', fAddress: 'Address', fLat: 'Latitude (lat)', fLng: 'Longitude (lng)', fColor: 'Display color', fColorHint: 'Defaults by type; change if needed.', fNote: 'Note', lmSave: 'Save location',
    lmMatch1: 'Events match a location by ', lmMatchBold: 'name', lmMatch2: '. Coordinates power the real map; color/type power the diagram.', lmEmpty: 'No locations yet.', noGpsShort: 'no GPS',
  },
};

const vnDateTime = (x?: string | null) => (x ? new Date(x).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const bearing = (a: any, b: any) => { const R = (d: number) => (d * Math.PI) / 180, D = (r: number) => (r * 180) / Math.PI; const y = Math.sin(R(b.lng - a.lng)) * Math.cos(R(b.lat)); const x = Math.cos(R(a.lat)) * Math.sin(R(b.lat)) - Math.sin(R(a.lat)) * Math.cos(R(b.lat)) * Math.cos(R(b.lng - a.lng)); return (D(Math.atan2(y, x)) + 360) % 360; };

export default function JourneyMap() {
  const t = useT(MSG);
  const fmtDur = (ms: number) => { if (ms <= 0) return t('dash'); const h = Math.round(ms / 36e5); if (h < 48) return t('hoursUnit', { n: h }); return t('daysUnit', { n: Math.round(h / 24) }); };
  const products = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products').then((r) => r.data) });
  const flowsAll = useQuery({ queryKey: ['flows-all'], queryFn: () => api.get('/flows').then((r) => r.data) });
  const [productId, setProductId] = useState('');
  const [lot, setLot] = useState('all');
  const [flowId, setFlowId] = useState('all');
  const [tab, setTab] = useState<'timeline' | 'map' | 'enterprise'>('map');
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [show, setShow] = useState({ path: true, markers: true, distance: true, info: true });
  const [locs, setLocs] = useState<Loc[]>(() => loadLocations());
  const [manageLoc, setManageLoc] = useState(false);
  const [pq, setPq] = useState('');

  useEffect(() => { if (!productId && products.data?.length) setProductId(products.data[0].id); }, [products.data, productId]);

  const records = useQuery({ queryKey: ['recs-by-product', productId], enabled: !!productId, queryFn: () => api.get('/event-records/by-product', { params: { productId } }).then((r) => r.data) });
  const product = (products.data ?? []).find((p: any) => p.id === productId);

  // Flow của sản phẩm + map eventDefinitionId -> flowId
  const productFlows = useMemo(() => {
    const ids = new Set((product?.flows ?? []).map((x: any) => x.flow?.id ?? x.flowId));
    return (flowsAll.data ?? []).filter((f: any) => ids.has(f.id));
  }, [product, flowsAll.data]);
  const defToFlow = useMemo(() => { const m = new Map<string, string>(); for (const f of productFlows) for (const ev of (f.versions?.[0]?.eventDefinitions ?? [])) m.set(ev.id, f.id); return m; }, [productFlows]);
  const flowEvents = useMemo<any[]>(() => {
    const list = productFlows.filter((f: any) => flowId === 'all' || f.id === flowId).flatMap((f: any) => (f.versions?.[0]?.eventDefinitions ?? []).map((ev: any) => ({ ...ev, flowId: f.id, flowName: f.name })));
    return list.sort((a: any, b: any) => a.order - b.order);
  }, [productFlows, flowId]);

  const lots = useMemo(() => Array.from(new Set((records.data ?? []).map((r: any) => r.traceableItem?.batchOrLot).filter(Boolean))), [records.data]);

  // Các điểm đã đi qua (bản ghi đã duyệt) trong phạm vi lọc, có toạ độ
  const stops = useMemo<any[]>(() => {
    const done = new Set(['APPROVED', 'LOCKED']);
    let recs = (records.data ?? []).filter((r: any) => done.has(r.status));
    if (lot !== 'all') recs = recs.filter((r: any) => r.traceableItem?.batchOrLot === lot);
    if (flowId !== 'all') recs = recs.filter((r: any) => defToFlow.get(r.eventDefinitionId) === flowId);
    recs = recs.slice().sort((a: any, b: any) => (a.eventDefinition?.order ?? 0) - (b.eventDefinition?.order ?? 0) || new Date(a.performedAt ?? 0).getTime() - new Date(b.performedAt ?? 0).getTime());
    return recs.map((r: any) => {
      const loc = matchLocation(locs, r.location);
      const gps = (r.gpsLat != null && r.gpsLng != null) ? { lat: r.gpsLat, lng: r.gpsLng } : (loc?.lat != null && loc?.lng != null) ? { lat: loc.lat, lng: loc.lng } : null;
      return {
        id: r.id, event: r.eventDefinition?.name ?? t('eventFallback'), order: r.eventDefinition?.order ?? 0, eventDefinitionId: r.eventDefinitionId,
        location: r.location || loc?.name || '—', locObj: loc, gps, color: typeColor(loc?.type, loc?.color),
        performedAt: r.performedAt, performer: r.performedBy?.fullName ?? r.performedByName ?? '—', action: r.action, lot: r.traceableItem?.batchOrLot, status: r.status,
      };
    });
  }, [records.data, lot, flowId, defToFlow, locs, t]);

  // Dòng thời gian đầy đủ: mọi công đoạn của Flow, đánh dấu đã/chưa hoàn thành
  const timeline = useMemo<any[]>(() => {
    const byDef = new Map<string, any>();
    for (const s of stops) if (!byDef.has(s.eventDefinitionId)) byDef.set(s.eventDefinitionId, s);
    return flowEvents.map((ev: any) => ({ ev, stop: byDef.get(ev.id) ?? null, done: byDef.has(ev.id) }));
  }, [flowEvents, stops]);

  useEffect(() => { setCurrent(0); setPlaying(false); }, [productId, lot, flowId]);
  useEffect(() => { if (current > stops.length - 1) setCurrent(Math.max(0, stops.length - 1)); }, [stops.length, current]);

  // Playback
  useEffect(() => {
    if (!playing) return;
    if (current >= stops.length - 1) { setPlaying(false); return; }
    const timer = setTimeout(() => setCurrent((c) => Math.min(stops.length - 1, c + 1)), 1400 / speed);
    return () => clearTimeout(timer);
  }, [playing, current, speed, stops.length]);

  // Dashboard
  const gpsStops = stops.filter((s) => s.gps);
  const totalKm = gpsStops.reduce((sum, s, i) => (i === 0 ? 0 : sum + distanceKm(gpsStops[i - 1].gps!, s.gps!)), 0);
  const times = stops.map((s) => s.performedAt).filter(Boolean).map((x) => new Date(x).getTime());
  const totalMs = times.length ? Math.max(...times) - Math.min(...times) : 0;
  const doneCount = timeline.filter((x) => x.done).length;
  const flowDone = flowEvents.length > 0 && doneCount === flowEvents.length;
  const nextEvent = timeline.find((x) => !x.done)?.ev?.name ?? (flowDone ? t('done') : '—');

  const shownProducts = (products.data ?? []).filter((p: any) => !pq || p.name.toLowerCase().includes(pq.toLowerCase()) || (p.gtin ?? '').includes(pq));

  return (
    <>
      <PageHead title={t('title')} subtitle={t('subtitle')}
        actions={<>
          <button className="btn" onClick={() => setManageLoc(true)}><Building2 size={15} />{t('locations')}</button>
          <button className="btn" onClick={() => window.print()}><Printer size={15} />{t('exportPdf')}</button>
        </>} />

      {/* Bộ lọc nguồn hành trình */}
      <div className="card p-3.5 mb-4 flex flex-wrap items-end gap-3">
        <label className="block flex-1 min-w-[220px]"><span className="label">{t('product')}</span>
          <div className="flex items-center gap-2 rounded-[12px] px-3 h-11" style={{ border: '1px solid var(--border-strong)', background: 'var(--bg)' }}>
            <Search size={15} className="text-[var(--muted)]" />
            <input className="bg-transparent outline-none text-sm flex-1" placeholder={t('searchPh')} value={pq} onChange={(e) => setPq(e.target.value)} />
          </div>
          <select className="input mt-2" value={productId} onChange={(e) => setProductId(e.target.value)}>
            {shownProducts.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.gtin})</option>)}
          </select>
        </label>
        <label className="block"><span className="label">{t('lotQr')}</span>
          <select className="input" style={{ minWidth: 160 }} value={lot} onChange={(e) => setLot(e.target.value)}>
            <option value="all">{t('allLots')}</option>
            {lots.map((l: any) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label className="block"><span className="label">{t('flow')}</span>
          <select className="input" style={{ minWidth: 170 }} value={flowId} onChange={(e) => setFlowId(e.target.value)}>
            <option value="all">{t('allFlows')}</option>
            {productFlows.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
      </div>

      {/* Dashboard hành trình */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
        <StatCard icon={<Ruler size={16} />} label={t('kpiDistance')} value={`${totalKm.toFixed(1)} km`} />
        <StatCard icon={<MapPin size={16} />} label={t('kpiVisited')} value={gpsStops.length} tone="accent" />
        <StatCard icon={<Clock size={16} />} label={t('kpiTime')} value={fmtDur(totalMs)} />
        <StatCard icon={<ListChecks size={16} />} label={t('kpiEvents')} value={`${doneCount}/${flowEvents.length}`} tone={flowDone ? 'good' : 'warn'} />
        <StatCard icon={<Navigation size={16} />} label={t('kpiCurrent')} value={stops[current]?.event ?? '—'} tone="accent" />
        <StatCard icon={<Milestone size={16} />} label={t('kpiNext')} value={nextEvent} tone={flowDone ? 'good' : 'warn'} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <div className="tabbar" style={{ maxWidth: 360 }}>
          {([['map', t('tabMap'), MapIcon], ['enterprise', t('tabEnterprise'), RouteIcon], ['timeline', t('tabTimeline'), ListChecks]] as const).map(([k, l, Icon]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k as any)}><Icon size={14} />{l}</button>
          ))}
        </div>
        {tab !== 'timeline' && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {([['path', t('tgPath')], ['markers', t('tgMarkers')], ['distance', t('tgDistance')], ['info', t('tgInfo')]] as const).map(([k, l]) => (
              <button key={k} className={`chip ${(show as any)[k] ? 'chip-accent' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setShow((s) => ({ ...s, [k]: !(s as any)[k] }))}>{l}</button>
            ))}
          </div>
        )}
      </div>

      {records.isLoading ? <Spinner /> : stops.length === 0 && tab !== 'timeline' ? (
        <div className="card"><EmptyState title={t('emptyTitle')} hint={t('emptyHint')} /></div>
      ) : (
        <>
          {tab === 'map' && <RealMap key={productId + lot + flowId} stops={stops} current={current} show={show} noGpsText={t('noGps')} />}
          {tab === 'enterprise' && <EnterpriseMap stops={stops} current={current} show={show} />}
          {tab === 'timeline' && <TimelineView timeline={timeline} current={current} onPick={(i: number) => setCurrent(i)} />}
        </>
      )}

      {/* Playback */}
      {stops.length > 0 && (
        <div className="card p-3 mt-4 flex items-center gap-3 flex-wrap sticky bottom-3" style={{ zIndex: 5 }}>
          <div className="flex items-center gap-1">
            <button className="btn btn-sm" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}><SkipBack size={15} /></button>
            <button className="btn btn-primary btn-sm" onClick={() => { if (current >= stops.length - 1) setCurrent(0); setPlaying((p) => !p); }}>{playing ? <Pause size={15} /> : <Play size={15} />}</button>
            <button className="btn btn-sm" onClick={() => setCurrent((c) => Math.min(stops.length - 1, c + 1))} disabled={current >= stops.length - 1}><SkipForward size={15} /></button>
          </div>
          <div className="flex-1 min-w-[160px]">
            <input type="range" min={0} max={Math.max(0, stops.length - 1)} value={current} onChange={(e) => { setPlaying(false); setCurrent(Number(e.target.value)); }} style={{ width: '100%' }} />
            <div className="text-[11px] text-[var(--muted)] mt-0.5">{current + 1}/{stops.length} · {stops[current]?.event} · {vnDateTime(stops[current]?.performedAt)}</div>
          </div>
          <label className="flex items-center gap-1.5 text-sm"><Gauge size={14} className="text-[var(--muted)]" />
            <select className="input" style={{ width: 78, padding: '4px 8px' }} value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
              {[0.5, 1, 2, 4].map((s) => <option key={s} value={s}>{s}×</option>)}
            </select>
          </label>
        </div>
      )}

      {manageLoc && <LocationManager locs={locs} onChange={(l) => { setLocs(l); saveLocations(l); }} onClose={() => setManageLoc(false)} />}
    </>
  );
}

// ══════════ Bản đồ thực (Leaflet / OpenStreetMap) ══════════
function RealMap({ stops, current, show, noGpsText }: any) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { scrollWheelZoom: true }).setView([10.9, 106.7], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(m);
    map.current = m;
    setTimeout(() => m.invalidateSize(), 100);
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current; if (!m) return;
    if (layer.current) layer.current.remove();
    const g = L.layerGroup().addTo(m); layer.current = g;
    const gps = stops.filter((s: any) => s.gps);
    const latlngs = gps.map((s: any) => [s.gps.lat, s.gps.lng]) as [number, number][];
    if (show.path && latlngs.length > 1) {
      L.polyline(latlngs, { color: '#14486F', weight: 3.5, opacity: 0.85 }).addTo(g);
      for (let i = 0; i < gps.length - 1; i++) {
        const a = gps[i].gps, b = gps[i + 1].gps; const mid: [number, number] = [(a.lat + b.lat) / 2, (a.lng + b.lng) / 2]; const ang = bearing(a, b) - 90;
        L.marker(mid, { icon: L.divIcon({ className: '', html: `<div style="transform:rotate(${ang}deg);color:#14486F;font-size:18px;line-height:1">▶</div>`, iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(g);
        if (show.distance) L.marker(mid, { icon: L.divIcon({ className: '', html: `<div style="background:#fff;border:1px solid #E7EAF2;border-radius:8px;padding:1px 6px;font-size:10px;font-weight:700;color:#41506B;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.12);transform:translateY(-16px)">${distanceKm(a, b).toFixed(1)} km</div>`, iconSize: [0, 0] }) }).addTo(g);
      }
    }
    if (show.markers) {
      stops.forEach((s: any, i: number) => {
        if (!s.gps) return; const cur = i === current; const c = s.color || '#14486F';
        const html = `<div style="width:30px;height:30px;border-radius:50%;background:${c};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);${cur ? 'outline:3px solid ' + c + '55;' : ''}">${i + 1}</div>`;
        const mk = L.marker([s.gps.lat, s.gps.lng], { icon: L.divIcon({ className: '', html, iconSize: [30, 30], iconAnchor: [15, 15] }), zIndexOffset: cur ? 1000 : 0 }).addTo(g);
        if (show.info) mk.bindPopup(`<b>${i + 1}. ${s.event}</b><br/><span style="color:#6A778F">${s.location}</span><br/>${s.performer} · ${vnDateTime(s.performedAt)}${s.action ? '<br/>' + s.action : ''}`);
        if (cur) mk.openPopup?.();
      });
    }
    if (latlngs.length) m.fitBounds(L.latLngBounds(latlngs).pad(0.35), { maxZoom: 13 });
    else if (stops.length) m.setView([10.9, 106.7], 9);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, show]);

  // Pan tới điểm hiện tại + mở popup
  useEffect(() => {
    const m = map.current, s = stops[current]; if (!m || !s?.gps) return;
    m.panTo([s.gps.lat, s.gps.lng]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const noGps = stops.length > 0 && stops.every((s: any) => !s.gps);
  return (
    <div className="relative">
      <div ref={el} style={{ height: 460, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', zIndex: 0 }} />
      {noGps && <div className="absolute inset-0 grid place-items-center pointer-events-none"><div className="pill pill-warn">{noGpsText}</div></div>}
    </div>
  );
}

// ══════════ Sơ đồ doanh nghiệp (network / React Flow) ══════════
function EnterpriseMap({ stops, current, show }: any) {
  const nodes = useMemo(() => stops.map((s: any, i: number) => ({
    id: String(i), position: { x: i * 230, y: (i % 2) * 120 }, draggable: false,
    data: { label: <div style={{ textAlign: 'left' }}><div style={{ fontWeight: 700, fontSize: 12 }}>{i + 1}. {s.event}</div><div style={{ fontSize: 11, color: '#6A778F' }}>{s.location}</div></div> },
    style: { background: (s.color || '#14486F') + '18', border: `2px solid ${i === current ? s.color || '#14486F' : (s.color || '#14486F') + '66'}`, borderRadius: 14, padding: 10, width: 190, boxShadow: i === current ? `0 0 0 3px ${(s.color || '#14486F')}33` : 'none' },
  })), [stops, current]);
  const edges = useMemo(() => stops.slice(1).map((s: any, i: number) => ({
    id: 'e' + i, source: String(i), target: String(i + 1), animated: i < current,
    markerEnd: show.path ? { type: MarkerType.ArrowClosed, color: '#14486F' } : undefined,
    style: { stroke: show.path ? '#14486F' : 'transparent', strokeWidth: 2 },
    label: show.distance && stops[i].gps && s.gps ? `${distanceKm(stops[i].gps, s.gps).toFixed(1)} km` : undefined,
    labelStyle: { fontSize: 10, fontWeight: 700, fill: '#41506B' }, labelBgStyle: { fill: '#fff' },
  })), [stops, current, show]);
  return (
    <div className="card p-0 overflow-hidden" style={{ height: 460 }}>
      <ReactFlow nodes={nodes as any} edges={edges as any} fitView nodesConnectable={false} elementsSelectable={false} proOptions={{ hideAttribution: true }}>
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

// ══════════ Timeline ══════════
function TimelineView({ timeline, current, onPick }: any) {
  const t = useT(MSG);
  if (timeline.length === 0) return <div className="card"><EmptyState title={t('tlEmptyTitle')} hint={t('tlEmptyHint')} /></div>;
  let doneIdx = -1;
  return (
    <div className="card p-4">
      <div className="relative pl-1">
        {timeline.map((row: any, i: number) => {
          const done = row.done; if (done) doneIdx++; const stopIdx = doneIdx;
          const active = done && stopIdx === current;
          const c = row.stop?.color || 'var(--accent)';
          return (
            <div key={i} className="flex gap-3.5 pb-5 relative">
              {i < timeline.length - 1 && <span className="absolute left-[15px] top-[34px] bottom-0 w-0.5" style={{ background: done ? c : 'var(--border-strong)' }} />}
              <button onClick={() => done && onPick(stopIdx)} className="w-8 h-8 rounded-full grid place-items-center flex-none z-10 text-white" style={{ background: done ? c : 'var(--surface)', color: done ? '#fff' : 'var(--muted)', boxShadow: active ? `0 0 0 4px ${c}44` : '0 0 0 4px var(--card)', cursor: done ? 'pointer' : 'default' }}>
                {done ? <CircleCheck size={16} /> : <Circle size={15} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <b className="text-[14.5px]">{row.ev.name}</b>
                  <span className={`pill ${done ? 'pill-good' : 'pill-neutral'}`} style={{ fontSize: 10.5 }}><i />{done ? t('tlDone') : t('tlPending')}</span>
                  {row.ev.flowName && <span className="chip" style={{ fontSize: 10.5 }}>{row.ev.flowName}</span>}
                </div>
                {row.stop && (
                  <div className="text-[12.5px] text-[var(--muted)] mt-1 flex flex-col gap-0.5">
                    <span className="inline-flex items-center gap-1.5"><MapPin size={12} />{row.stop.location}{row.stop.lot ? ` · ${t('lotPrefix')} ${row.stop.lot}` : ''}</span>
                    <span className="inline-flex items-center gap-1.5"><Clock size={12} />{vnDateTime(row.stop.performedAt)} · {row.stop.performer}</span>
                    {row.stop.action && <span className="text-[var(--ink-2)]">{row.stop.action}</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════ Quản lý địa điểm doanh nghiệp ══════════
function LocationManager({ locs, onChange, onClose }: { locs: Loc[]; onChange: (l: Loc[]) => void; onClose: () => void }) {
  const t = useT(MSG);
  const [edit, setEdit] = useState<Loc | null>(null);
  const blank: Loc = { id: '', name: '', code: '', type: 'factory', address: '', lat: null, lng: null, note: '' };
  const save = (l: Loc) => {
    if (!l.name.trim()) return;
    const item = { ...l, id: l.id || 'loc-' + Date.now(), lat: l.lat === ('' as any) ? null : l.lat, lng: l.lng === ('' as any) ? null : l.lng };
    const exists = locs.some((x) => x.id === item.id);
    onChange(exists ? locs.map((x) => (x.id === item.id ? item : x)) : [...locs, item]);
    setEdit(null);
  };
  const del = (id: string) => onChange(locs.filter((x) => x.id !== id));
  const reset = () => onChange(DEFAULT_LOCATIONS);

  return (
    <Drawer open onClose={onClose} title={<b>{t('lmTitle')}</b>}
      footer={<><button className="btn btn-sm" onClick={reset}>{t('lmReset')}</button><div className="flex-1" /><button className="btn btn-primary" onClick={() => setEdit(blank)}><Plus size={15} />{t('lmAdd')}</button></>}>
      {edit ? (
        <div className="flex flex-col gap-3 anim-in">
          <div className="flex items-center justify-between"><b>{edit.id ? t('lmEdit') : t('lmNew')}</b><button className="btn btn-ghost btn-sm" onClick={() => setEdit(null)}><X size={16} /></button></div>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block"><span className="label">{t('fName')}</span><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
            <label className="block"><span className="label">{t('fCode')}</span><input className="input mono" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value })} /></label>
          </div>
          <label className="block"><span className="label">{t('fType')}</span>
            <select className="input" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })}>
              {Object.entries(LOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label className="block"><span className="label">{t('fAddress')}</span><input className="input" value={edit.address ?? ''} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></label>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block"><span className="label">{t('fLat')}</span><input className="input mono" type="number" step="any" value={edit.lat ?? ''} onChange={(e) => setEdit({ ...edit, lat: e.target.value === '' ? null : Number(e.target.value) })} /></label>
            <label className="block"><span className="label">{t('fLng')}</span><input className="input mono" type="number" step="any" value={edit.lng ?? ''} onChange={(e) => setEdit({ ...edit, lng: e.target.value === '' ? null : Number(e.target.value) })} /></label>
          </div>
          <label className="block"><span className="label">{t('fColor')}</span>
            <div className="flex items-center gap-2">
              <input type="color" value={typeColor(edit.type, edit.color)} onChange={(e) => setEdit({ ...edit, color: e.target.value })} style={{ width: 44, height: 38, borderRadius: 10, border: '1px solid var(--border)' }} />
              <span className="text-xs text-[var(--muted)]">{t('fColorHint')}</span>
            </div>
          </label>
          <label className="block"><span className="label">{t('fNote')}</span><textarea className="input min-h-[60px]" value={edit.note ?? ''} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></label>
          <button className="btn btn-primary" disabled={!edit.name.trim()} onClick={() => save(edit)}>{t('lmSave')}</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[12.5px] text-[var(--muted)]">{t('lmMatch1')}<b>{t('lmMatchBold')}</b>{t('lmMatch2')}</p>
          {locs.length === 0 && <p className="text-sm text-[var(--muted)] py-2">{t('lmEmpty')}</p>}
          {locs.map((l) => (
            <div key={l.id} className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ border: '1px solid var(--border)' }}>
              <span className="w-8 h-8 rounded-lg grid place-items-center flex-none text-white" style={{ background: typeColor(l.type, l.color) }}><MapPin size={15} /></span>
              <div className="flex-1 min-w-0">
                <b className="text-[13px] block truncate">{l.name}</b>
                <div className="text-[11px] text-[var(--muted)] truncate">{LOC_TYPES[l.type]?.label ?? l.type}{l.lat != null ? ` · ${l.lat.toFixed(3)}, ${l.lng?.toFixed(3)}` : ` · ${t('noGpsShort')}`}</div>
              </div>
              <button className="btn btn-sm" onClick={() => setEdit(l)}><Pencil size={12} /></button>
              <button className="btn btn-sm btn-danger" onClick={() => del(l.id)}><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}
