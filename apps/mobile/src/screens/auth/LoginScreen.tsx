import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { apiError } from '../../lib/api';
import { useTheme, font, shadow } from '../../theme';
import { Button, Field, Eyebrow } from '../../components/ui';
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
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center', paddingTop: insets.top }}>
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={{ borderRadius: 20, marginBottom: 18, ...shadow(t, 2) }}>
            <Image source={require('../../../assets/logo.jpg')} style={{ width: 76, height: 76, borderRadius: 20 }} resizeMode="contain" />
          </View>
          <Text style={{ color: t.ink, fontFamily: font.serifBlack, fontSize: 34, letterSpacing: -0.5 }}>Vlabel</Text>
          <View style={{ marginTop: 10 }}>
            <Eyebrow>Chuẩn hóa dữ liệu · Số hóa niềm tin</Eyebrow>
          </View>
        </View>

        <View style={{ backgroundColor: t.card, borderColor: t.border, borderWidth: 1, borderRadius: 20, padding: 18, ...shadow(t, 1) }}>
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="ban@vlabel.vn" keyboardType="email-address" icon="mail-outline" />
          <Field label="Mật khẩu" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry icon="lock-closed-outline" />
          <Button title="Đăng nhập" onPress={submit} loading={busy} icon="arrow-forward" style={{ marginTop: 4 }} />
          <Pressable onPress={() => navigation.navigate('Forgot')} style={{ alignSelf: 'center', marginTop: 16 }} hitSlop={8}>
            <Text style={{ color: t.accent, fontFamily: font.semibold, fontSize: 13.5 }}>Quên mật khẩu?</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
