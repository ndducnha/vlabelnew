import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useQuery } from '@tanstack/react-query';
import { Loading, Empty, Pill, SegTabs, Card } from '../../components/ui';
import { api } from '../../lib/api';
import { useTheme } from '../../theme';
import { vnDateTime } from '../../lib/format';

export default function JourneyScreen({ route }: any) {
  const t = useTheme();
  const { productId, flowId: initFlow } = route.params;
  const [mode, setMode] = useState<'real' | 'enterprise'>('real');
  const [lot, setLot] = useState('all');
  const [flowId, setFlowId] = useState<string>(initFlow ?? 'all');
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const webRef = useRef<any>(null);

  const records = useQuery({ queryKey: ['recs-by-product', productId], queryFn: () => api.get('/event-records/by-product', { params: { productId } }).then((r) => r.data) });
  const flowsAll = useQuery({ queryKey: ['flows-all'], queryFn: () => api.get('/flows').then((r) => r.data) });

  const productFlows = useMemo(() => {
    const ids = new Set((records.data ?? []).map((r: any) => r.eventDefinitionId));
    return (flowsAll.data ?? []).filter((f: any) => (f.versions?.[0]?.eventDefinitions ?? []).some((e: any) => ids.has(e.id)));
  }, [records.data, flowsAll.data]);
  const defToFlow = useMemo(() => { const m = new Map<string, string>(); for (const f of flowsAll.data ?? []) for (const e of (f.versions?.[0]?.eventDefinitions ?? [])) m.set(e.id, f.id); return m; }, [flowsAll.data]);

  const lots = useMemo(() => Array.from(new Set((records.data ?? []).map((r: any) => r.traceableItem?.batchOrLot).filter(Boolean))) as string[], [records.data]);

  const stops = useMemo(() => {
    const done = new Set(['APPROVED', 'LOCKED']);
    let recs = (records.data ?? []).filter((r: any) => done.has(r.status));
    if (lot !== 'all') recs = recs.filter((r: any) => r.traceableItem?.batchOrLot === lot);
    if (flowId !== 'all') recs = recs.filter((r: any) => defToFlow.get(r.eventDefinitionId) === flowId);
    recs = recs.slice().sort((a: any, b: any) => (a.eventDefinition?.order ?? 0) - (b.eventDefinition?.order ?? 0));
    return recs.map((r: any) => ({ event: r.eventDefinition?.name ?? 'Sự kiện', location: r.location ?? '—', performer: r.performedBy?.fullName ?? r.performedByName ?? '—', at: r.performedAt, lat: r.gpsLat, lng: r.gpsLng }));
  }, [records.data, lot, flowId, defToFlow]);

  const gps = stops.filter((s: any) => s.lat != null && s.lng != null);
  const html = useMemo(() => buildLeaflet(gps), [gps]);

  useEffect(() => { setCurrent(0); setPlaying(false); }, [lot, flowId]);
  useEffect(() => { webRef.current?.injectJavaScript(`window.setCurrent && window.setCurrent(${current});true;`); }, [current, html]);
  useEffect(() => {
    if (!playing) return;
    if (current >= gps.length - 1) { setPlaying(false); return; }
    const id = setTimeout(() => setCurrent((c) => Math.min(gps.length - 1, c + 1)), 1400);
    return () => clearTimeout(id);
  }, [playing, current, gps.length]);

  const Ctrl = ({ icon, onPress, primary }: any) => (
    <Pressable onPress={onPress} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: primary ? t.accent : t.card, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={20} color={primary ? '#fff' : t.ink} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.surface }}>
      <View style={{ padding: 12, gap: 10 }}>
        <SegTabs value={mode} onChange={setMode} options={[{ value: 'real', label: 'Bản đồ thực' }, { value: 'enterprise', label: 'Sơ đồ' }]} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: 'center' }}>
          <Pressable onPress={() => setLot('all')}><Pill label="Tất cả lô" tone={lot === 'all' ? 'accent' : 'neutral'} /></Pressable>
          {lots.map((l) => <Pressable key={l} onPress={() => setLot(l)}><Pill label={l} tone={lot === l ? 'accent' : 'neutral'} /></Pressable>)}
          {productFlows.length > 1 && <><View style={{ width: 8 }} /><Pressable onPress={() => setFlowId('all')}><Pill label="Mọi Flow" tone={flowId === 'all' ? 'accent' : 'neutral'} /></Pressable>
            {productFlows.map((f: any) => <Pressable key={f.id} onPress={() => setFlowId(f.id)}><Pill label={f.name} tone={flowId === f.id ? 'accent' : 'neutral'} /></Pressable>)}</>}
        </ScrollView>
      </View>

      {records.isLoading ? <Loading /> : stops.length === 0 ? <View style={{ padding: 16 }}><Empty title="Chưa có hành trình" hint="Sản phẩm/lô này chưa có Event đã duyệt." /></View> : mode === 'real' ? (
        gps.length === 0 ? <View style={{ padding: 16 }}><Empty title="Chưa có toạ độ" hint="Các Event chưa có GPS. Xem chế độ Sơ đồ." /></View> :
          <View style={{ flex: 1 }}>
            <WebView ref={webRef} originWhitelist={['*']} source={{ html }} style={{ flex: 1 }} onLoadEnd={() => webRef.current?.injectJavaScript(`window.setCurrent && window.setCurrent(${current});true;`)} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: t.border, backgroundColor: t.bg }}>
              <Ctrl icon="play-skip-back" onPress={() => { setPlaying(false); setCurrent((c) => Math.max(0, c - 1)); }} />
              <Ctrl icon={playing ? 'pause' : 'play'} primary onPress={() => { if (current >= gps.length - 1) setCurrent(0); setPlaying((p) => !p); }} />
              <Ctrl icon="play-skip-forward" onPress={() => { setPlaying(false); setCurrent((c) => Math.min(gps.length - 1, c + 1)); }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.ink, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>{gps[current]?.event}</Text>
                <Text style={{ color: t.muted, fontSize: 11.5 }}>{current + 1}/{gps.length} · {gps[current]?.location}</Text>
              </View>
            </View>
          </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {stops.map((s: any, i: number) => (
            <Card key={i} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '800' }}>{i + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.ink, fontWeight: '700' }}>{s.event}</Text>
                <Text style={{ color: t.muted, fontSize: 12.5, marginTop: 2 }}>{s.location} · {s.performer}</Text>
                <Text style={{ color: t.faint, fontSize: 12 }}>{vnDateTime(s.at)}</Text>
              </View>
            </Card>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function buildLeaflet(points: { lat: number; lng: number; event: string; location: string }[]): string {
  const pts = JSON.stringify(points);
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0}</style></head>
<body><div id="map"></div><script>
var pts=${pts};
var map=L.map('map',{zoomControl:true}).setView([10.9,106.7],9);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM',maxZoom:19}).addTo(map);
var latlngs=pts.map(function(p){return [p.lat,p.lng]});
if(latlngs.length>1){L.polyline(latlngs,{color:'#2E5BE8',weight:4,opacity:.85}).addTo(map);}
var markers=[];
pts.forEach(function(p,i){
  var m=L.marker([p.lat,p.lng],{icon:mkIcon(i,false)}).addTo(map).bindPopup('<b>'+(i+1)+'. '+p.event+'</b><br/>'+p.location);
  markers.push(m);
});
function mkIcon(i,active){var s=active?36:28;var c=active?'#E23744':'#2E5BE8';
  return L.divIcon({className:'',html:'<div style="width:'+s+'px;height:'+s+'px;border-radius:50%;background:'+c+';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)">'+(i+1)+'</div>',iconSize:[s,s],iconAnchor:[s/2,s/2]});}
window.setCurrent=function(i){markers.forEach(function(m,j){m.setIcon(mkIcon(j,j===i));});if(markers[i]){map.panTo(markers[i].getLatLng());markers[i].openPopup();}};
if(latlngs.length){map.fitBounds(L.latLngBounds(latlngs).pad(0.35),{maxZoom:13});}
</script></body></html>`;
}
