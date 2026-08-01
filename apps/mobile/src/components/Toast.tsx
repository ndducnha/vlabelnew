import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Icon } from './icons';
import { useTheme, font, shadow } from '../theme';

type ToastFn = (msg: string, ok?: boolean) => void;
const Ctx = createContext<ToastFn>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;

  const show = useCallback<ToastFn>((text, ok = true) => {
    setMsg({ text, ok });
    Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setMsg(null));
    }, 2600);
  }, [opacity]);

  return (
    <Ctx.Provider value={show}>
      {children}
      {msg && (
        <Animated.View pointerEvents="none" style={[styles.wrap, { opacity }]}>
          <View style={[styles.toast, { backgroundColor: msg.ok ? t.accentInk : t.danger }, shadow(t, 3)]}>
            <Icon name={msg.ok ? 'checkmark-circle' : 'alert-circle'} size={18} color="#fff" />
            <Text style={styles.text}>{msg.text}</Text>
          </View>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 96, alignItems: 'center', zIndex: 999, paddingHorizontal: 18 },
  toast: { maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 },
  text: { color: '#fff', fontFamily: font.semibold, fontSize: 13.5, textAlign: 'left', flexShrink: 1 },
});
