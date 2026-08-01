import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { Button, ProgressBar } from './ui';

// Khung wizard mobile: tiêu đề, "Bước X/Y", nội dung cuộn, thanh Quay lại / Lưu nháp / Tiếp tục.
export function WizardShell({
  title, step, total, onBack, onNext, nextLabel = 'Tiếp tục', nextDisabled, busy, onDraft, children, canBack = true,
}: {
  title: string; step: number; total: number; onBack: () => void; onNext: () => void;
  nextLabel?: string; nextDisabled?: boolean; busy?: boolean; onDraft?: () => void; children: React.ReactNode; canBack?: boolean;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: t.surface }}>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Pressable onPress={onBack} disabled={!canBack} style={{ opacity: canBack ? 1 : 0.3, padding: 4 }}>
            <Ionicons name="chevron-back" size={24} color={t.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.faint, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Bước {step} / {total}</Text>
            <Text style={{ color: t.ink, fontSize: 18, fontWeight: '800' }} numberOfLines={1}>{title}</Text>
          </View>
        </View>
        <ProgressBar value={(step / total) * 100} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 10, padding: 12, paddingBottom: insets.bottom + 10, borderTopWidth: 1, borderTopColor: t.border, backgroundColor: t.bg }}>
        {onDraft && <Button title="Lưu nháp" variant="default" onPress={onDraft} style={{ flex: 0.8 }} />}
        <Button title={nextLabel} onPress={onNext} disabled={nextDisabled} loading={busy} style={{ flex: 1.4 }} />
      </View>
    </View>
  );
}
