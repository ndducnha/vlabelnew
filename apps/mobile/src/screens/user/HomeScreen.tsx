import React, { useMemo, useEffect } from 'react';
import { View, Text, RefreshControl } from 'react-native';
import { Screen, Title, Card, StatCard, Loading, Button, Pill, SectionHeader, IconBadge, Empty } from '../../components/ui';
import { useTraceTasks } from '../../lib/queries';
import { useAuth } from '../../lib/auth';
import { useTheme, font } from '../../theme';
import { vnDate, isOverdue, daysTo } from '../../lib/format';
import { flushQueue } from '../../lib/offline';

export default function HomeScreen({ navigation }: any) {
  const t = useTheme();
  const { user } = useAuth();
  const tasks = useTraceTasks(true);

  useEffect(() => { flushQueue().catch(() => {}); }, []);

  const s = useMemo(() => {
    const list = tasks.data ?? [];
    const open = list.filter((x) => x.status !== 'DONE');
    return {
      today: open.filter((x) => daysTo(x.endDate) <= 0 && !isOverdue(x.endDate, x.status)).length + open.filter((x) => new Date(x.startDate) <= new Date() && daysTo(x.endDate) >= 0).length,
      soon: open.filter((x) => daysTo(x.endDate) > 0 && daysTo(x.endDate) <= 3).length,
      overdue: open.filter((x) => isOverdue(x.endDate, x.status)).length,
      done: list.filter((x) => x.status === 'DONE').length,
      openList: open.slice(0, 4),
    };
  }, [tasks.data]);

  return (
    <Screen refreshControl={<RefreshControl refreshing={tasks.isFetching} onRefresh={() => tasks.refetch()} tintColor={t.accent} />}>
      <Title eyebrow="Bảng điều khiển" sub={`Xin chào, ${user?.fullName ?? ''}`}>Trang chủ</Title>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <StatCard label="Hôm nay" value={s.today} tone="accent" onPress={() => navigation.navigate('Tasks')} />
        <StatCard label="Sắp đến hạn" value={s.soon} tone="warn" onPress={() => navigation.navigate('Tasks')} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <StatCard label="Quá hạn" value={s.overdue} tone="danger" onPress={() => navigation.navigate('Tasks')} />
        <StatCard label="Đã hoàn thành" value={s.done} tone="good" onPress={() => navigation.navigate('Tasks')} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <Button title="Quét QR" icon="qr-code" onPress={() => navigation.navigate('Scan')} style={{ flex: 1 }} />
        <Button title="Công việc" variant="default" icon="list" onPress={() => navigation.navigate('Tasks')} style={{ flex: 1 }} />
      </View>

      <SectionHeader title="Việc cần làm" action={s.openList.length ? 'Tất cả' : undefined} onAction={() => navigation.navigate('Tasks')} />
      {tasks.isLoading ? <Loading /> : s.openList.length === 0 ? (
        <Empty title="Không có việc đang chờ" hint="Bạn đã hoàn thành mọi việc được giao." icon="checkmark-done-outline" />
      ) : (
        <View style={{ gap: 10 }}>
          {s.openList.map((x) => {
            const od = isOverdue(x.endDate, x.status);
            return (
              <Card key={x.id} onPress={() => navigation.navigate('Entry', { productId: x.product?.id, lot: x.lot })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <IconBadge name="clipboard-outline" tone={od ? 'danger' : 'accent'} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.ink, fontFamily: font.semibold, fontSize: 14.5 }} numberOfLines={1}>{x.name || x.product?.name}</Text>
                  <Text style={{ color: t.muted, fontFamily: font.body, fontSize: 12.5, marginTop: 2 }} numberOfLines={1}>{x.product?.name}{x.lot ? ` · Lô ${x.lot}` : ''} · hạn {vnDate(x.endDate)}</Text>
                </View>
                <Pill label={od ? 'Quá hạn' : 'Kê khai'} tone={od ? 'danger' : 'accent'} />
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
