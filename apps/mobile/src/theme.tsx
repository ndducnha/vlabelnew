import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

export interface Theme {
  dark: boolean;
  accent: string; accentSoft: string; accentInk: string;
  bg: string; surface: string; card: string; border: string;
  ink: string; ink2: string; muted: string; faint: string;
  good: string; goodSoft: string; warn: string; warnSoft: string; danger: string; dangerSoft: string;
}

const light: Theme = {
  dark: false,
  accent: '#2E5BE8', accentSoft: '#EAF1FF', accentInk: '#1B3A8F',
  bg: '#FFFFFF', surface: '#F5F7FB', card: '#FFFFFF', border: '#E7EAF2',
  ink: '#0F1626', ink2: '#41506B', muted: '#6A778F', faint: '#98A3B8',
  good: '#12A150', goodSoft: '#E5F6EC', warn: '#D97706', warnSoft: '#FBF0DD', danger: '#E23744', dangerSoft: '#FCE9EA',
};
const dark: Theme = {
  dark: true,
  accent: '#5B8CFF', accentSoft: '#18233D', accentInk: '#AFC6FF',
  bg: '#0B0E14', surface: '#0F141E', card: '#141A26', border: '#242C3B',
  ink: '#E8ECF4', ink2: '#B8C1D4', muted: '#8A94AB', faint: '#5D6884',
  good: '#3BD37E', goodSoft: '#122A1E', warn: '#E5A64B', warnSoft: '#2A2113', danger: '#F26D71', dangerSoft: '#2E1719',
};

const ThemeCtx = createContext<Theme>(light);
export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  return <ThemeCtx.Provider value={scheme === 'dark' ? dark : light}>{children}</ThemeCtx.Provider>;
}

export const spacing = (n: number) => n * 4;
