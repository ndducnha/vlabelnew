import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { apiError } from '../../lib/api';
import { useTheme } from '../../theme';
import { Button, Field } from '../../components/ui';
import { useToast } from '../../components/Toast';

export default function LoginScreen({ navigation }: any) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { login } = useAuth();
  const [email, setEmail] = useState('manager@vlabel.vn');
  const [password, setPassword] = useState('Vlabel@123');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return;
    setBusy(true);
    try { await login(email.trim(), password); }
    catch (e) { toast(apiError(e), false); }
    finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.surface }}>
      <View style={{ flex: 1, paddingHorizontal: 22, justifyContent: 'center', paddingTop: insets.top }}>
        <View style={{ alignItems: 'center', marginBottom: 26 }}>
          <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Text style={{ color: '#fff', fontSize: 30, fontWeight: '800' }}>V</Text>
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: t.ink }}>VLabel</Text>
          <Text style={{ color: t.muted, marginTop: 4 }}>Chuẩn hóa dữ liệu, số hóa niềm tin.</Text>
        </View>

        <Field label="Email" value={email} onChangeText={setEmail} placeholder="ban@vlabel.vn" keyboardType="email-address" />
        <Field label="Mật khẩu" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
        <Button title="Đăng nhập" onPress={submit} loading={busy} style={{ marginTop: 6 }} />
        <Pressable onPress={() => navigation.navigate('Forgot')} style={{ alignSelf: 'center', marginTop: 16 }}>
          <Text style={{ color: t.accent, fontWeight: '600' }}>Quên mật khẩu?</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
