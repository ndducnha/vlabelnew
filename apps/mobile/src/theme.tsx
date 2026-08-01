import React, { createContext, useContext } from 'react';
import { Platform, useColorScheme, ViewStyle } from 'react-native';

export interface Theme {
  dark: boolean;
  accent: string; accentDeep: string; accentBright: string; accentSoft: string; accentInk: string; accentContrast: string;
  bg: string; surface: string; card: string; border: string; borderStrong: string; hairline: string;
  ink: string; ink2: string; muted: string; faint: string;
  good: string; goodSoft: string; warn: string; warnSoft: string; danger: string; dangerSoft: string;
  shadowColor: string;
}

// Bảng màu lấy từ logo Vlabel (chữ V nhãn dán, gradient teal-blue #14486F → #4FA3C8). Nền mát/sạch.
const light: Theme = {
  dark: false,
  accent: '#1A5C88', accentDeep: '#14486F', accentBright: '#4FA3C8', accentSoft: '#E7F1F6', accentInk: '#14486F', accentContrast: '#FFFFFF',
  bg: '#FFFFFF', surface: '#EFF4F8', card: '#FFFFFF', border: '#E1E9F0', borderStrong: '#CDD9E3', hairline: '#ECF1F5',
  ink: '#12222E', ink2: '#3B4E5B', muted: '#62727F', faint: '#9AAAB6',
  good: '#1E8E6A', goodSoft: '#E2F2EC', warn: '#B9781A', warnSoft: '#F7EDD9', danger: '#D14A3E', dangerSoft: '#FAE8E5',
  shadowColor: '#0F3A57',
};
const dark: Theme = {
  dark: true,
  accent: '#5AAAD0', accentDeep: '#2C6B92', accentBright: '#8CCADF', accentSoft: '#122C3D', accentInk: '#A9DCEC', accentContrast: '#06222F',
  bg: '#141C23', surface: '#0D141A', card: '#19232D', border: '#28333E', borderStrong: '#384654', hairline: '#212B34',
  ink: '#E7EEF3', ink2: '#B6C3CD', muted: '#8493A0', faint: '#57666F',
  good: '#4FC79B', goodSoft: '#12291F', warn: '#E0A94B', warnSoft: '#2C2314', danger: '#EF6F66', dangerSoft: '#301917',
  shadowColor: '#000000',
};

// Font tokens — trong RN, fontFamily tuỳ biến bỏ qua fontWeight, nên weight nằm trong tên family.
export const font = {
  serif: 'PlayfairDisplay_600SemiBold',   // tiêu đề màn hình, số lớn
  serifBold: 'PlayfairDisplay_700Bold',
  serifBlack: 'PlayfairDisplay_800ExtraBold',
  body: 'BeVietnamPro_400Regular',         // thân
  medium: 'BeVietnamPro_500Medium',
  semibold: 'BeVietnamPro_600SemiBold',
  bold: 'BeVietnamPro_700Bold',
  mono: 'JetBrainsMono_400Regular',        // eyebrow IN HOA, mã GTIN/lô, số kỹ thuật
  monoMed: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
};

// Bo góc & shadow đồng nhất (thang elevation).
export const radius = { sm: 10, md: 14, lg: 20, xl: 24, pill: 999 };

export function shadow(t: Theme, level: 0 | 1 | 2 | 3 = 1): ViewStyle {
  if (level === 0) return {};
  const map = {
    1: { r: 8, y: 3, o: t.dark ? 0.35 : 0.06, e: 2 },
    2: { r: 16, y: 6, o: t.dark ? 0.45 : 0.09, e: 5 },
    3: { r: 26, y: 12, o: t.dark ? 0.55 : 0.13, e: 10 },
  }[level];
  return Platform.select({
    ios: { shadowColor: t.shadowColor, shadowOpacity: map.o, shadowRadius: map.r, shadowOffset: { width: 0, height: map.y } },
    android: { elevation: map.e },
    default: {},
  }) as ViewStyle;
}

const ThemeCtx = createContext<Theme>(light);
export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  return <ThemeCtx.Provider value={scheme === 'dark' ? dark : light}>{children}</ThemeCtx.Provider>;
}

export const spacing = (n: number) => n * 4;
