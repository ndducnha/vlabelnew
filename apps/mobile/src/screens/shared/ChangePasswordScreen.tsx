import React, { useState } from 'react';
import { Screen, Field, Button, Card, AppText } from '../../components/ui';
import { api, apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';

// Gọi POST /auth/change-password (additive nếu backend bổ sung). Nếu chưa có → báo rõ.
export default function ChangePasswordScreen({ navigation }: any) {
  const toast = useToast();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (next !== confirm) return toast('Mật khẩu xác nhận không khớp', false);
    setBusy(true);
    try {
      await api.post('/auth/change-password', { currentPassword: cur, newPassword: next });
      toast('Đã đổi mật khẩu');
      navigation.goBack();
    } catch (e: any) {
      if (e?.response?.status === 404) toast('Backend chưa hỗ trợ đổi mật khẩu. Liên hệ quản trị.', false);
      else toast(apiError(e), false);
    } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Card style={{ marginBottom: 14 }}><AppText muted>Mật khẩu mới nên có tối thiểu 8 ký tự.</AppText></Card>
      <Field label="Mật khẩu hiện tại" value={cur} onChangeText={setCur} secureTextEntry />
      <Field label="Mật khẩu mới" value={next} onChangeText={setNext} secureTextEntry />
      <Field label="Xác nhận mật khẩu mới" value={confirm} onChangeText={setConfirm} secureTextEntry />
      <Button title="Đổi mật khẩu" onPress={submit} loading={busy} disabled={!cur || !next || !confirm} />
    </Screen>
  );
}
