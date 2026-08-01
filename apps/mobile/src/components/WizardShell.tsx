import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Icon } from './icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, font, shadow } from '../theme';
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
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 14, backgroundColor: t.bg, borderBottomWidth: 1, borderBottomColor: t.hairline }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Pressable onPress={onBack} disabled={!canBack} hitSlop={8} style={{ opacity: canBack ? 1 : 0.3, width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevron-back" size={20} color={t.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <View style={{ width: 14, height: 2, borderRadius: 2, backgroundColor: t.accent }} />
              <Text style={{ color: t.muted, fontFamily: font.monoMed, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' }}>Bước {step} / {total}</Text>
            </View>
            <Text style={{ color: t.ink, fontFamily: font.serifBold, fontSize: 20, letterSpacing: -0.2, marginTop: 2 }} numberOfLines={1}>{title}</Text>
          </View>
        </View>
        <ProgressBar value={(step / total) * 100} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 28 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 10, padding: 14, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: t.border, backgroundColor: t.bg, ...shadow(t, 2) }}>
        {onDraft && <Button title="Lưu nháp" variant="default" onPress={onDraft} style={{ flex: 0.8 }} />}
        <Button title={nextLabel} onPress={onNext} disabled={nextDisabled} loading={busy} style={{ flex: 1.4 }} />
      </View>
    </View>
  );
}
