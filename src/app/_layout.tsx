import '@/global.css';

import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { addNotificationResponseReceivedListener } from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Toast } from '@/components/ui/Toast';
import { getLocalDateKey } from '@/features/tasks/antiProcrastinationScheduler';
import { useAppHydration } from '@/hooks/useAppHydration';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAutoSessionEscalation } from '@/hooks/useAutoSessionEscalation';
import {
  configureNotificationHandler,
  ensureAndroidNotificationChannel,
} from '@/services/notifications/notificationService';
import { useFocusStore } from '@/store/focusStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';

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

  useAutoSessionEscalation(ready);

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
      void ensureAndroidNotificationChannel();
    }
  }, [ready]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const styleId = 'procrastistop-hide-scrollbars';
    if (document.getElementById(styleId)) return;
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent =
      '*{scrollbar-width:none;-ms-overflow-style:none;}*::-webkit-scrollbar{display:none;width:0;height:0;}';
    document.head.appendChild(styleEl);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const kind = typeof data?.kind === 'string' ? data.kind : undefined;
      const taskId = typeof data?.taskId === 'string' ? data.taskId : undefined;
      const targetRoute = typeof data?.route === 'string' ? data.route : undefined;

      if (kind === 'auto_start' && taskId) {
        const focusState = useFocusStore.getState();
        const hasLive =
          focusState.activeSession?.status === 'active' ||
          focusState.activeSession?.status === 'paused';

        if (!hasLive) {
          const task = useTaskStore.getState().tasks.find((t) => t.id === taskId);
          const prefs = useSettingsStore.getState().preferences;
          if (task && task.status !== 'completed' && task.status !== 'cancelled') {
            const minutes =
              task.estimatedMinutes && task.estimatedMinutes >= 10
                ? Math.min(task.estimatedMinutes, 90)
                : prefs.focusDefaultMinutes;
            void useTaskStore.getState().updateTask(task.id, {
              lastAutoStartedDate: getLocalDateKey(new Date()),
              status: 'in_progress',
            });
            void focusState
              .startSession({
                taskId: task.id,
                taskTitleSnapshot: task.title,
                plannedDurationMinutes: minutes,
                checkpointEnabled: prefs.checkpointEnabled,
              })
              .then(() => {
                router.push('/focus/active');
              });
            return;
          }
        }
        router.push('/focus/active');
        return;
      }

      if (targetRoute && targetRoute.startsWith('/')) {
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
