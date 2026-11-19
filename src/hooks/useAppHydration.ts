import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { resetDemoStorageData } from '@/services/local/storage';
import { useBlockerStore } from '@/store/blockerStore';
import { useFocusStore } from '@/store/focusStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';

export function useAppHydration() {
  const hydrateSettings = useSettingsStore((s) => s.hydrateSettings);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const loadTasks = useTaskStore((s) => s.loadTasks);
  const hydrateBlocker = useBlockerStore((s) => s.hydrateBlocker);
  const hydrateFocus = useFocusStore((s) => s.hydrateFocus);

  useEffect(() => {
    let active = true;
    async function boot() {
      await hydrateSettings();
      if (!active) return;
      await Promise.all([loadTasks(), hydrateBlocker()]);
      if (!active) return;
      await hydrateFocus();
    }
    void boot();
    return () => {
      active = false;
    };
  }, [hydrateSettings, loadTasks, hydrateBlocker, hydrateFocus]);

  // Recover accurate timer immediately whenever the app returns from background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void hydrateFocus();
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
    showToast('Demo data reset and re-seeded from local snapshots.', 'success');
  }, [hydrateSettings, loadTasks, hydrateBlocker, hydrateFocus, showToast]);
}
