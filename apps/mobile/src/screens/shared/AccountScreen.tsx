import React from 'react';
import { View, Text } from 'react-native';
import { Icon } from '../../components/icons';
import { Screen, Title, Card, Avatar, Pill, IconBadge, SectionHeader } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useTheme, font } from '../../theme';
import { APP_ENV } from '../../config';

const ROLE_LABEL: Record<string, string> = { SUPERADMIN: 'Quản trị cấp cao', ADMIN: 'Quản trị', MANAGER: 'Quản lý', DATA_ENTRY: 'Kê khai', PLATFORM_ADMIN: 'Nền tảng' };

function Item({ icon, label, onPress, danger }: any) {
  const t = useTheme();
  return (
    <Card onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 10 }}>
      <IconBadge name={icon} tone={danger ? 'danger' : 'accent'} size={38} />
      <Text style={{ flex: 1, color: danger ? t.danger : t.ink, fontFamily: font.semibold, fontSize: 15 }}>{label}</Text>
      {onPress ? <Icon name="chevron-forward" size={18} color={t.faint} /> : null}
    </Card>
  );
}

export default function AccountScreen({ navigation }: any) {
  const t = useTheme();
  const { user, logout } = useAuth();
  return (
    <Screen>
      <Title eyebrow="Hồ sơ của bạn">Tài khoản</Title>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <Avatar name={user?.fullName} size={54} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.ink, fontFamily: font.serifBold, fontSize: 19, letterSpacing: -0.2 }}>{user?.fullName}</Text>
          <Text style={{ color: t.muted, fontFamily: font.mono, fontSize: 12, marginTop: 2 }}>{user?.email}</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {(user?.roles ?? []).map((r) => <Pill key={r} label={ROLE_LABEL[r] ?? r} tone="accent" />)}
          </View>
        </View>
      </Card>

      <SectionHeader title="Cài đặt" />
      <Item icon="key-outline" label="Đổi mật khẩu" onPress={() => navigation.navigate('ChangePassword')} />
      <Item icon="notifications-outline" label="Quản lý thông báo" onPress={() => navigation.navigate('Notifications')} />
      <Item icon="moon-outline" label={`Giao diện: tự động (${t.dark ? 'tối' : 'sáng'})`} />
      <View style={{ height: 8 }} />
      <Item icon="log-out-outline" label="Đăng xuất" danger onPress={logout} />

      <Text style={{ color: t.faint, textAlign: 'center', marginTop: 22, fontFamily: font.mono, fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase' }}>VLabel Mobile · {APP_ENV}</Text>
    </Screen>
  );
}
