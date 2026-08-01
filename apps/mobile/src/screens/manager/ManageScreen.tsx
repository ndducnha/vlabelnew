import React, { useMemo, useState } from 'react';
import { View, Text, RefreshControl, Image, TextInput } from 'react-native';
import { Icon } from '../../components/icons';
import { useQuery } from '@tanstack/react-query';
import { Screen, Title, Card, Loading, Empty, Pill, ProgressBar, SegTabs } from '../../components/ui';
import { useProducts, useTraceTasks } from '../../lib/queries';
import type { TraceTask } from '@vlabel/shared';
import { api, fileUrl } from '../../lib/api';
import { useTheme, font } from '../../theme';
import { isOverdue } from '../../lib/format';

export default function ManageScreen({ navigation }: any) {
  const t = useTheme();
  const [q, setQ] = useState('');
  const [flowFilter, setFlowFilter] = useState<'all' | 'has' | 'none'>('all');
  const products = useProducts();
  const elabels = useQuery({ queryKey: ['elabels', ''], queryFn: () => api.get('/elabels').then((r) => r.data) });
  const tasks = useTraceTasks(false);

  const rows = useMemo(() => {
    const elById = new Map<string, any>((elabels.data ?? []).map((e: any) => [e.id, e]));
    const byProduct = new Map<string, TraceTask[]>();
    for (const x of tasks.data ?? []) { const pid = x.product?.id; if (!pid) continue; const a = byProduct.get(pid) ?? []; a.push(x); byProduct.set(pid, a); }
    return (products.data ?? []).map((p) => {
      const el = elById.get(p.id); const ts = byProduct.get(p.id) ?? [];
      const done = ts.filter((x) => x.status === 'DONE').length;
      const overdue = ts.filter((x) => isOverdue(x.endDate, x.status)).length;
      const flowCount = (p.flows ?? []).length;
      const status = flowCount === 0 ? 'noflow' : overdue ? 'overdue' : ts.length && done === ts.length ? 'done' : ts.length ? 'active' : 'ready';
      return { ...p, image: el?.labelImages?.[0]?.url ?? null, batchCount: el?.batchCount ?? 0, flowCount, taskCount: ts.length, pct: ts.length ? Math.round((done / ts.length) * 100) : 0, status, overdue };
    }).filter((r) => {
      if (flowFilter === 'has' && r.flowCount === 0) return false;
      if (flowFilter === 'none' && r.flowCount > 0) return false;
      if (q && !(r.name.toLowerCase().includes(q.toLowerCase()) || (r.gtin ?? '').includes(q))) return false;
      return true;
    });
  }, [products.data, elabels.data, tasks.data, q, flowFilter]);

  const STATUS: Record<string, [any, string]> = { noflow: ['warn', 'Chưa có quy trình'], ready: ['neutral', 'Sẵn sàng'], active: ['accent', 'Đang khai báo'], overdue: ['danger', 'Quá hạn'], done: ['good', 'Hoàn thành'] };

  return (
    <Screen refreshControl={<RefreshControl refreshing={products.isFetching} onRefresh={() => { products.refetch(); tasks.refetch(); }} tintColor={t.accent} />}>
      <Title eyebrow="Danh mục sản phẩm">Quản lý sản phẩm</Title>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10, paddingVertical: 8 }}>
        <Icon name="search" size={17} color={t.muted} />
        <TextInput style={{ flex: 1, color: t.ink, fontFamily: font.body, fontSize: 15, paddingVertical: 6 }} placeholder="Tìm tên / GTIN…" placeholderTextColor={t.faint} value={q} onChangeText={setQ} autoCapitalize="none" />
      </Card>
      <View style={{ marginBottom: 12 }}>
        <SegTabs value={flowFilter} onChange={setFlowFilter} options={[{ value: 'all', label: 'Tất cả' }, { value: 'has', label: 'Có quy trình' }, { value: 'none', label: 'Chưa có' }]} />
      </View>

      {products.isLoading ? <Loading /> : rows.length === 0 ? <Empty title="Không có sản phẩm" /> : (
        <View style={{ gap: 10 }}>
          {rows.map((r) => {
            const [tone, label] = STATUS[r.status];
            return (
              <Card key={r.id} onPress={() => navigation.navigate('ProductDetail', { productId: r.id, name: r.name, gtin: r.gtin })}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {r.image ? <Image source={{ uri: fileUrl(r.image) }} style={{ width: 46, height: 46, borderRadius: 12 }} /> : <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="cube-outline" size={22} color={t.accent} /></View>}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={{ flex: 1, color: t.ink, fontFamily: font.semibold, fontSize: 14.5 }} numberOfLines={1}>{r.name}</Text><Pill label={label} tone={tone} /></View>
                    <Text style={{ color: t.muted, fontFamily: font.mono, fontSize: 11.5, marginTop: 3 }}>{r.gtin}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      <Pill label={`${r.flowCount} flow`} /><Pill label={`${r.batchCount} lô`} /><Pill label={`${r.taskCount} lịch`} />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                      <View style={{ flex: 1 }}><ProgressBar value={r.pct} /></View><Text style={{ color: t.muted, fontFamily: font.monoMed, fontSize: 11.5 }}>{r.pct}%</Text>
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
