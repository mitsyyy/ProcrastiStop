import '@/global.css';

import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  getLastNotificationResponseAsync,
} from 'expo-notifications';
import { router, Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Toast } from '@/components/ui/Toast';
import {
  isTaskClosedOrTerminal,
  isTaskPastDue,
} from '@/features/tasks/antiProcrastinationScheduler';
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
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const handledColdStartIdRef = useRef<string | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const ready = (fontsLoaded || Boolean(fontError)) && hydrated;

  useAutoSessionEscalation(ready);

  const launchAutoStartAlarm = useCallback(async (taskId?: string) => {
    const settingsState = useSettingsStore.getState();
    const curPath = pathnameRef.current || '';
    // Never interrupt permission onboarding or auth screens with an automatic session popup
    if (
      !settingsState.permissionOnboardingCompleted ||
      curPath.startsWith('/permissions') ||
      curPath.startsWith('/login') ||
      curPath.startsWith('/register')
    ) {
      return;
    }

    const focusState = useFocusStore.getState();
    const hasLive =
      focusState.activeSession?.status === 'active' ||
      focusState.activeSession?.status === 'paused';

    if (hasLive) {
      router.push('/focus/active');
      return;
    }

    await useTaskStore.getState().reconcileMissedTasks(focusState.activeSession);
    const tasks = useTaskStore.getState().tasks;
    const nowMs = Date.now();
    const matchedTask =
      (taskId
        ? tasks.find((t) => t.id === taskId && !isTaskClosedOrTerminal(t) && !isTaskPastDue(t, nowMs))
        : undefined) ??
      tasks.find((t) => !isTaskClosedOrTerminal(t) && !isTaskPastDue(t, nowMs)) ??
      null;

    // Past Due Date Cutoff: do not launch alarm for past-due / missed tasks
    if (taskId && !matchedTask) {
      return;
    }

    // Launch Hands-Free AI Camera Checkpoint Gate FIRST — countdown starts only after verification
    router.push({
      pathname: '/focus/checkpoint',
      params: {
        mode: 'gate',
        alarm: '1',
        item: matchedTask?.requiredCheckpointItem ?? 'book',
        ...(matchedTask ? { taskId: matchedTask.id } : {}),
      },
    });
  }, []);

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
      '*{scrollbar-width:none;-ms-overflow-style:none;}*::-webkit-scrollbar{display:none;width:0;height:0;}button:focus,[role="button"]:focus{outline:none;}';
    document.head.appendChild(styleEl);
  }, []);

  // Handle cold-start notification launch (app was killed or device woke from alarm)
  useEffect(() => {
    if (!ready || Platform.OS === 'web') return;
    void getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const notifId = response.notification.request.identifier;
      if (handledColdStartIdRef.current === notifId) return;
      handledColdStartIdRef.current = notifId;

      const data = response.notification.request.content.data;
      const kind = typeof data?.kind === 'string' ? data.kind : undefined;
      const taskId = typeof data?.taskId === 'string' ? data.taskId : undefined;
      const targetRoute = typeof data?.route === 'string' ? data.route : undefined;

      if (kind === 'auto_start' || data?.fullScreenAlarm === true) {
        void launchAutoStartAlarm(taskId);
      } else if (targetRoute && targetRoute.startsWith('/')) {
        router.push(targetRoute as never);
      }
    });
  }, [ready, launchAutoStartAlarm]);

  // Handle foreground incoming auto-start alarm & user taps on background notifications
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const receivedSub = addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      const kind = typeof data?.kind === 'string' ? data.kind : undefined;
      const taskId = typeof data?.taskId === 'string' ? data.taskId : undefined;
      if (kind === 'auto_start' || data?.fullScreenAlarm === true) {
        void launchAutoStartAlarm(taskId);
      }
    });

    const responseSub = addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const kind = typeof data?.kind === 'string' ? data.kind : undefined;
      const taskId = typeof data?.taskId === 'string' ? data.taskId : undefined;
      const targetRoute = typeof data?.route === 'string' ? data.route : undefined;

      if (kind === 'auto_start' || data?.fullScreenAlarm === true) {
        void launchAutoStartAlarm(taskId);
        return;
      }

      if (targetRoute && targetRoute.startsWith('/')) {
        router.push(targetRoute as never);
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [launchAutoStartAlarm]);

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
        <Stack.Screen name="(auth)/permissions" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="tasks/create" />
        <Stack.Screen name="tasks/[taskId]" />
        <Stack.Screen name="tasks/edit/[taskId]" />
        <Stack.Screen name="focus/setup" />
        <Stack.Screen name="focus/active" />
        <Stack.Screen name="focus/checkpoint" options={{ gestureEnabled: false }} />
        <Stack.Screen name="focus/completed" />
      </Stack>
      <Toast />
    </SafeAreaProvider>
  );
}
