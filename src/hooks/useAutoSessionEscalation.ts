import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import {
  findTaskDueForAutoStart,
  getLocalDateKey,
} from '@/features/tasks/antiProcrastinationScheduler';
import { useFocusStore } from '@/store/focusStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';

const CHECK_INTERVAL_MS = 15_000;

/**
 * Monitors open tasks whose scheduled focus session window is currently active.
 * Strictly enforces:
 * 1) Past-due & unstarted passed-window tasks are marked "Missed" (never auto-started, never +1h)
 * 2) Automatic session launches are deferred until `permissionOnboardingCompleted && isOnHomeScreen`
 *    so fresh installs / login permission prompts are never interrupted.
 */
export function useAutoSessionEscalation(ready: boolean): void {
  const pathname = usePathname();
  const user = useSettingsStore((s) => s.user);
  const onboardingCompleted = useSettingsStore((s) => s.onboardingCompleted);
  const permissionOnboardingCompleted = useSettingsStore((s) => s.permissionOnboardingCompleted);
  const runningRef = useRef(false);

  const isOnHomeScreen = pathname === '/home' || pathname === '/(tabs)/home';

  useEffect(() => {
    if (!ready || !user || !onboardingCompleted) return;

    const evaluate = async () => {
      if (runningRef.current) return;
      runningRef.current = true;
      try {
        // Step 1: Silently reconcile past-due & unstarted passed-window tasks to "Missed"
        const activeSession = useFocusStore.getState().activeSession;
        await useTaskStore.getState().reconcileMissedTasks(activeSession);

        // Step 2: Gate automatic session launches behind permissionOnboardingCompleted && isOnHomeScreen
        if (!permissionOnboardingCompleted || !isOnHomeScreen) {
          return;
        }

        const { tasks } = useTaskStore.getState();
        const latestSession = useFocusStore.getState().activeSession;
        const { preferences, showToast } = useSettingsStore.getState();

        const dueTask = findTaskDueForAutoStart(
          tasks,
          latestSession,
          preferences.defaultDailySessionStartTime,
          new Date(),
          preferences.focusDefaultMinutes,
        );
        if (!dueTask) return;

        const todayKey = getLocalDateKey(new Date());
        await useTaskStore.getState().updateTask(dueTask.id, {
          lastAutoStartedDate: todayKey,
          rescheduledStartAt: null,
        });

        showToast(
          `Scheduled time reached — hover over your workspace item to start "${dueTask.title}".`,
          'info',
        );

        // Open Hands-Free AI Camera Gate FIRST with alarm active (countdown starts after verification)
        router.push({
          pathname: '/focus/checkpoint',
          params: {
            mode: 'gate',
            alarm: '1',
            taskId: dueTask.id,
            item: dueTask.requiredCheckpointItem ?? 'book',
          },
        });
      } finally {
        runningRef.current = false;
      }
    };

    const initialTimer = setTimeout(() => {
      void evaluate();
    }, 650);

    const interval = setInterval(() => {
      void evaluate();
    }, CHECK_INTERVAL_MS);

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void evaluate();
      }
    });

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [ready, user, onboardingCompleted, permissionOnboardingCompleted, isOnHomeScreen]);
}
