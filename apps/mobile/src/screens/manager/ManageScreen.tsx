import React, { useMemo, useState } from 'react';
import { View, Text, RefreshControl, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Screen, Title, Card, Loading, Empty, Pill, ProgressBar, SegTabs } from '../../components/ui';
import { api, fileUrl } from '../../lib/api';
import { useTheme } from '../../theme';
import { isOverdue } from '../../lib/format';

export default function ManageScreen({ navigation }: any) {
  const t = useTheme();
  const [q, setQ] = useState('');
  const [flowFilter, setFlowFilter] = useState<'all' | 'has' | 'none'>('all');
  const products = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products').then((r) => r.data) });
  const elabels = useQuery({ queryKey: ['elabels', ''], queryFn: () => api.get('/elabels').then((r) => r.data) });
  const tasks = useQuery({ queryKey: ['trace-tasks', 'all'], queryFn: () => api.get('/trace-tasks').then((r) => r.data) });

  const rows = useMemo(() => {
    const elById = new Map<string, any>((elabels.data ?? []).map((e: any) => [e.id, e]));
    const byProduct = new Map<string, any[]>();
    for (const x of tasks.data ?? []) { const a = byProduct.get(x.product?.id) ?? []; a.push(x); byProduct.set(x.product?.id, a); }
    return (products.data ?? []).map((p: any) => {
      const el = elById.get(p.id); const ts = byProduct.get(p.id) ?? [];
      const done = ts.filter((x: any) => x.status === 'DONE').length;
      const overdue = ts.filter((x: any) => isOverdue(x.endDate, x.status)).length;
      const flowCount = (p.flows ?? []).length;
      const status = flowCount === 0 ? 'noflow' : overdue ? 'overdue' : ts.length && done === ts.length ? 'done' : ts.length ? 'active' : 'ready';
      return { ...p, image: el?.labelImages?.[0]?.url ?? null, batchCount: el?.batchCount ?? 0, flowCount, taskCount: ts.length, pct: ts.length ? Math.round((done / ts.length) * 100) : 0, status, overdue };
    }).filter((r: any) => {
      if (flowFilter === 'has' && r.flowCount === 0) return false;
      if (flowFilter === 'none' && r.flowCount > 0) return false;
      if (q && !(r.name.toLowerCase().includes(q.toLowerCase()) || (r.gtin ?? '').includes(q))) return false;
      return true;
    });
  }, [products.data, elabels.data, tasks.data, q, flowFilter]);

  const STATUS: Record<string, [any, string]> = { noflow: ['warn', 'Chưa có Flow'], ready: ['neutral', 'Sẵn sàng'], active: ['accent', 'Đang khai báo'], overdue: ['danger', 'Quá hạn'], done: ['good', 'Hoàn thành'] };

  return (
    <Screen refreshControl={<RefreshControl refreshing={products.isFetching} onRefresh={() => { products.refetch(); tasks.refetch(); }} tintColor={t.accent} />}>
      <Title>Quản lý sản phẩm</Title>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, paddingVertical: 6 }}>
        <Ionicons name="search" size={16} color={t.muted} />
        <TextInput style={{ flex: 1, color: t.ink, fontSize: 15, paddingVertical: 6 }} placeholder="Tìm tên / GTIN…" placeholderTextColor={t.faint} value={q} onChangeText={setQ} autoCapitalize="none" />
      </Card>
      <View style={{ marginBottom: 12 }}>
        <SegTabs value={flowFilter} onChange={setFlowFilter} options={[{ value: 'all', label: 'Tất cả' }, { value: 'has', label: 'Có Flow' }, { value: 'none', label: 'Chưa Flow' }]} />
      </View>

      {products.isLoading ? <Loading /> : rows.length === 0 ? <Empty title="Không có sản phẩm" /> : (
        <View style={{ gap: 10 }}>
          {rows.map((r: any) => {
            const [tone, label] = STATUS[r.status];
            return (
              <Card key={r.id} onPress={() => navigation.navigate('ProductDetail', { productId: r.id, name: r.name, gtin: r.gtin })}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {r.image ? <Image source={{ uri: fileUrl(r.image) }} style={{ width: 46, height: 46, borderRadius: 12 }} /> : <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="cube-outline" size={22} color={t.accent} /></View>}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={{ flex: 1, color: t.ink, fontWeight: '700' }} numberOfLines={1}>{r.name}</Text><Pill label={label} tone={tone} /></View>
                    <Text style={{ color: t.muted, fontSize: 12, marginTop: 2 }}>{r.gtin}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <Pill label={`${r.flowCount} flow`} /><Pill label={`${r.batchCount} lô`} /><Pill label={`${r.taskCount} lịch`} />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <View style={{ flex: 1 }}><ProgressBar value={r.pct} /></View><Text style={{ color: t.muted, fontSize: 12 }}>{r.pct}%</Text>
                    </View>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
