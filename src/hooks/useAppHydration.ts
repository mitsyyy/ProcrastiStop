import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { resetDemoStorageData } from '@/services/local/storage';
import { syncScheduledPreSessionAndNudgeNotifications } from '@/services/notifications/notificationService';
import { useBlockerStore } from '@/store/blockerStore';
import { useFocusStore } from '@/store/focusStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';

export function useAppHydration() {
  const hydrateSettings = useSettingsStore((s) => s.hydrateSettings);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const preferences = useSettingsStore((s) => s.preferences);
  const loadTasks = useTaskStore((s) => s.loadTasks);
  const tasks = useTaskStore((s) => s.tasks);
  const hydrateBlocker = useBlockerStore((s) => s.hydrateBlocker);
  const hydrateFocus = useFocusStore((s) => s.hydrateFocus);
  const activeSession = useFocusStore((s) => s.activeSession);

  useEffect(() => {
    let active = true;
    async function boot() {
      await hydrateSettings();
      if (!active) return;
      await Promise.all([loadTasks(), hydrateBlocker()]);
      if (!active) return;
      await hydrateFocus();
      if (!active) return;
      await useTaskStore.getState().reconcileMissedTasks(useFocusStore.getState().activeSession);
    }
    void boot();
    return () => {
      active = false;
    };
  }, [hydrateSettings, loadTasks, hydrateBlocker, hydrateFocus]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      void syncScheduledPreSessionAndNudgeNotifications(tasks, preferences, activeSession);
    }, 250);
    return () => clearTimeout(timer);
  }, [hydrated, tasks, preferences, activeSession]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void hydrateFocus().then(() => {
          void syncScheduledPreSessionAndNudgeNotifications(
            useTaskStore.getState().tasks,
            useSettingsStore.getState().preferences,
            useFocusStore.getState().activeSession,
          );
        });
      }
    });
    return () => subscription.remove();
  }, [hydrateFocus]);

  return hydrated;
}

export function useDemoReset() {
  const hydrateSettings = useSettingsStore((s) => s.hydrateSettings);
  const showToast = useSettingsStore((s) => s.showToast);
  const loadTasks = useTaskStore((s) => s.loadTasks);
  const hydrateBlocker = useBlockerStore((s) => s.hydrateBlocker);
  const hydrateFocus = useFocusStore((s) => s.hydrateFocus);

  return useCallback(async () => {
    await resetDemoStorageData();
    await hydrateSettings();
    await Promise.all([loadTasks(), hydrateBlocker()]);
    await hydrateFocus();
    await syncScheduledPreSessionAndNudgeNotifications(
      useTaskStore.getState().tasks,
      useSettingsStore.getState().preferences,
      useFocusStore.getState().activeSession,
    );
    showToast('Demo data reset and re-seeded from local snapshots.', 'success');
  }, [hydrateSettings, loadTasks, hydrateBlocker, hydrateFocus, showToast]);
}
