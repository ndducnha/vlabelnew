import React from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, ViewStyle, TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Theme } from '../theme';

export function Screen({ children, scroll = true, pad = true, refreshControl }: { children: React.ReactNode; scroll?: boolean; pad?: boolean; refreshControl?: React.ReactElement }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const style: ViewStyle = { flex: 1, backgroundColor: t.surface, paddingHorizontal: pad ? 16 : 0, paddingTop: insets.top + 8 };
  if (!scroll) return <View style={style}>{children}</View>;
  return (
    <ScrollView style={{ backgroundColor: t.surface }} contentContainerStyle={[style, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled" refreshControl={refreshControl}>
      {children}
    </ScrollView>
  );
}

export function Title({ children, sub }: { children: React.ReactNode; sub?: string }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 24, fontWeight: '800', color: t.ink, letterSpacing: -0.4 }}>{children}</Text>
      {sub ? <Text style={{ fontSize: 13.5, color: t.muted, marginTop: 3 }}>{sub}</Text> : null}
    </View>
  );
}

export function AppText({ children, style, muted, bold, size }: { children: React.ReactNode; style?: TextStyle; muted?: boolean; bold?: boolean; size?: number }) {
  const t = useTheme();
  return <Text style={[{ color: muted ? t.muted : t.ink, fontWeight: bold ? '700' : '400', fontSize: size ?? 14 }, style]}>{children}</Text>;
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }) {
  const t = useTheme();
  const s: ViewStyle = { backgroundColor: t.card, borderColor: t.border, borderWidth: 1, borderRadius: 16, padding: 14 };
  if (onPress) return <Pressable onPress={onPress} style={({ pressed }) => [s, style, pressed && { opacity: 0.7 }]}>{children}</Pressable>;
  return <View style={[s, style]}>{children}</View>;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, style, small }: { title: string; onPress?: () => void; variant?: 'primary' | 'default' | 'danger' | 'ghost'; disabled?: boolean; loading?: boolean; style?: ViewStyle; small?: boolean }) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.accent : variant === 'danger' ? t.dangerSoft : variant === 'ghost' ? 'transparent' : t.bg;
  const fg = variant === 'primary' ? '#fff' : variant === 'danger' ? t.danger : t.ink;
  const border = variant === 'primary' || variant === 'ghost' ? 'transparent' : t.border;
  return (
    <Pressable onPress={onPress} disabled={disabled || loading}
      style={({ pressed }) => [{ backgroundColor: bg, borderColor: border, borderWidth: 1, borderRadius: 13, paddingVertical: small ? 9 : 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: disabled ? 0.5 : 1 }, pressed && { opacity: 0.75 }, style]}>
      {loading && <ActivityIndicator size="small" color={fg} />}
      <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 13 : 15 }}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, multiline, autoCapitalize }: { label?: string; value: string; onChangeText: (v: string) => void; placeholder?: string; secureTextEntry?: boolean; keyboardType?: any; multiline?: boolean; autoCapitalize?: any }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Text style={{ color: t.ink2, fontWeight: '600', fontSize: 13, marginBottom: 6 }}>{label}</Text> : null}
      <TextInput
        value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={t.faint}
        secureTextEntry={secureTextEntry} keyboardType={keyboardType} multiline={multiline} autoCapitalize={autoCapitalize ?? 'none'}
        style={{ backgroundColor: t.bg, borderColor: t.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: multiline ? 12 : 13, color: t.ink, fontSize: 15, minHeight: multiline ? 90 : undefined, textAlignVertical: multiline ? 'top' : 'center' }}
      />
    </View>
  );
}

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'good' | 'warn' | 'danger' | 'accent' }) {
  const t = useTheme();
  const map: Record<string, [string, string]> = { neutral: [t.surface, t.muted], good: [t.goodSoft, t.good], warn: [t.warnSoft, t.warn], danger: [t.dangerSoft, t.danger], accent: [t.accentSoft, t.accentInk] };
  const [bg, fg] = map[tone];
  return <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }}><Text style={{ color: fg, fontSize: 11.5, fontWeight: '700' }}>{label}</Text></View>;
}

export function ProgressBar({ value }: { value: number }) {
  const t = useTheme();
  return (
    <View style={{ height: 8, borderRadius: 8, backgroundColor: t.surface, overflow: 'hidden' }}>
      <View style={{ height: '100%', width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: t.accent, borderRadius: 8 }} />
    </View>
  );
}

export function StatCard({ label, value, tone = 'accent', onPress }: { label: string; value: React.ReactNode; tone?: 'accent' | 'good' | 'warn' | 'danger'; onPress?: () => void }) {
  const t = useTheme();
  const fg = { accent: t.accent, good: t.good, warn: t.warn, danger: t.danger }[tone];
  return (
    <Card onPress={onPress} style={{ flex: 1, minWidth: 150 }}>
      <Text style={{ color: t.muted, fontSize: 12, fontWeight: '600' }}>{label}</Text>
      <Text style={{ color: fg, fontSize: 24, fontWeight: '800', marginTop: 4 }}>{value}</Text>
    </Card>
  );
}

export function Loading({ label }: { label?: string }) {
  const t = useTheme();
  return <View style={{ paddingVertical: 40, alignItems: 'center', gap: 10 }}><ActivityIndicator color={t.accent} /><Text style={{ color: t.muted }}>{label ?? 'Đang tải…'}</Text></View>;
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  const t = useTheme();
  return <Card style={{ alignItems: 'center', paddingVertical: 30 }}><Text style={{ fontSize: 30, marginBottom: 6 }}>📭</Text><Text style={{ color: t.ink, fontWeight: '700' }}>{title}</Text>{hint ? <Text style={{ color: t.muted, marginTop: 4, textAlign: 'center' }}>{hint}</Text> : null}</Card>;
}

export function SegTabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.surface, borderColor: t.border, borderWidth: 1, borderRadius: 11, padding: 3, gap: 3 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: on ? t.bg : 'transparent', alignItems: 'center' }}>
            <Text style={{ color: on ? t.ink : t.muted, fontWeight: '700', fontSize: 12.5 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Avatar({ name, size = 36 }: { name?: string; size?: number }) {
  const t = useTheme();
  const ini = (name ?? '?').split(' ').map((w) => w[0]).slice(-2).join('').toUpperCase();
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.36 }}>{ini}</Text></View>;
}

export function makeStyles<T extends StyleSheet.NamedStyles<T>>(fn: (t: Theme) => T) {
  return fn;
}
