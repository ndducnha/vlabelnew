import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/icons';
import { useAuth } from '../lib/auth';
import { useTheme, font } from '../theme';

import LoginScreen from '../screens/auth/LoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import AccountScreen from '../screens/shared/AccountScreen';
import ChangePasswordScreen from '../screens/shared/ChangePasswordScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import ScanScreen from '../screens/shared/ScanScreen';
import JourneyScreen from '../screens/shared/JourneyScreen';
import HomeScreen from '../screens/user/HomeScreen';
import TasksScreen from '../screens/user/TasksScreen';
import EntryWizardScreen from '../screens/user/EntryWizardScreen';
import DashboardScreen from '../screens/manager/DashboardScreen';
import ManageScreen from '../screens/manager/ManageScreen';
import ProductDetailScreen from '../screens/manager/ProductDetailScreen';
import HelperScreen from '../screens/manager/HelperScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Icon Lucide (nét mảnh, đồng bộ với web); tab đang chọn đổi màu qua tabBarActiveTintColor.
const icon = (name: string) => ({ color, size }: { color: string; size: number }) =>
  <Icon name={name} size={size - 1} color={color} strokeWidth={2.1} />;

function useTabOptions() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);
  return {
    headerShown: false,
    tabBarActiveTintColor: t.accent,
    tabBarInactiveTintColor: t.faint,
    tabBarLabelStyle: { fontFamily: font.medium, fontSize: 10.5, letterSpacing: 0.2, marginTop: 2, marginBottom: 2 },
    tabBarIconStyle: { marginTop: 4 },
    tabBarStyle: { backgroundColor: t.bg, borderTopColor: t.hairline, borderTopWidth: 1, height: 54 + bottom, paddingTop: 6, paddingBottom: bottom },
  } as const;
}

function UserTabs() {
  const opts = useTabOptions();
  return (
    <Tab.Navigator screenOptions={opts}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Trang chủ', tabBarIcon: icon('home') }} />
      <Tab.Screen name="Tasks" component={TasksScreen} options={{ title: 'Công việc', tabBarIcon: icon('list') }} />
      <Tab.Screen name="Scan" component={ScanScreen} options={{ title: 'Quét QR', tabBarIcon: icon('qr-code') }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Thông báo', tabBarIcon: icon('notifications') }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Tài khoản', tabBarIcon: icon('person') }} />
    </Tab.Navigator>
  );
}

function ManagerTabs() {
  const opts = useTabOptions();
  return (
    <Tab.Navigator screenOptions={opts}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Tổng quan', tabBarIcon: icon('grid') }} />
      <Tab.Screen name="Manage" component={ManageScreen} options={{ title: 'Quản lý', tabBarIcon: icon('cube') }} />
      <Tab.Screen name="Helper" component={HelperScreen} options={{ title: 'Helper', tabBarIcon: icon('sparkles') }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Thông báo', tabBarIcon: icon('notifications') }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Tài khoản', tabBarIcon: icon('person') }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading, isManager } = useAuth();
  const t = useTheme();
  const navTheme = t.dark ? DarkTheme : DefaultTheme;

  if (loading) return <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={t.accent} size="large" /></View>;

  return (
    <NavigationContainer theme={{ ...navTheme, colors: { ...navTheme.colors, background: t.surface, card: t.bg, border: t.border, primary: t.accent, text: t.ink } }}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.surface }, headerStyle: { backgroundColor: t.bg }, headerShadowVisible: false, headerTintColor: t.accent, headerTitleStyle: { fontFamily: font.serifBold, fontSize: 18, color: t.ink } }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Forgot" component={ForgotPasswordScreen} options={{ presentation: 'modal' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Tabs" component={isManager ? ManagerTabs : UserTabs} />
            <Stack.Screen name="Entry" component={EntryWizardScreen} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: true, title: 'Chi tiết sản phẩm' }} />
            <Stack.Screen name="Journey" component={JourneyScreen} options={{ headerShown: true, title: 'Hành trình' }} />
            <Stack.Screen name="ScanModal" component={ScanScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: true, title: 'Đổi mật khẩu' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
