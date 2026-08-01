import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, apiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../theme';
import { Button } from '../../components/ui';
import { useToast } from '../../components/Toast';

// Tách GTIN + lot từ nội dung QR (URL /t/:gtin?lot=... hoặc GTIN thô)
function parseQr(text: string): { gtin: string; lot?: string } {
  try {
    const u = new URL(text);
    const gtin = u.pathname.split('/t/')[1]?.split('/')[0] || u.searchParams.get('gtin') || text;
    return { gtin, lot: u.searchParams.get('lot') ?? undefined };
  } catch { return { gtin: text }; }
}

export default function ScanScreen({ navigation }: any) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { isManager } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);

  const onScan = async ({ data }: { data: string }) => {
    if (locked || busy) return;
    setLocked(true); setBusy(true);
    const { gtin, lot } = parseQr(data);
    try {
      const { data: product } = await api.get('/products/by-gtin', { params: { gtin } });
      toast(`Đã nhận: ${product.name}`);
      if (isManager) navigation.navigate('ProductDetail', { productId: product.id, name: product.name, gtin: product.gtin });
      else navigation.navigate('Entry', { productId: product.id, lot });
    } catch (e) { toast(apiError(e), false); setTimeout(() => setLocked(false), 1200); }
    finally { setBusy(false); }
  };

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  if (!permission.granted) return (
    <View style={{ flex: 1, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 }}>
      <Text style={{ color: t.ink, fontWeight: '700', fontSize: 16, textAlign: 'center' }}>Cần quyền camera để quét QR</Text>
      <Button title="Cấp quyền camera" onPress={requestPermission} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={locked ? undefined : onScan} />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.hint}>Đưa mã QR vào khung để quét</Text>
      </View>
      <View style={{ position: 'absolute', top: insets.top + 8, right: 16 }}>
        <Pressable onPress={() => navigation.canGoBack() && navigation.goBack()} style={{ backgroundColor: 'rgba(0,0,0,.5)', borderRadius: 20, padding: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Đóng</Text>
        </Pressable>
      </View>
      {locked && <View style={{ position: 'absolute', bottom: insets.bottom + 30, alignSelf: 'center' }}><Button title="Quét lại" onPress={() => setLocked(false)} /></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 240, height: 240, borderRadius: 24, borderWidth: 3, borderColor: 'rgba(255,255,255,.9)' },
  hint: { color: '#fff', marginTop: 18, fontWeight: '600' },
});
