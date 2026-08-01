import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/icons';
import { api, apiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useTheme, font } from '../../theme';
import { Button, IconBadge } from '../../components/ui';
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
    <View style={{ flex: 1, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 }}>
      <IconBadge name="camera-outline" tone="accent" size={64} />
      <Text style={{ color: t.ink, fontFamily: font.serifBold, fontSize: 20, textAlign: 'center', letterSpacing: -0.2 }}>Cần quyền camera</Text>
      <Text style={{ color: t.muted, fontFamily: font.body, fontSize: 13.5, textAlign: 'center', lineHeight: 20, marginTop: -6 }}>Cấp quyền để quét mã QR truy xuất nguồn gốc sản phẩm.</Text>
      <Button title="Cấp quyền camera" icon="camera" onPress={requestPermission} style={{ alignSelf: 'stretch' }} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={locked ? undefined : onScan} />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame}>
          <View style={[styles.corner, styles.tl]} /><View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} /><View style={[styles.corner, styles.br]} />
        </View>
        <View style={styles.hintPill}><Text style={styles.hint}>Đưa mã QR vào khung</Text></View>
      </View>
      <View style={{ position: 'absolute', top: insets.top + 10, right: 18 }}>
        <Pressable onPress={() => navigation.canGoBack() && navigation.goBack()} hitSlop={8} style={{ backgroundColor: 'rgba(0,0,0,.55)', borderRadius: 22, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={22} color="#fff" />
        </Pressable>
      </View>
      {locked && <View style={{ position: 'absolute', bottom: insets.bottom + 34, alignSelf: 'center' }}><Button title="Quét lại" icon="refresh" onPress={() => setLocked(false)} /></View>}
    </View>
  );
}

const ACCENT = '#5AAAD0';
const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 248, height: 248, borderRadius: 28 },
  corner: { position: 'absolute', width: 34, height: 34, borderColor: ACCENT },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 28 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 28 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 28 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 28 },
  hintPill: { marginTop: 26, backgroundColor: 'rgba(0,0,0,.55)', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999 },
  hint: { color: '#fff', fontFamily: font.monoMed, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' },
});
