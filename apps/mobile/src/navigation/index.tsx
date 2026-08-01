import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import { useTheme } from '../theme';

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

const icon = (name: any) => ({ color, size }: { color: string; size: number }) => <Ionicons name={name} size={size} color={color} />;

function UserTabs() {
  const t = useTheme();
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: t.accent, tabBarInactiveTintColor: t.faint, tabBarStyle: { backgroundColor: t.bg, borderTopColor: t.border } }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Trang chủ', tabBarIcon: icon('home-outline') }} />
      <Tab.Screen name="Tasks" component={TasksScreen} options={{ title: 'Công việc', tabBarIcon: icon('list-outline') }} />
      <Tab.Screen name="Scan" component={ScanScreen} options={{ title: 'Quét QR', tabBarIcon: icon('qr-code-outline') }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Thông báo', tabBarIcon: icon('notifications-outline') }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Tài khoản', tabBarIcon: icon('person-outline') }} />
    </Tab.Navigator>
  );
}

function ManagerTabs() {
  const t = useTheme();
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: t.accent, tabBarInactiveTintColor: t.faint, tabBarStyle: { backgroundColor: t.bg, borderTopColor: t.border } }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Tổng quan', tabBarIcon: icon('grid-outline') }} />
      <Tab.Screen name="Manage" component={ManageScreen} options={{ title: 'Quản lý', tabBarIcon: icon('cube-outline') }} />
      <Tab.Screen name="Helper" component={HelperScreen} options={{ title: 'Helper', tabBarIcon: icon('sparkles-outline') }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Thông báo', tabBarIcon: icon('notifications-outline') }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Tài khoản', tabBarIcon: icon('person-outline') }} />
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
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.surface } }}>
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
