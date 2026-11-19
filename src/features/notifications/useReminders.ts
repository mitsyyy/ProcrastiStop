import { useMemo } from 'react';

import { buildReminderPreviews } from '@/services/notifications/notificationService';
import { useFocusStore } from '@/store/focusStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';

export function useReminders() {
  const tasks = useTaskStore((s) => s.tasks);
  const preferences = useSettingsStore((s) => s.preferences);
  const activeSession = useFocusStore((s) => s.activeSession);

  return useMemo(
    () => buildReminderPreviews(tasks, preferences, activeSession),
    [tasks, preferences, activeSession],
  );
}
