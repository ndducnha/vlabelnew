import React, { useMemo, useState } from 'react';
import { View, RefreshControl } from 'react-native';
import { Screen, Title, Card, Loading, Empty, Pill, SegTabs, LedgerRow, AppText } from '../../components/ui';
import { useTraceTasks } from '../../lib/queries';
import { useTheme } from '../../theme';
import { vnDate, isOverdue, daysTo } from '../../lib/format';

type Filter = 'today' | 'soon' | 'overdue' | 'done';

export default function TasksScreen({ navigation }: any) {
  const t = useTheme();
  const [filter, setFilter] = useState<Filter>('today');
  const tasks = useTraceTasks(true);

  const rows = useMemo(() => {
    const list = tasks.data ?? [];
    return list.filter((x) => {
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
      <Title eyebrow="Nhiệm vụ được giao">Công việc</Title>
      <View style={{ marginBottom: 14 }}>
        <SegTabs value={filter} onChange={setFilter} options={[{ value: 'today', label: 'Hôm nay' }, { value: 'soon', label: 'Sắp tới' }, { value: 'overdue', label: 'Quá hạn' }, { value: 'done', label: 'Đã xong' }]} />
      </View>

      {tasks.isLoading ? <Loading /> : rows.length === 0 ? <Empty title="Không có công việc" hint="Chuyển bộ lọc để xem mục khác." /> : (
        <Card style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
          {rows.map((x, i) => {
            const od = isOverdue(x.endDate, x.status);
            return (
              <LedgerRow
                key={x.id}
                index={i + 1}
                last={i === rows.length - 1}
                title={x.name || x.product?.name}
                onPress={() => x.status !== 'DONE' && navigation.navigate('Entry', { productId: x.product?.id, lot: x.lot })}
                meta={
                  <>
                    <Pill label={x.product?.name ?? ''} />
                    {x.lot ? <Pill label={`Lô ${x.lot}`} /> : null}
                    {x.flow?.name ? <Pill label={x.flow.name} tone="accent" /> : null}
                  </>
                }
                right={
                  <>
                    <Pill label={x.status === 'DONE' ? 'Hoàn thành' : od ? 'Quá hạn' : 'Đang mở'} tone={x.status === 'DONE' ? 'good' : od ? 'danger' : 'accent'} />
                    <AppText mono size={11} style={{ color: od ? t.danger : t.muted }}>Hạn {vnDate(x.endDate)}</AppText>
                  </>
                }
              />
            );
          })}
        </Card>
      )}
    </Screen>
  );
}
