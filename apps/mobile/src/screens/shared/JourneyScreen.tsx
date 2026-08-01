import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import { useQuery } from '@tanstack/react-query';
import { Loading, Empty, Pill, SegTabs, Card } from '../../components/ui';
import { api } from '../../lib/api';
import { useTheme } from '../../theme';
import { vnDateTime } from '../../lib/format';

export default function JourneyScreen({ route }: any) {
  const t = useTheme();
  const { productId } = route.params;
  const [mode, setMode] = useState<'real' | 'enterprise'>('real');
  const [lot, setLot] = useState('all');
  const records = useQuery({ queryKey: ['recs-by-product', productId], queryFn: () => api.get('/event-records/by-product', { params: { productId } }).then((r) => r.data) });

  const lots = useMemo(() => Array.from(new Set((records.data ?? []).map((r: any) => r.traceableItem?.batchOrLot).filter(Boolean))) as string[], [records.data]);

  const stops = useMemo(() => {
    const done = new Set(['APPROVED', 'LOCKED']);
    let recs = (records.data ?? []).filter((r: any) => done.has(r.status));
    if (lot !== 'all') recs = recs.filter((r: any) => r.traceableItem?.batchOrLot === lot);
    recs = recs.slice().sort((a: any, b: any) => (a.eventDefinition?.order ?? 0) - (b.eventDefinition?.order ?? 0));
    return recs.map((r: any) => ({ event: r.eventDefinition?.name ?? 'Sự kiện', location: r.location ?? '—', performer: r.performedBy?.fullName ?? r.performedByName ?? '—', at: r.performedAt, lat: r.gpsLat, lng: r.gpsLng }));
  }, [records.data, lot]);

  const gps = stops.filter((s) => s.lat != null && s.lng != null);
  const html = useMemo(() => buildLeaflet(gps), [gps]);

  return (
    <View style={{ flex: 1, backgroundColor: t.surface }}>
      <View style={{ padding: 12, gap: 10 }}>
        <SegTabs value={mode} onChange={setMode} options={[{ value: 'real', label: 'Bản đồ thực' }, { value: 'enterprise', label: 'Sơ đồ' }]} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          <Pill label="Tất cả lô" tone={lot === 'all' ? 'accent' : 'neutral'} />
          {lots.map((l) => <Text key={l} onPress={() => setLot(l)} style={{ marginRight: 6 }}><Pill label={l} tone={lot === l ? 'accent' : 'neutral'} /></Text>)}
        </ScrollView>
      </View>

      {records.isLoading ? <Loading /> : stops.length === 0 ? <View style={{ padding: 16 }}><Empty title="Chưa có hành trình" hint="Sản phẩm/lô này chưa có Event đã duyệt." /></View> : mode === 'real' ? (
        gps.length === 0 ? <View style={{ padding: 16 }}><Empty title="Chưa có toạ độ" hint="Các Event chưa có GPS. Xem chế độ Sơ đồ." /></View> :
          <WebView originWhitelist={['*']} source={{ html }} style={{ flex: 1 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {stops.map((s, i) => (
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
var map=L.map('map').setView([10.9,106.7],9);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(map);
var latlngs=pts.map(function(p){return [p.lat,p.lng]});
if(latlngs.length>1){L.polyline(latlngs,{color:'#2E5BE8',weight:4,opacity:.85}).addTo(map);}
pts.forEach(function(p,i){
  var html='<div style="width:28px;height:28px;border-radius:50%;background:#2E5BE8;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)">'+(i+1)+'</div>';
  L.marker([p.lat,p.lng],{icon:L.divIcon({className:'',html:html,iconSize:[28,28],iconAnchor:[14,14]})}).addTo(map).bindPopup('<b>'+(i+1)+'. '+p.event+'</b><br/>'+p.location);
});
if(latlngs.length){map.fitBounds(L.latLngBounds(latlngs).pad(0.35));}
</script></body></html>`;
}
