import React, { useMemo } from 'react';
import { View, Text, RefreshControl } from 'react-native';
import { Screen, Title, Card, Empty, Loading, Pill, Button, IconBadge } from '../../components/ui';
import { useTraceTasks } from '../../lib/queries';
import { useAuth } from '../../lib/auth';
import { useTheme, font } from '../../theme';
import { vnDate, isOverdue, daysTo } from '../../lib/format';
import { registerForPush } from '../../lib/push';
import { useToast } from '../../components/Toast';

export default function NotificationsScreen() {
  const t = useTheme();
  const toast = useToast();
  const { isManager } = useAuth();
  const tasks = useTraceTasks(!isManager);

  const items = useMemo(() => {
    const list = (tasks.data ?? []).filter((x) => x.status !== 'DONE');
    const notes: { id: string; icon: any; tone: any; title: string; sub: string }[] = [];
    for (const x of list) {
      if (isOverdue(x.endDate, x.status)) notes.push({ id: x.id + '-od', icon: 'alert-circle', tone: 'danger', title: `Quá hạn: ${x.name || x.product?.name}`, sub: `Hạn ${vnDate(x.endDate)} · ${x.product?.name}` });
      else if (daysTo(x.endDate) <= 3) notes.push({ id: x.id + '-soon', icon: 'time', tone: 'warn', title: `Sắp đến hạn: ${x.name || x.product?.name}`, sub: `Còn ${daysTo(x.endDate)} ngày · hạn ${vnDate(x.endDate)}` });
      else notes.push({ id: x.id + '-new', icon: 'clipboard', tone: 'accent', title: `Nhiệm vụ: ${x.name || x.product?.name}`, sub: `Hạn ${vnDate(x.endDate)}` });
    }
    return notes;
  }, [tasks.data, isManager]);

  return (
    <Screen refreshControl={<RefreshControl refreshing={tasks.isFetching} onRefresh={() => tasks.refetch()} tintColor={t.accent} />}>
      <Title eyebrow="Nhắc việc" sub="Nhắc việc theo lịch truy xuất. Bật push để nhận thông báo khi có mạng.">Thông báo</Title>
      <Button title="Bật thông báo đẩy" variant="default" icon="notifications-outline" onPress={async () => { const tok = await registerForPush(); toast(tok ? 'Đã đăng ký nhận thông báo' : 'Không lấy được quyền thông báo', !!tok); }} style={{ marginBottom: 16 }} />
      {tasks.isLoading ? <Loading /> : items.length === 0 ? <Empty title="Không có thông báo" hint="Bạn đã xử lý hết nhiệm vụ." icon="notifications-off-outline" /> : (
        <View style={{ gap: 10 }}>
          {items.map((n) => (
            <Card key={n.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <IconBadge name={n.icon} tone={n.tone} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.ink, fontFamily: font.semibold, fontSize: 14 }}>{n.title}</Text>
                <Text style={{ color: t.muted, fontFamily: font.body, fontSize: 12.5, marginTop: 2 }}>{n.sub}</Text>
              </View>
              <Pill label={n.tone === 'danger' ? 'Quá hạn' : n.tone === 'warn' ? 'Sắp hạn' : 'Mới'} tone={n.tone} />
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
