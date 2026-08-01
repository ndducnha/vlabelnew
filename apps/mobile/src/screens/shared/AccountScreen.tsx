import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Title, Card, Button, Avatar, Pill } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../theme';
import { APP_ENV } from '../../config';

const ROLE_LABEL: Record<string, string> = { SUPERADMIN: 'Quản trị cấp cao', ADMIN: 'Quản trị', MANAGER: 'Quản lý', DATA_ENTRY: 'Kê khai', PLATFORM_ADMIN: 'Nền tảng' };

function Item({ icon, label, onPress, danger }: any) {
  const t = useTheme();
  return (
    <Card onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <Ionicons name={icon} size={20} color={danger ? t.danger : t.accent} />
      <Text style={{ flex: 1, color: danger ? t.danger : t.ink, fontWeight: '600', fontSize: 15 }}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={t.faint} />
    </Card>
  );
}

export default function AccountScreen({ navigation }: any) {
  const t = useTheme();
  const { user, logout, isManager } = useAuth();
  return (
    <Screen>
      <Title>Tài khoản</Title>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <Avatar name={user?.fullName} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.ink, fontWeight: '800', fontSize: 17 }}>{user?.fullName}</Text>
          <Text style={{ color: t.muted, fontSize: 13 }}>{user?.email}</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {(user?.roles ?? []).map((r) => <Pill key={r} label={ROLE_LABEL[r] ?? r} tone="accent" />)}
          </View>
        </View>
      </Card>

      <Item icon="key-outline" label="Đổi mật khẩu" onPress={() => navigation.navigate('ChangePassword')} />
      <Item icon="notifications-outline" label="Quản lý thông báo" onPress={() => navigation.navigate(isManager ? 'Notifications' : 'Notifications')} />
      <Item icon="moon-outline" label={`Giao diện: tự động (${t.dark ? 'tối' : 'sáng'})`} />
      <View style={{ height: 8 }} />
      <Item icon="log-out-outline" label="Đăng xuất" danger onPress={logout} />

      <Text style={{ color: t.faint, textAlign: 'center', marginTop: 20, fontSize: 12 }}>VLabel Mobile · môi trường {APP_ENV}</Text>
    </Screen>
  );
}
