import React, { useMemo, useEffect } from 'react';
import { View, Text, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Screen, Title, Card, StatCard, Loading, Button, Pill } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../theme';
import { vnDate, isOverdue, daysTo } from '../../lib/format';
import { flushQueue } from '../../lib/offline';

export default function HomeScreen({ navigation }: any) {
  const t = useTheme();
  const { user } = useAuth();
  const tasks = useQuery({ queryKey: ['trace-tasks', 'mine'], queryFn: () => api.get('/trace-tasks', { params: { mine: 1 } }).then((r) => r.data) });

  useEffect(() => { flushQueue().catch(() => {}); }, []);

  const s = useMemo(() => {
    const list = tasks.data ?? [];
    const open = list.filter((x: any) => x.status !== 'DONE');
    return {
      today: open.filter((x: any) => daysTo(x.endDate) <= 0 && !isOverdue(x.endDate, x.status)).length + open.filter((x: any) => new Date(x.startDate) <= new Date() && daysTo(x.endDate) >= 0).length,
      soon: open.filter((x: any) => daysTo(x.endDate) > 0 && daysTo(x.endDate) <= 3).length,
      overdue: open.filter((x: any) => isOverdue(x.endDate, x.status)).length,
      done: list.filter((x: any) => x.status === 'DONE').length,
      openList: open.slice(0, 4),
    };
  }, [tasks.data]);

  return (
    <Screen refreshControl={<RefreshControl refreshing={tasks.isFetching} onRefresh={() => tasks.refetch()} tintColor={t.accent} />}>
      <Title sub={`Xin chào, ${user?.fullName ?? ''}`}>Trang chủ</Title>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <StatCard label="Hôm nay" value={s.today} tone="accent" onPress={() => navigation.navigate('Tasks')} />
        <StatCard label="Sắp đến hạn" value={s.soon} tone="warn" onPress={() => navigation.navigate('Tasks')} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <StatCard label="Quá hạn" value={s.overdue} tone="danger" onPress={() => navigation.navigate('Tasks')} />
        <StatCard label="Đã hoàn thành" value={s.done} tone="good" onPress={() => navigation.navigate('Tasks')} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <Button title="Quét QR" onPress={() => navigation.navigate('Scan')} style={{ flex: 1 }} />
        <Button title="Công việc" variant="default" onPress={() => navigation.navigate('Tasks')} style={{ flex: 1 }} />
      </View>

      <Text style={{ color: t.ink, fontWeight: '800', fontSize: 16, marginBottom: 10 }}>Việc cần làm</Text>
      {tasks.isLoading ? <Loading /> : s.openList.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 24 }}><Text style={{ color: t.muted }}>Bạn không có việc nào đang chờ 🎉</Text></Card>
      ) : (
        <View style={{ gap: 10 }}>
          {s.openList.map((x: any) => {
            const od = isOverdue(x.endDate, x.status);
            return (
              <Card key={x.id} onPress={() => navigation.navigate('Entry', { productId: x.product?.id, lot: x.lot })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: od ? t.dangerSoft : t.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="clipboard-outline" size={20} color={od ? t.danger : t.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.ink, fontWeight: '700' }} numberOfLines={1}>{x.name || x.product?.name}</Text>
                  <Text style={{ color: t.muted, fontSize: 12.5 }}>{x.product?.name}{x.lot ? ` · Lô ${x.lot}` : ''} · hạn {vnDate(x.endDate)}</Text>
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
