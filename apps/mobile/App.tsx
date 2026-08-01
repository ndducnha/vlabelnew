import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_600SemiBold, PlayfairDisplay_700Bold, PlayfairDisplay_800ExtraBold,
} from '@expo-google-fonts/playfair-display';
import {
  BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold, BeVietnamPro_700Bold,
} from '@expo-google-fonts/be-vietnam-pro';
import {
  JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { queryClient } from './src/lib/query';
import { AuthProvider } from './src/lib/auth';
import { ThemeProvider } from './src/theme';
import { ToastProvider } from './src/components/Toast';
import RootNavigator from './src/navigation';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_600SemiBold, PlayfairDisplay_700Bold, PlayfairDisplay_800ExtraBold,
    BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold, BeVietnamPro_700Bold,
    JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_700Bold,
  });

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <StatusBar style="auto" />
              {fontsLoaded || fontError ? (
                <RootNavigator />
              ) : (
                <View style={{ flex: 1, backgroundColor: '#F4F1E9', alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color="#1F3A6D" size="large" />
                </View>
              )}
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
