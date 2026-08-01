import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

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
          <View style={[styles.toast, { backgroundColor: msg.ok ? t.ink : t.danger }]}>
            <Text style={styles.text}>{msg.text}</Text>
          </View>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 90, alignItems: 'center', zIndex: 999 },
  toast: { maxWidth: '90%', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12 },
  text: { color: '#fff', fontWeight: '600', fontSize: 13.5, textAlign: 'center' },
});
