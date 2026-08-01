import React, { useMemo, useEffect } from 'react';
import { View, Text, RefreshControl } from 'react-native';
import { Screen, Title, StatCard, Card, Loading, ProgressBar, SectionHeader, Eyebrow, LedgerRow, Pill } from '../../components/ui';
import { useProducts, useFlowsAll, useTraceTasks } from '../../lib/queries';
import { useAuth } from '../../lib/auth';
import { useTheme, font } from '../../theme';
import { isOverdue, daysTo } from '../../lib/format';
import { flushQueue } from '../../lib/offline';

export default function DashboardScreen({ navigation }: any) {
  const t = useTheme();
  const { user } = useAuth();
  const products = useProducts();
  const tasks = useTraceTasks(false);
  const flows = useFlowsAll();

  useEffect(() => { flushQueue().catch(() => {}); }, []);

  const s = useMemo(() => {
    const ps = products.data ?? [], ts = tasks.data ?? [], fs = flows.data ?? [];
    const open = ts.filter((x) => x.status !== 'DONE');
    const done = ts.filter((x) => x.status === 'DONE').length;
    return {
      products: ps.length,
      noFlow: ps.filter((p) => (p.flows ?? []).length === 0).length,
      activeFlows: fs.filter((f) => (f._count?.products ?? 0) > 0).length,
      todaySched: open.filter((x) => daysTo(x.endDate) <= 0 && !isOverdue(x.endDate, x.status)).length,
      openEvents: open.length,
      overdue: open.filter((x) => isOverdue(x.endDate, x.status)).length,
      completion: ts.length ? Math.round((done / ts.length) * 100) : 0,
      assignees: new Set(open.map((x) => x.assignedUser?.id)).size,
    };
  }, [products.data, tasks.data, flows.data]);

  const loading = products.isLoading || tasks.isLoading;
  const refetchAll = () => { products.refetch(); tasks.refetch(); flows.refetch(); };

  return (
    <Screen refreshControl={<RefreshControl refreshing={products.isFetching} onRefresh={refetchAll} tintColor={t.accent} />}>
      <Title eyebrow="Bảng điều hành" sub={`Xin chào, ${user?.fullName ?? ''}`}>Tổng quan</Title>
      {loading ? <Loading /> : (
        <>
          <SectionHeader title="Sản phẩm & Luồng" action="Quản lý" onAction={() => navigation.navigate('Manage')} />
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <StatCard label="Tổng sản phẩm" value={s.products} onPress={() => navigation.navigate('Manage')} />
            <StatCard label="Chưa có Luồng" value={s.noFlow} tone={s.noFlow ? 'warn' : 'good'} onPress={() => navigation.navigate('Manage')} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
            <StatCard label="Luồng hoạt động" value={s.activeFlows} tone="accent" />
            <StatCard label="Tỷ lệ hoàn thành" value={`${s.completion}%`} tone="good" />
          </View>

          <SectionHeader title="Công việc truy xuất" />
          <Card elevated={false} style={{ paddingVertical: 2, marginBottom: 18 }}>
            <LedgerRow
              index={1}
              title="Sự kiện chưa xong"
              subtitle="Tổng số việc đang mở"
              right={<Text style={{ color: t.accent, fontFamily: font.monoBold, fontSize: 18 }}>{s.openEvents}</Text>}
            />
            <LedgerRow
              index={2}
              title="Sự kiện quá hạn"
              subtitle="Đã trễ so với hạn kết thúc"
              right={<Text style={{ color: s.overdue ? t.danger : t.good, fontFamily: font.monoBold, fontSize: 18 }}>{s.overdue}</Text>}
              meta={s.overdue ? <Pill label="Cần xử lý" tone="danger" /> : <Pill label="Đúng hạn" tone="good" />}
            />
            <LedgerRow
              index={3}
              title="Lịch hôm nay"
              subtitle="Việc đến hạn trong hôm nay"
              onPress={() => navigation.navigate('Manage')}
              right={<Text style={{ color: t.warn, fontFamily: font.monoBold, fontSize: 18 }}>{s.todaySched}</Text>}
            />
            <LedgerRow
              index={4}
              title="Nhân sự phân công"
              subtitle="Số người đang nhận việc mở"
              last
              right={<Text style={{ color: t.ink, fontFamily: font.monoBold, fontSize: 18 }}>{s.assignees}</Text>}
            />
          </Card>

          <SectionHeader title="Tiến độ" />
          <Card elevated={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Eyebrow tone="good">Hoàn thành lịch truy xuất</Eyebrow>
              <Text style={{ color: t.accent, fontFamily: font.monoBold, fontSize: 18 }}>{s.completion}%</Text>
            </View>
            <ProgressBar value={s.completion} />
          </Card>
        </>
      )}
    </Screen>
  );
}
