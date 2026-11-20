import {
  AndroidImportance,
  cancelScheduledNotificationAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  SchedulableTriggerInputTypes,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import type { FocusSession } from '@/types/focus';
import type { ScheduledReminderPreview, UserPreferences } from '@/types/settings';
import type { Task } from '@/types/task';
import { formatDeadlineLabel, getTaskDeadlineState } from '@/utils/date';

export const PROCRASTISTOP_NOTIFICATION_CHANNEL_ID = 'procrastistop-reminders';

export interface NotificationPermissionState {
  status: 'granted' | 'denied' | 'undetermined' | 'unavailable';
  canAskAgain: boolean;
}

export interface LocalNotificationResult {
  scheduled: boolean;
  id?: string;
  permissionStatus: NotificationPermissionState['status'];
  canAskAgain: boolean;
  reason?: string;
}

let handlerConfigured = false;

export function configureNotificationHandler(): void {
  if (Platform.OS === 'web' || handlerConfigured) return;
  handlerConfigured = true;
  setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await setNotificationChannelAsync(PROCRASTISTOP_NOTIFICATION_CHANNEL_ID, {
    name: 'Focus & Deadline Reminders',
    description: 'Focus session completions and upcoming task deadline alerts.',
    importance: AndroidImportance.HIGH,
    vibrationPattern: [0, 220, 160, 220],
    lightColor: '#2eac73',
  });
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  if (Platform.OS === 'web') {
    return { status: 'unavailable', canAskAgain: false };
  }
  const perms = await getPermissionsAsync();
  const status =
    perms.status === 'granted'
      ? 'granted'
      : perms.status === 'denied'
        ? 'denied'
        : 'undetermined';
  return { status, canAskAgain: perms.canAskAgain };
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (Platform.OS === 'web') {
    return { status: 'unavailable', canAskAgain: false };
  }
  await ensureAndroidNotificationChannel();
  const existing = await getPermissionsAsync();
  if (existing.status === 'granted') {
    return { status: 'granted', canAskAgain: true };
  }
  const requested = await requestPermissionsAsync();
  const status =
    requested.status === 'granted'
      ? 'granted'
      : requested.status === 'denied'
        ? 'denied'
        : 'undetermined';
  return { status, canAskAgain: requested.canAskAgain };
}

export async function openAppSystemSettings(): Promise<void> {
  await Linking.openSettings();
}

export async function sendTestLocalNotification(
  delaySeconds = 3,
): Promise<LocalNotificationResult> {
  if (Platform.OS === 'web') {
    return {
      scheduled: false,
      permissionStatus: 'unavailable',
      canAskAgain: false,
      reason: 'System notifications require an Android or iOS device.',
    };
  }

  const perm = await requestNotificationPermission();
  if (perm.status !== 'granted') {
    return {
      scheduled: false,
      permissionStatus: perm.status,
      canAskAgain: perm.canAskAgain,
      reason: perm.canAskAgain
        ? 'Notification permission was not granted.'
        : 'Notifications are disabled in Android Settings.',
    };
  }

  const id = await scheduleNotificationAsync({
    content: {
      title: 'ProcrastiStop reminder active',
      body: 'Local Android notifications are working on your device.',
      sound: 'default',
      data: { route: '/(tabs)/focus' },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.round(delaySeconds)),
      channelId: Platform.OS === 'android' ? PROCRASTISTOP_NOTIFICATION_CHANNEL_ID : undefined,
    },
  });

  return {
    scheduled: true,
    id,
    permissionStatus: 'granted',
    canAskAgain: true,
  };
}

export async function scheduleReminderNotification(params: {
  title: string;
  body: string;
  delaySeconds?: number;
  route?: string;
}): Promise<LocalNotificationResult> {
  if (Platform.OS === 'web') {
    return {
      scheduled: false,
      permissionStatus: 'unavailable',
      canAskAgain: false,
      reason: 'System notifications require an Android or iOS device.',
    };
  }

  const perm = await requestNotificationPermission();
  if (perm.status !== 'granted') {
    return {
      scheduled: false,
      permissionStatus: perm.status,
      canAskAgain: perm.canAskAgain,
      reason: 'Notification permission is required to schedule reminders.',
    };
  }

  const id = await scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      sound: 'default',
      data: params.route ? { route: params.route } : {},
    },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.round(params.delaySeconds ?? 5)),
      channelId: Platform.OS === 'android' ? PROCRASTISTOP_NOTIFICATION_CHANNEL_ID : undefined,
    },
  });

  return {
    scheduled: true,
    id,
    permissionStatus: 'granted',
    canAskAgain: true,
  };
}

export async function scheduleFocusCompletionNotification(
  taskTitle: string,
  endTimestampMs: number,
): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (endTimestampMs <= Date.now() + 2000) return null;

  const perm = await getNotificationPermissionState();
  if (perm.status !== 'granted') return null;

  await ensureAndroidNotificationChannel();
  return scheduleNotificationAsync({
    content: {
      title: 'Focus session complete',
      body: `Great work protecting time for "${taskTitle}". Tap to review your summary.`,
      sound: 'default',
      data: { route: '/focus/completed' },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: new Date(endTimestampMs),
      channelId: Platform.OS === 'android' ? PROCRASTISTOP_NOTIFICATION_CHANNEL_ID : undefined,
    },
  });
}

export async function cancelScheduledNotification(id: string | null): Promise<void> {
  if (!id || Platform.OS === 'web') return;
  try {
    await cancelScheduledNotificationAsync(id);
  } catch {
    // Notification may already have fired or been cleared
  }
}

/**
 * Builds in-app preview cards for upcoming deadlines and active/scheduled focus sessions.
 */
export function buildReminderPreviews(
  tasks: Task[],
  preferences: UserPreferences,
  activeSession: FocusSession | null,
  nowMs = Date.now(),
): ScheduledReminderPreview[] {
  const reminders: ScheduledReminderPreview[] = [];

  if (!preferences.notificationsEnabled) {
    return reminders;
  }

  if (activeSession && (activeSession.status === 'active' || activeSession.status === 'paused')) {
    reminders.push({
      id: `rem_session_${activeSession.id}`,
      kind: 'session',
      title:
        activeSession.status === 'paused'
          ? 'Paused focus session waiting'
          : 'Focus session in progress',
      body: `Stay on track with "${activeSession.taskTitleSnapshot}".`,
      scheduledLabel: activeSession.status === 'paused' ? 'Ready to resume' : 'Active now',
    });
  } else {
    reminders.push({
      id: 'rem_next_session',
      kind: 'session',
      title: 'Pre-session reminder',
      body: `ProcrastiStop will nudge you ${preferences.remindBeforeSessionMinutes} min before a scheduled focus block.`,
      scheduledLabel: `${preferences.remindBeforeSessionMinutes}m lead time`,
    });
  }

  for (const task of tasks) {
    if (task.status === 'completed' || task.status === 'cancelled') continue;
    const deadlineState = getTaskDeadlineState(task, nowMs);
    if (deadlineState === 'overdue') {
      reminders.push({
        id: `rem_overdue_${task.id}`,
        kind: 'overdue',
        title: 'Task overdue',
        body: `"${task.title}" passed its deadline (${formatDeadlineLabel(task.deadline, nowMs)}).`,
        scheduledLabel: 'Needs attention',
        taskId: task.id,
      });
    } else if (deadlineState === 'due_soon') {
      reminders.push({
        id: `rem_due_${task.id}`,
        kind: 'deadline',
        title: 'Deadline approaching',
        body: `"${task.title}" is due ${formatDeadlineLabel(task.deadline, nowMs)}.`,
        scheduledLabel: 'Due within 24h',
        taskId: task.id,
      });
    }
  }

  return reminders;
}
