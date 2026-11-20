import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Toast } from '@/components/ui/Toast';
import { useAppHydration } from '@/hooks/useAppHydration';
import { useAppTheme } from '@/hooks/useAppTheme';
import {
  configureNotificationHandler,
  ensureAndroidNotificationChannel,
} from '@/services/notifications/notificationService';

SplashScreen.preventAutoHideAsync();
configureNotificationHandler();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  const hydrated = useAppHydration();
  const palette = useAppTheme();

  const ready = (fontsLoaded || Boolean(fontError)) && hydrated;

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
      void ensureAndroidNotificationChannel();
    }
  }, [ready]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const targetRoute = response.notification.request.content.data?.route;
      if (typeof targetRoute === 'string' && targetRoute.startsWith('/')) {
        router.push(targetRoute as never);
      }
    });
    return () => subscription.remove();
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={palette.mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="tasks/create" />
        <Stack.Screen name="tasks/[taskId]" />
        <Stack.Screen name="tasks/edit/[taskId]" />
        <Stack.Screen name="focus/setup" />
        <Stack.Screen name="focus/active" />
        <Stack.Screen name="focus/checkpoint" />
        <Stack.Screen name="focus/completed" />
      </Stack>
      <Toast />
    </SafeAreaProvider>
  );
}
