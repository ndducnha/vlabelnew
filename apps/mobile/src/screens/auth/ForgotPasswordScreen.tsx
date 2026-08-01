import React, { useState } from 'react';
import { Screen, Title, Field, Button, Card, AppText } from '../../components/ui';
import { useToast } from '../../components/Toast';

// Backend hiện chưa có endpoint quên mật khẩu → hướng dẫn liên hệ quản trị.
// Khi bổ sung POST /auth/forgot-password (additive), chỉ cần gọi ở đây.
export default function ForgotPasswordScreen({ navigation }: any) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  return (
    <Screen>
      <Title eyebrow="Khôi phục truy cập" sub="Nhập email để nhận hướng dẫn đặt lại mật khẩu.">Quên mật khẩu</Title>
      <Card style={{ marginBottom: 16 }}>
        <AppText muted>Tính năng đặt lại mật khẩu qua email sẽ khả dụng khi backend bổ sung endpoint. Hiện tại vui lòng liên hệ quản trị viên doanh nghiệp để được cấp lại.</AppText>
      </Card>
      <Field label="Email" value={email} onChangeText={setEmail} placeholder="ban@vlabel.vn" keyboardType="email-address" icon="mail-outline" />
      <Button title="Gửi yêu cầu" onPress={() => { toast('Đã gửi yêu cầu tới quản trị viên'); navigation.goBack(); }} disabled={!email.trim()} />
      <Button title="Quay lại đăng nhập" variant="ghost" onPress={() => navigation.goBack()} style={{ marginTop: 8 }} />
    </Screen>
  );
}
