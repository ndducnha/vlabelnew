import React, { useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, ViewStyle, TextStyle,
} from 'react-native';
import { Icon } from './icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Theme, font, radius, shadow } from '../theme';

export function Screen({ children, scroll = true, pad = true, refreshControl, header = false }: { children: React.ReactNode; scroll?: boolean; pad?: boolean; refreshControl?: React.ReactElement; header?: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  // header=true: màn có stack header phía trên -> không cộng safe-area top nữa.
  const style: ViewStyle = { flex: 1, backgroundColor: t.surface, paddingHorizontal: pad ? 18 : 0, paddingTop: header ? 14 : insets.top + 10 };
  if (!scroll) return <View style={style}>{children}</View>;
  return (
    <ScrollView style={{ backgroundColor: t.surface }} contentContainerStyle={[style, { paddingBottom: 48 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
      {children}
    </ScrollView>
  );
}

// Motif chữ ký: gạch navy 16x2 + chữ mono IN HOA giãn chữ.
export function Eyebrow({ children, tone = 'accent' }: { children: React.ReactNode; tone?: 'accent' | 'muted' | 'good' | 'warn' | 'danger' }) {
  const t = useTheme();
  const tick = { accent: t.accent, muted: t.faint, good: t.good, warn: t.warn, danger: t.danger }[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 16, height: 2, borderRadius: 2, backgroundColor: tick }} />
      <Text style={{ fontFamily: font.monoMed, fontSize: 10.5, letterSpacing: 1.6, color: t.muted, textTransform: 'uppercase' }}>{children}</Text>
    </View>
  );
}

export function Title({ children, sub, eyebrow }: { children: React.ReactNode; sub?: string; eyebrow?: string }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 18 }}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <Text style={{ fontFamily: font.serifBold, fontSize: 28, color: t.ink, letterSpacing: -0.3, marginTop: eyebrow ? 7 : 0 }}>{children}</Text>
      {sub ? <Text style={{ fontFamily: font.body, fontSize: 13.5, color: t.muted, marginTop: 5, lineHeight: 20 }}>{sub}</Text> : null}
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12, marginTop: 4 }}>
      <Text style={{ fontFamily: font.serif, fontSize: 18, color: t.ink, letterSpacing: -0.2 }}>{title}</Text>
      {action ? <Pressable onPress={onAction} hitSlop={8}><Text style={{ fontFamily: font.monoMed, fontSize: 11, letterSpacing: 0.8, color: t.accent, textTransform: 'uppercase' }}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function AppText({ children, style, muted, bold, size, mono }: { children: React.ReactNode; style?: TextStyle; muted?: boolean; bold?: boolean; size?: number; mono?: boolean }) {
  const t = useTheme();
  const fam = mono ? font.mono : bold ? font.semibold : font.body;
  return <Text style={[{ color: muted ? t.muted : t.ink, fontFamily: fam, fontSize: size ?? 14, lineHeight: (size ?? 14) * 1.45 }, style]}>{children}</Text>;
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: 1, backgroundColor: t.hairline }} />;
}

export function Card({ children, style, onPress, elevated = true }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void; elevated?: boolean }) {
  const t = useTheme();
  const s: ViewStyle = { backgroundColor: t.card, borderColor: t.border, borderWidth: 1, borderRadius: radius.lg, padding: 16, ...(elevated ? shadow(t, 1) : {}) };
  if (onPress) return <Pressable onPress={onPress} style={({ pressed }) => [s, style, pressed && { opacity: 0.85 }]}>{children}</Pressable>;
  return <View style={[s, style]}>{children}</View>;
}

// Ô icon bo góc mềm dùng trong hàng danh sách.
export function IconBadge({ name, tone = 'accent', size = 42 }: { name: any; tone?: 'accent' | 'good' | 'warn' | 'danger' | 'muted'; size?: number }) {
  const t = useTheme();
  const map: Record<string, [string, string]> = {
    accent: [t.accentSoft, t.accent], good: [t.goodSoft, t.good], warn: [t.warnSoft, t.warn], danger: [t.dangerSoft, t.danger], muted: [t.surface, t.muted],
  };
  const [bg, fg] = map[tone];
  return <View style={{ width: size, height: size, borderRadius: size * 0.31, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Icon name={name} size={size * 0.5} color={fg} /></View>;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, style, small, icon }: { title: string; onPress?: () => void; variant?: 'primary' | 'default' | 'danger' | 'ghost'; disabled?: boolean; loading?: boolean; style?: ViewStyle; small?: boolean; icon?: any }) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.accent : variant === 'danger' ? t.dangerSoft : variant === 'ghost' ? 'transparent' : t.card;
  const fg = variant === 'primary' ? (t.accentContrast) : variant === 'danger' ? t.danger : t.ink;
  const border = variant === 'primary' ? t.accent : variant === 'ghost' ? 'transparent' : t.border;
  return (
    <Pressable onPress={onPress} disabled={disabled || loading}
      style={({ pressed }) => [{ backgroundColor: bg, borderColor: border, borderWidth: 1, borderRadius: radius.md, paddingVertical: small ? 9 : 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: disabled ? 0.45 : 1 }, variant === 'primary' && !disabled ? shadow(t, 1) : null, pressed && { opacity: 0.8 }, style]}>
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <Icon name={icon} size={small ? 15 : 17} color={fg} /> : null}
      <Text style={{ color: fg, fontFamily: font.bold, fontSize: small ? 13 : 15, letterSpacing: 0.1 }}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, multiline, autoCapitalize, icon, hint }: { label?: string; value: string; onChangeText: (v: string) => void; placeholder?: string; secureTextEntry?: boolean; keyboardType?: any; multiline?: boolean; autoCapitalize?: any; icon?: any; hint?: string }) {
  const t = useTheme();
  const [focus, setFocus] = useState(false);
  const [hidden, setHidden] = useState(true);
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={{ color: t.ink2, fontFamily: font.semibold, fontSize: 12.5, marginBottom: 7, letterSpacing: 0.1 }}>{label}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: multiline ? 'flex-start' : 'center', backgroundColor: t.bg, borderColor: focus ? t.accent : t.border, borderWidth: focus ? 1.5 : 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: multiline ? 12 : 0, ...(focus ? shadow(t, 1) : {}) }}>
        {icon ? <Icon name={icon} size={18} color={focus ? t.accent : t.faint} style={{ marginRight: 9, marginTop: multiline ? 2 : 0 }} /> : null}
        <TextInput
          value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={t.faint}
          secureTextEntry={secureTextEntry && hidden} keyboardType={keyboardType} multiline={multiline} autoCapitalize={autoCapitalize ?? 'none'}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ flex: 1, color: t.ink, fontFamily: font.body, fontSize: 15, paddingVertical: multiline ? 0 : 13, minHeight: multiline ? 88 : undefined, textAlignVertical: multiline ? 'top' : 'center' }}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} style={{ paddingLeft: 8 }}>
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} size={19} color={t.faint} />
          </Pressable>
        ) : null}
      </View>
      {hint ? <Text style={{ color: t.faint, fontFamily: font.body, fontSize: 11.5, marginTop: 5 }}>{hint}</Text> : null}
    </View>
  );
}

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'good' | 'warn' | 'danger' | 'accent' }) {
  const t = useTheme();
  const map: Record<string, [string, string]> = { neutral: [t.surface, t.muted], good: [t.goodSoft, t.good], warn: [t.warnSoft, t.warn], danger: [t.dangerSoft, t.danger], accent: [t.accentSoft, t.accentInk] };
  const [bg, fg] = map[tone];
  return <View style={{ backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' }}><Text style={{ color: fg, fontFamily: font.monoBold, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' }}>{label}</Text></View>;
}

export function ProgressBar({ value }: { value: number }) {
  const t = useTheme();
  return (
    <View style={{ height: 7, borderRadius: radius.pill, backgroundColor: t.dark ? t.hairline : t.surface, overflow: 'hidden' }}>
      <LinearGradient colors={[t.accent, t.accentBright]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', width: `${Math.max(0, Math.min(100, value))}%`, borderRadius: radius.pill }} />
    </View>
  );
}

export function StatCard({ label, value, tone = 'accent', onPress }: { label: string; value: React.ReactNode; tone?: 'accent' | 'good' | 'warn' | 'danger'; onPress?: () => void }) {
  const t = useTheme();
  const fg = { accent: t.accent, good: t.good, warn: t.warn, danger: t.danger }[tone];
  return (
    <Card onPress={onPress} style={{ flex: 1, minWidth: 150, paddingVertical: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        <View style={{ width: 12, height: 2, borderRadius: 2, backgroundColor: fg }} />
        <Text style={{ color: t.muted, fontFamily: font.monoMed, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={{ color: fg, fontFamily: font.serifBold, fontSize: 32, letterSpacing: -0.5 }}>{value}</Text>
    </Card>
  );
}

// Hàng label / value với kẻ mảnh — dùng cho màn chi tiết.
export function Row({ label, value, valueTone, last }: { label: string; value: React.ReactNode; valueTone?: string; last?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: last ? 0 : 1, borderBottomColor: t.hairline, gap: 12 }}>
      <Text style={{ color: t.muted, fontFamily: font.body, fontSize: 13 }}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number'
        ? <Text style={{ color: valueTone ?? t.ink, fontFamily: font.semibold, fontSize: 13.5, textAlign: 'right', flexShrink: 1 }}>{value}</Text>
        : value}
    </View>
  );
}

export function RowsCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <Card style={{ paddingVertical: 4, ...style }}>{children}</Card>;
}

export function Loading({ label }: { label?: string }) {
  const t = useTheme();
  return <View style={{ paddingVertical: 44, alignItems: 'center', gap: 12 }}><ActivityIndicator color={t.accent} /><Text style={{ color: t.muted, fontFamily: font.monoMed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{label ?? 'Đang tải'}</Text></View>;
}

export function Empty({ title, hint, icon = 'file-tray-outline' }: { title: string; hint?: string; icon?: any }) {
  const t = useTheme();
  return (
    <Card style={{ alignItems: 'center', paddingVertical: 34 }}>
      <IconBadge name={icon} tone="muted" size={54} />
      <Text style={{ color: t.ink, fontFamily: font.semibold, fontSize: 15, marginTop: 12 }}>{title}</Text>
      {hint ? <Text style={{ color: t.muted, fontFamily: font.body, fontSize: 13, marginTop: 5, textAlign: 'center', lineHeight: 19 }}>{hint}</Text> : null}
    </Card>
  );
}

export function SegTabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.dark ? t.hairline : t.surface, borderColor: t.border, borderWidth: 1, borderRadius: radius.md, padding: 3, gap: 3 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[{ flex: 1, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: on ? t.card : 'transparent', alignItems: 'center' }, on ? shadow(t, 1) : null]}>
            <Text style={{ color: on ? t.ink : t.muted, fontFamily: on ? font.semibold : font.medium, fontSize: 12.5 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Avatar({ name, size = 38 }: { name?: string; size?: number }) {
  const t = useTheme();
  const ini = (name ?? '?').split(' ').map((w) => w[0]).slice(-2).join('').toUpperCase();
  return <LinearGradient colors={[t.accent, t.accentBright]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: t.accentContrast, fontFamily: font.serifBold, fontSize: size * 0.4 }}>{ini}</Text></LinearGradient>;
}

// Thẻ hành động lớn, dễ bấm - dùng cho trang chủ đơn giản (task-first).
export function ActionCard({ icon, title, subtitle, onPress, tone = 'accent', badge }: { icon: any; title: string; subtitle?: string; onPress?: () => void; tone?: 'accent' | 'good' | 'warn' | 'danger' | 'muted'; badge?: number }) {
  const t = useTheme();
  return (
    <Card onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 }}>
      <IconBadge name={icon} tone={tone} size={52} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.ink, fontFamily: font.serifBold, fontSize: 16.5, letterSpacing: -0.2 }}>{title}</Text>
        {subtitle ? <Text style={{ color: t.muted, fontFamily: font.body, fontSize: 12.5, marginTop: 2, lineHeight: 17 }}>{subtitle}</Text> : null}
      </View>
      {badge ? <View style={{ minWidth: 22, height: 22, borderRadius: 11, backgroundColor: t.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}><Text style={{ color: '#fff', fontFamily: font.bold, fontSize: 11 }}>{badge}</Text></View> : null}
      <Icon name="chevron-forward" size={20} color={t.faint} />
    </Card>
  );
}

// Header trang chủ: lời chào + chuông thông báo.
export function HomeHeader({ greeting, title, onBell, bellCount }: { greeting?: string; title: string; onBell?: () => void; bellCount?: number }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 }}>
      <View style={{ flex: 1 }}>
        {greeting ? <Text style={{ color: t.muted, fontFamily: font.body, fontSize: 13.5 }}>{greeting}</Text> : null}
        <Text style={{ color: t.ink, fontFamily: font.serifBold, fontSize: 27, letterSpacing: -0.3, marginTop: 2 }}>{title}</Text>
      </View>
      {onBell ? (
        <Pressable onPress={onBell} hitSlop={8} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', ...shadow(t, 1) }}>
          <Icon name="notifications-outline" size={21} color={t.ink} />
          {bellCount ? <View style={{ position: 'absolute', top: 8, right: 8, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: t.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: t.card }}><Text style={{ color: '#fff', fontFamily: font.bold, fontSize: 9 }}>{bellCount > 9 ? '9+' : bellCount}</Text></View> : null}
        </Pressable>
      ) : null}
    </View>
  );
}

export function makeStyles<T extends StyleSheet.NamedStyles<T>>(fn: (t: Theme) => T) {
  return fn;
}
