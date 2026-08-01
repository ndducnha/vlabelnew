import React, { useMemo, useEffect } from 'react';
import { View, Text, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen, Title, StatCard, Card, Loading, ProgressBar } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../theme';
import { isOverdue, daysTo } from '../../lib/format';
import { flushQueue } from '../../lib/offline';

export default function DashboardScreen({ navigation }: any) {
  const t = useTheme();
  const { user } = useAuth();
  const products = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products').then((r) => r.data) });
  const tasks = useQuery({ queryKey: ['trace-tasks', 'all'], queryFn: () => api.get('/trace-tasks').then((r) => r.data) });
  const flows = useQuery({ queryKey: ['flows-all'], queryFn: () => api.get('/flows').then((r) => r.data) });

  useEffect(() => { flushQueue().catch(() => {}); }, []);

  const s = useMemo(() => {
    const ps = products.data ?? [], ts = tasks.data ?? [], fs = flows.data ?? [];
    const open = ts.filter((x: any) => x.status !== 'DONE');
    const done = ts.filter((x: any) => x.status === 'DONE').length;
    return {
      products: ps.length,
      noFlow: ps.filter((p: any) => (p.flows ?? []).length === 0).length,
      activeFlows: fs.filter((f: any) => (f._count?.products ?? 0) > 0).length,
      todaySched: open.filter((x: any) => daysTo(x.endDate) <= 0 && !isOverdue(x.endDate, x.status)).length,
      openEvents: open.length,
      overdue: open.filter((x: any) => isOverdue(x.endDate, x.status)).length,
      completion: ts.length ? Math.round((done / ts.length) * 100) : 0,
      assignees: new Set(open.map((x: any) => x.assignedUser?.id)).size,
    };
  }, [products.data, tasks.data, flows.data]);

  const loading = products.isLoading || tasks.isLoading;
  const refetchAll = () => { products.refetch(); tasks.refetch(); flows.refetch(); };

  return (
    <Screen refreshControl={<RefreshControl refreshing={products.isFetching} onRefresh={refetchAll} tintColor={t.accent} />}>
      <Title sub={`Xin chào, ${user?.fullName ?? ''}`}>Tổng quan</Title>
      {loading ? <Loading /> : (
        <>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <StatCard label="Tổng sản phẩm" value={s.products} onPress={() => navigation.navigate('Manage')} />
            <StatCard label="Chưa có Flow" value={s.noFlow} tone={s.noFlow ? 'warn' : 'good'} onPress={() => navigation.navigate('Manage')} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <StatCard label="Flow hoạt động" value={s.activeFlows} tone="accent" />
            <StatCard label="Lịch hôm nay" value={s.todaySched} tone="warn" onPress={() => navigation.navigate('Manage')} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <StatCard label="Event chưa xong" value={s.openEvents} tone="accent" />
            <StatCard label="Event quá hạn" value={s.overdue} tone={s.overdue ? 'danger' : 'good'} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <StatCard label="Nhân sự phân công" value={s.assignees} tone="accent" />
            <StatCard label="Tỷ lệ hoàn thành" value={`${s.completion}%`} tone="good" />
          </View>
          <Card>
            <Text style={{ color: t.ink, fontWeight: '700', marginBottom: 8 }}>Tỷ lệ hoàn thành lịch truy xuất</Text>
            <ProgressBar value={s.completion} />
          </Card>
        </>
      )}
    </Screen>
  );
}
