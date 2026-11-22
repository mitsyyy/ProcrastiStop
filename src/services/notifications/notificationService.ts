import {
  AndroidAudioContentType,
  AndroidAudioUsage,
  AndroidImportance,
  AndroidNotificationPriority,
  AndroidNotificationVisibility,
  cancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  SchedulableTriggerInputTypes,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import {
  computeDailyNudgeDates,
  computeNextDailySessionDate,
  computePreSessionAlertDate,
  DEFAULT_DAILY_SESSION_TIME,
  formatTimeShort,
  isTaskClosedOrTerminal,
  isTaskPastDue,
  normalizeDailyReminderCount,
} from '@/features/tasks/antiProcrastinationScheduler';
import { readJsonItem, STORAGE_KEYS, writeJsonItem } from '@/services/local/storage';
import type { FocusSession } from '@/types/focus';
import type { ScheduledReminderPreview, UserPreferences } from '@/types/settings';
import type { Task } from '@/types/task';
import { formatDeadlineLabel, getTaskDeadlineState } from '@/utils/date';

export const PROCRASTISTOP_NOTIFICATION_CHANNEL_ID = 'procrastistop-reminders';
export const PROCRASTISTOP_ALARM_CHANNEL_ID = 'procrastistop-alarms';

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

export interface NotificationSyncSummary {
  scheduledCount: number;
  preSessionCount: number;
  nudgeCount: number;
  autoStartCount: number;
  nextPreSessionAt: string | null;
  nextSessionAt: string | null;
  nextTaskTitle: string | null;
  permissionStatus: NotificationPermissionState['status'];
}

export interface NotificationSyncOptions {
  requestPermissionIfUndetermined?: boolean;
}

let handlerConfigured = false;
let syncInFlight: Promise<NotificationSyncSummary> | null = null;

export function configureNotificationHandler(): void {
  if (Platform.OS === 'web' || handlerConfigured) return;
  handlerConfigured = true;
  setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: AndroidNotificationPriority.MAX,
    }),
  });
}

export async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await setNotificationChannelAsync(PROCRASTISTOP_NOTIFICATION_CHANNEL_ID, {
    name: 'Focus & Pre-Session Reminders',
    description:
      'High-priority 5-minute pre-session warnings, daily free-will nudges, and focus alerts.',
    importance: AndroidImportance.MAX,
    sound: 'default',
    enableVibrate: true,
    enableLights: true,
    bypassDnd: true,
    lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    vibrationPattern: [0, 250, 180, 250],
    lightColor: '#ff7a1a',
  });

  await setNotificationChannelAsync(PROCRASTISTOP_ALARM_CHANNEL_ID, {
    name: 'Focus Auto-Start Alarms',
    description:
      'Full-screen wake-up alarms that automatically open ProcrastiStop into your active focus timer.',
    importance: AndroidImportance.MAX,
    sound: 'default',
    enableVibrate: true,
    enableLights: true,
    bypassDnd: true,
    lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    vibrationPattern: [0, 450, 220, 450, 220, 450],
    lightColor: '#ff7a1a',
    audioAttributes: {
      usage: AndroidAudioUsage.ALARM,
      contentType: AndroidAudioContentType.SONIFICATION,
    },
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

export async function getScheduledNotificationsCount(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  try {
    const all = await getAllScheduledNotificationsAsync();
    return all.length;
  } catch {
    return 0;
  }
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

  configureNotificationHandler();
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

  await ensureAndroidNotificationChannel();
  const id = await scheduleNotificationAsync({
    content: {
      title: 'ProcrastiStop reminder active',
      body: 'Local high-priority notifications are working on your device.',
      sound: 'default',
      priority: AndroidNotificationPriority.MAX,
      interruptionLevel: 'timeSensitive',
      data: { route: '/(tabs)/focus' },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + Math.max(2, Math.round(delaySeconds)) * 1000),
      channelId: Platform.OS === 'android' ? PROCRASTISTOP_NOTIFICATION_CHANNEL_ID : undefined,
      delivery: Platform.OS === 'android' ? 'alarmClock' : undefined,
    },
  });

  return {
    scheduled: true,
    id,
    permissionStatus: 'granted',
    canAskAgain: true,
  };
}

export async function sendTestPreSessionWarning(
  taskTitle: string,
  leadMinutes = 5,
  delaySeconds = 5,
): Promise<LocalNotificationResult> {
  if (Platform.OS === 'web') {
    return {
      scheduled: false,
      permissionStatus: 'unavailable',
      canAskAgain: false,
      reason: 'System notifications require an Android or iOS device.',
    };
  }

  configureNotificationHandler();
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

  await ensureAndroidNotificationChannel();
  const id = await scheduleNotificationAsync({
    content: {
      title: `Focus starts in ${leadMinutes} min`,
      body: `"${taskTitle}" begins in ${leadMinutes} minutes. Clear distractions and get ready.`,
      sound: 'default',
      priority: AndroidNotificationPriority.MAX,
      interruptionLevel: 'timeSensitive',
      data: { route: '/focus/setup', kind: 'pre_session' },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + Math.max(2, Math.round(delaySeconds)) * 1000),
      channelId: Platform.OS === 'android' ? PROCRASTISTOP_NOTIFICATION_CHANNEL_ID : undefined,
      delivery: Platform.OS === 'android' ? 'alarmClock' : undefined,
    },
  });

  return {
    scheduled: true,
    id,
    permissionStatus: 'granted',
    canAskAgain: true,
  };
}

export async function sendTestFullScreenFocusAlarm(
  taskId: string | null,
  taskTitle: string,
  delaySeconds = 5,
): Promise<LocalNotificationResult> {
  if (Platform.OS === 'web') {
    return {
      scheduled: false,
      permissionStatus: 'unavailable',
      canAskAgain: false,
      reason: 'Full-screen focus alarms require an Android or iOS device.',
    };
  }

  configureNotificationHandler();
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

  await ensureAndroidNotificationChannel();
  const id = await scheduleNotificationAsync({
    content: {
      title: `Focus alarm: ${taskTitle}`,
      body: 'Scan your required workspace item to silence the alarm and start your focus timer.',
      sound: 'default',
      priority: AndroidNotificationPriority.MAX,
      interruptionLevel: 'timeSensitive',
      data: {
        kind: 'auto_start',
        fullScreenAlarm: true,
        taskId: taskId ?? '',
        route: `/focus/checkpoint?mode=gate&alarm=1${taskId ? `&taskId=${taskId}` : ''}`,
      },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + Math.max(3, Math.round(delaySeconds)) * 1000),
      channelId: Platform.OS === 'android' ? PROCRASTISTOP_ALARM_CHANNEL_ID : undefined,
      delivery: Platform.OS === 'android' ? 'alarmClock' : undefined,
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

  configureNotificationHandler();
  const perm = await requestNotificationPermission();
  if (perm.status !== 'granted') {
    return {
      scheduled: false,
      permissionStatus: perm.status,
      canAskAgain: perm.canAskAgain,
      reason: 'Notification permission is required to schedule reminders.',
    };
  }

  await ensureAndroidNotificationChannel();
  const id = await scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      sound: 'default',
      priority: AndroidNotificationPriority.MAX,
      interruptionLevel: 'timeSensitive',
      data: params.route ? { route: params.route } : {},
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + Math.max(2, Math.round(params.delaySeconds ?? 5)) * 1000),
      channelId: Platform.OS === 'android' ? PROCRASTISTOP_NOTIFICATION_CHANNEL_ID : undefined,
      delivery: Platform.OS === 'android' ? 'alarmClock' : undefined,
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

  configureNotificationHandler();
  const perm = await getNotificationPermissionState();
  if (perm.status !== 'granted') return null;

  await ensureAndroidNotificationChannel();
  return scheduleNotificationAsync({
    content: {
      title: 'Focus session complete',
      body: `Great work protecting time for "${taskTitle}". Tap to review your summary.`,
      sound: 'default',
      priority: AndroidNotificationPriority.MAX,
      interruptionLevel: 'timeSensitive',
      data: { route: '/focus/completed' },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: new Date(endTimestampMs),
      channelId: Platform.OS === 'android' ? PROCRASTISTOP_NOTIFICATION_CHANNEL_ID : undefined,
      delivery: Platform.OS === 'android' ? 'alarmClock' : undefined,
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

async function clearManagedScheduledNotifications(): Promise<void> {
  const previousIds =
    (await readJsonItem<string[]>(STORAGE_KEYS.SCHEDULED_NOTIFICATION_IDS)) ?? [];
  if (previousIds.length > 0 && Platform.OS !== 'web') {
    await Promise.all(previousIds.map((id) => cancelScheduledNotification(id)));
  }
  await writeJsonItem(STORAGE_KEYS.SCHEDULED_NOTIFICATION_IDS, []);
}

function getPrioritizedOpenTasks(tasks: Task[], nowMs = Date.now()): Task[] {
  return tasks
    .filter((t) => !isTaskClosedOrTerminal(t) && !isTaskPastDue(t, nowMs))
    .sort((a, b) => {
      // Prioritize tasks explicitly rescheduled (+1h after skip) first
      const aResched = a.rescheduledStartAt ? new Date(a.rescheduledStartAt).getTime() : null;
      const bResched = b.rescheduledStartAt ? new Date(b.rescheduledStartAt).getTime() : null;
      if (aResched && !bResched) return -1;
      if (!aResched && bResched) return 1;
      if (aResched && bResched && aResched !== bResched) return aResched - bResched;

      const aTime = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
}

function formatTriggerDayAndTime(date: Date, now: Date): string {
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate();

  const timeStr = formatTimeShort(date);
  if (isToday) return `Today at ${timeStr}`;
  if (isTomorrow) return `Tomorrow at ${timeStr}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
}

/**
 * Synchronizes exact OS-level alarms & notifications for all active tasks so they fire
 * reliably even when the app is backgrounded, Doze-idle, or killed:
 * 1) Exact 5-min pre-session warning via AlarmManager.setAlarmClock() / iOS DATE trigger
 * 2) Spaced daily free-will nudges (minimum 3/day) before each task's daily focus start
 * 3) Alarm-style full-screen auto-start wake-up trigger at exact scheduled session time
 */
export async function syncScheduledPreSessionAndNudgeNotifications(
  tasks: Task[],
  preferences: UserPreferences,
  activeSession?: FocusSession | null,
  options?: NotificationSyncOptions,
): Promise<NotificationSyncSummary> {
  const runSync = async (): Promise<NotificationSyncSummary> => {
    const now = new Date();
    const nowMs = now.getTime();
    const leadMinutes = Math.max(1, preferences.remindBeforeSessionMinutes || 5);
    const fallbackStart = preferences.defaultDailySessionStartTime || DEFAULT_DAILY_SESSION_TIME;
    const activeTaskId =
      activeSession && (activeSession.status === 'active' || activeSession.status === 'paused')
        ? activeSession.taskId
        : null;

    const openTasks = getPrioritizedOpenTasks(tasks).slice(0, 6);

    let earliestPreSession: { date: Date; sessionDate: Date; title: string } | null = null;
    const plannedAlerts: {
      kind: 'pre_session' | 'nudge' | 'auto_start';
      triggerDate: Date;
      title: string;
      body: string;
      channelId: string;
      useAlarmClock: boolean;
      data: Record<string, string | boolean>;
    }[] = [];

    for (const task of openTasks) {
      const nextSession = computeNextDailySessionDate(task, fallbackStart, now);
      if (!nextSession) continue;

      const isRescheduledSkip =
        Boolean(task.rescheduledStartAt) &&
        new Date(task.rescheduledStartAt!).getTime() > nowMs;

      const preSessionDate = computePreSessionAlertDate(nextSession, leadMinutes);
      const preSessionIsValid =
        preSessionDate.getTime() > nowMs + 2000 && preSessionDate.getTime() < nextSession.getTime();

      if (preSessionIsValid) {
        if (
          !earliestPreSession ||
          preSessionDate.getTime() < earliestPreSession.date.getTime()
        ) {
          earliestPreSession = {
            date: preSessionDate,
            sessionDate: nextSession,
            title: task.title,
          };
        }

        // 1. Exact 5-minute (or configured lead time) pre-session warning (strictly R < T_start)
        plannedAlerts.push({
          kind: 'pre_session',
          triggerDate: preSessionDate,
          title: isRescheduledSkip
            ? `Rescheduled focus in ${leadMinutes} min`
            : `Focus block in ${leadMinutes} min`,
          body: `"${task.title}" starts at ${formatTimeShort(nextSession)}. Wrap up distractions now.`,
          channelId: PROCRASTISTOP_NOTIFICATION_CHANNEL_ID,
          useAlarmClock: true,
          data: {
            kind: 'pre_session',
            taskId: task.id,
            route: `/focus/setup?taskId=${task.id}`,
          },
        });
      }

      // 2. Dynamic proportional pre-session reminders: Step = (T_start - T_now) / (N + 1), R_k < T_start
      const reminderCount = normalizeDailyReminderCount(
        task.dailyReminderCount ?? preferences.defaultDailyReminderCount,
      );
      const nudges = computeDailyNudgeDates(nextSession, reminderCount, now);
      for (let idx = 0; idx < nudges.length; idx++) {
        const nudgeDate = nudges[idx];
        if (nudgeDate.getTime() > nowMs + 2000 && nudgeDate.getTime() < nextSession.getTime()) {
          plannedAlerts.push({
            kind: 'nudge',
            triggerDate: nudgeDate,
            title: isRescheduledSkip
              ? `Rescheduled nudge ${idx + 1}/${reminderCount}`
              : `Nudge ${idx + 1}/${reminderCount}: Start early?`,
            body: `Get a head start on "${task.title}" before your ${formatTimeShort(nextSession)} focus session.`,
            channelId: PROCRASTISTOP_NOTIFICATION_CHANNEL_ID,
            useAlarmClock: false,
            data: {
              kind: 'nudge',
              taskId: task.id,
              route: `/focus/setup?taskId=${task.id}`,
            },
          });
        }
      }

      // 3. Alarm-style full-screen auto-start wake-up trigger at exact scheduled session time
      if (
        task.autoStartEnabled !== false &&
        task.id !== activeTaskId &&
        nextSession.getTime() > nowMs + 2000
      ) {
        plannedAlerts.push({
          kind: 'auto_start',
          triggerDate: nextSession,
          title: `Time to focus: ${task.title}`,
          body: `Your ${formatTimeShort(nextSession)} alarm is ringing — scan your desk item to unlock and start.`,
          channelId: PROCRASTISTOP_ALARM_CHANNEL_ID,
          useAlarmClock: true,
          data: {
            kind: 'auto_start',
            fullScreenAlarm: true,
            taskId: task.id,
            route: `/focus/checkpoint?mode=gate&alarm=1&taskId=${task.id}`,
          },
        });
      }
    }

    let perm = await getNotificationPermissionState();
    if (
      options?.requestPermissionIfUndetermined &&
      preferences.notificationsEnabled &&
      Platform.OS !== 'web' &&
      perm.status === 'undetermined'
    ) {
      perm = await requestNotificationPermission();
    }

    await clearManagedScheduledNotifications();

    if (!preferences.notificationsEnabled || Platform.OS === 'web' || perm.status !== 'granted') {
      return {
        scheduledCount: 0,
        preSessionCount: 0,
        nudgeCount: 0,
        autoStartCount: 0,
        nextPreSessionAt: earliestPreSession?.date.toISOString() ?? null,
        nextSessionAt: earliestPreSession?.sessionDate.toISOString() ?? null,
        nextTaskTitle: earliestPreSession?.title ?? null,
        permissionStatus: perm.status,
      };
    }

    configureNotificationHandler();
    await ensureAndroidNotificationChannel();

    // Sort chronologically and cap at 36 managed triggers for OS reliability
    plannedAlerts.sort((a, b) => a.triggerDate.getTime() - b.triggerDate.getTime());
    const bounded = plannedAlerts.slice(0, 36);

    const scheduledIds: string[] = [];
    let preSessionCount = 0;
    let nudgeCount = 0;
    let autoStartCount = 0;

    for (const alert of bounded) {
      try {
        const id = await scheduleNotificationAsync({
          content: {
            title: alert.title,
            body: alert.body,
            sound: 'default',
            priority: AndroidNotificationPriority.MAX,
            interruptionLevel: 'timeSensitive',
            data: alert.data,
          },
          trigger: {
            type: SchedulableTriggerInputTypes.DATE,
            date: alert.triggerDate,
            channelId: Platform.OS === 'android' ? alert.channelId : undefined,
            delivery:
              Platform.OS === 'android'
                ? alert.useAlarmClock
                  ? 'alarmClock'
                  : 'bestEffort'
                : undefined,
          },
        });
        scheduledIds.push(id);
        if (alert.kind === 'pre_session') preSessionCount += 1;
        else if (alert.kind === 'nudge') nudgeCount += 1;
        else autoStartCount += 1;
      } catch {
        // Ignore single past-edge trigger failure if clock ticked during loop
      }
    }

    await writeJsonItem(STORAGE_KEYS.SCHEDULED_NOTIFICATION_IDS, scheduledIds);

    return {
      scheduledCount: scheduledIds.length,
      preSessionCount,
      nudgeCount,
      autoStartCount,
      nextPreSessionAt: earliestPreSession?.date.toISOString() ?? null,
      nextSessionAt: earliestPreSession?.sessionDate.toISOString() ?? null,
      nextTaskTitle: earliestPreSession?.title ?? null,
      permissionStatus: perm.status,
    };
  };

  // Serialize concurrent sync requests so previous IDs are never double-cancelled/raced
  const chained = syncInFlight ? syncInFlight.then(runSync, runSync) : runSync();
  syncInFlight = chained;
  return chained;
}

/**
 * Builds in-app preview cards reflecting actual computed 5-min pre-session warnings,
 * upcoming free-will nudges, and urgent task deadlines.
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

  const now = new Date(nowMs);
  const leadMinutes = Math.max(1, preferences.remindBeforeSessionMinutes || 5);
  const fallbackStart = preferences.defaultDailySessionStartTime || DEFAULT_DAILY_SESSION_TIME;
  const openTasks = getPrioritizedOpenTasks(tasks);

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
    let nextPre: { alertDate: Date; sessionDate: Date; task: Task } | null = null;
    let nextNudge: { nudgeDate: Date; task: Task; index: number; total: number } | null = null;

    for (const task of openTasks) {
      const nextSession = computeNextDailySessionDate(task, fallbackStart, now);
      if (!nextSession) continue;

      const rawPre = computePreSessionAlertDate(nextSession, leadMinutes);
      if (rawPre.getTime() > nowMs && rawPre.getTime() < nextSession.getTime()) {
        if (!nextPre || rawPre.getTime() < nextPre.alertDate.getTime()) {
          nextPre = { alertDate: rawPre, sessionDate: nextSession, task };
        }
      }

      const total = normalizeDailyReminderCount(
        task.dailyReminderCount ?? preferences.defaultDailyReminderCount,
      );
      const nudges = computeDailyNudgeDates(nextSession, total, now);
      for (let idx = 0; idx < nudges.length; idx++) {
        const d = nudges[idx];
        if (
          d.getTime() > nowMs &&
          d.getTime() < nextSession.getTime() &&
          (!nextNudge || d.getTime() < nextNudge.nudgeDate.getTime())
        ) {
          nextNudge = { nudgeDate: d, task, index: idx + 1, total };
        }
      }
    }

    if (nextPre) {
      reminders.push({
        id: `rem_pre_session_${nextPre.task.id}`,
        kind: 'session',
        title: `${leadMinutes}-min pre-session warning`,
        body: `"${nextPre.task.title}" starts at ${formatTimeShort(nextPre.sessionDate)}. Exact background alarm fires ${leadMinutes} min beforehand.`,
        scheduledLabel: formatTriggerDayAndTime(nextPre.alertDate, now),
        taskId: nextPre.task.id,
      });
    } else {
      reminders.push({
        id: 'rem_next_session',
        kind: 'session',
        title: 'Pre-session reminder',
        body: `ProcrastiStop alerts you ${leadMinutes} min before each scheduled focus block.`,
        scheduledLabel: `${leadMinutes}m lead time`,
      });
    }

    if (nextNudge) {
      reminders.push({
        id: `rem_nudge_${nextNudge.task.id}`,
        kind: 'nudge',
        title: `Free-will nudge (${nextNudge.index}/${nextNudge.total} today)`,
        body: `Early check-in for "${nextNudge.task.title}" so you can begin on your own terms.`,
        scheduledLabel: formatTriggerDayAndTime(nextNudge.nudgeDate, now),
        taskId: nextNudge.task.id,
      });
    }
  }

  for (const task of openTasks) {
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
