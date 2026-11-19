import type { FocusSession } from '@/types/focus';
import type { ScheduledReminderPreview, UserPreferences } from '@/types/settings';
import type { Task } from '@/types/task';
import { formatDeadlineLabel, getTaskDeadlineState } from '@/utils/date';

/**
 * Stage 1 Simulated Local Notification & Reminder Scheduler.
 * Stage 2 can wire `expo-notifications` + FCM using the same preview inputs.
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
