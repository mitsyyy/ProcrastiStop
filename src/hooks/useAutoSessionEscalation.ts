import { router } from 'expo-router';
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
 * Monitors open tasks whose free-will nudge window has elapsed and whose daily focus
 * session start time has arrived. When due, automatically launches the focus session
 * so the user cannot keep deferring the task.
 */
export function useAutoSessionEscalation(ready: boolean): void {
  const user = useSettingsStore((s) => s.user);
  const onboardingCompleted = useSettingsStore((s) => s.onboardingCompleted);
  const runningRef = useRef(false);

  useEffect(() => {
    if (!ready || !user || !onboardingCompleted) return;

    const evaluate = async () => {
      if (runningRef.current) return;
      runningRef.current = true;
      try {
        const { tasks } = useTaskStore.getState();
        const { activeSession } = useFocusStore.getState();
        const { preferences, showToast } = useSettingsStore.getState();

        const dueTask = findTaskDueForAutoStart(
          tasks,
          activeSession,
          preferences.defaultDailySessionStartTime,
          new Date(),
        );
        if (!dueTask) return;

        const todayKey = getLocalDateKey(new Date());
        await useTaskStore.getState().updateTask(dueTask.id, {
          lastAutoStartedDate: todayKey,
          status: 'in_progress',
        });

        const plannedDurationMinutes =
          dueTask.estimatedMinutes && dueTask.estimatedMinutes >= 10
            ? Math.min(dueTask.estimatedMinutes, 90)
            : preferences.focusDefaultMinutes;

        await useFocusStore.getState().startSession({
          taskId: dueTask.id,
          taskTitleSnapshot: dueTask.title,
          plannedDurationMinutes,
          checkpointEnabled: preferences.checkpointEnabled,
        });

        showToast(
          `Scheduled time reached — auto-started focus for "${dueTask.title}".`,
          'info',
        );
        router.push('/focus/active');
      } finally {
        runningRef.current = false;
      }
    };

    const initialTimer = setTimeout(() => {
      void evaluate();
    }, 900);

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
  }, [ready, user, onboardingCompleted]);
}
