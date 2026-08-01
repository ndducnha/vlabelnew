import React, { useMemo, useState } from 'react';
import { View, Text, RefreshControl, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Screen, Title, Card, Loading, Empty, Pill, SegTabs } from '../../components/ui';
import { api } from '../../lib/api';
import { useTheme } from '../../theme';
import { vnDate, isOverdue, daysTo } from '../../lib/format';

type Filter = 'today' | 'soon' | 'overdue' | 'done';

export default function TasksScreen({ navigation }: any) {
  const t = useTheme();
  const [filter, setFilter] = useState<Filter>('today');
  const tasks = useQuery({ queryKey: ['trace-tasks', 'mine'], queryFn: () => api.get('/trace-tasks', { params: { mine: 1 } }).then((r) => r.data) });

  const rows = useMemo(() => {
    const list = tasks.data ?? [];
    return list.filter((x: any) => {
      const od = isOverdue(x.endDate, x.status);
      if (filter === 'done') return x.status === 'DONE';
      if (x.status === 'DONE') return false;
      if (filter === 'overdue') return od;
      if (filter === 'soon') return !od && daysTo(x.endDate) > 0 && daysTo(x.endDate) <= 7;
      return !od && daysTo(x.endDate) <= 0 || (new Date(x.startDate) <= new Date() && daysTo(x.endDate) >= 0 && !od); // today/đang mở
    });
  }, [tasks.data, filter]);

  return (
    <Screen refreshControl={<RefreshControl refreshing={tasks.isFetching} onRefresh={() => tasks.refetch()} tintColor={t.accent} />}>
      <Title>Công việc</Title>
      <View style={{ marginBottom: 14 }}>
        <SegTabs value={filter} onChange={setFilter} options={[{ value: 'today', label: 'Hôm nay' }, { value: 'soon', label: 'Sắp tới' }, { value: 'overdue', label: 'Quá hạn' }, { value: 'done', label: 'Đã xong' }]} />
      </View>

      {tasks.isLoading ? <Loading /> : rows.length === 0 ? <Empty title="Không có công việc" hint="Chuyển bộ lọc để xem mục khác." /> : (
        <View style={{ gap: 10 }}>
          {rows.map((x: any) => {
            const od = isOverdue(x.endDate, x.status);
            return (
              <Card key={x.id} onPress={() => x.status !== 'DONE' && navigation.navigate('Entry', { productId: x.product?.id, lot: x.lot })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ flex: 1, color: t.ink, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{x.name || x.product?.name}</Text>
                  <Pill label={x.status === 'DONE' ? 'Hoàn thành' : od ? 'Quá hạn' : 'Đang mở'} tone={x.status === 'DONE' ? 'good' : od ? 'danger' : 'accent'} />
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  <Pill label={x.product?.name} />
                  {x.lot ? <Pill label={`Lô ${x.lot}`} /> : null}
                  {x.flow?.name ? <Pill label={x.flow.name} tone="accent" /> : null}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <Ionicons name="calendar-outline" size={14} color={od ? t.danger : t.muted} />
                  <Text style={{ color: od ? t.danger : t.muted, fontSize: 12.5, fontWeight: od ? '700' : '400' }}>Hạn {vnDate(x.endDate)}</Text>
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
