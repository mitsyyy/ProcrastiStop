import { parseHHmm } from '@/components/ui/TimeOfDayPicker';
import type { FocusSession } from '@/types/focus';
import type { Task, TaskPriority } from '@/types/task';

export const DEADLINE_BUFFER_HOURS = 24;
export const DEADLINE_BUFFER_MS = DEADLINE_BUFFER_HOURS * 60 * 60 * 1000;
export const SKIP_RESCHEDULE_DELAY_MINUTES = 60;
export const SKIP_RESCHEDULE_DELAY_MS = SKIP_RESCHEDULE_DELAY_MINUTES * 60 * 1000;
export const MIN_DAILY_REMINDERS = 3;
export const MAX_DAILY_REMINDERS = 8;
export const DEFAULT_DAILY_SESSION_TIME = '19:00';
export const DEFAULT_SESSION_DURATION_MINUTES = 45;

const PRIORITY_RANK: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function getLocalDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function normalizeDailyReminderCount(count?: number | null): number {
  if (typeof count !== 'number' || !Number.isFinite(count)) {
    return MIN_DAILY_REMINDERS;
  }
  return Math.min(MAX_DAILY_REMINDERS, Math.max(MIN_DAILY_REMINDERS, Math.round(count)));
}

/**
 * Returns true if the task has a valid deadline that has already been reached or passed.
 * Past-due tasks must never trigger alarms, auto-starts, or +1 hour retries.
 */
export function isTaskPastDue(task: Pick<Task, 'deadline'>, nowMs = Date.now()): boolean {
  if (!task.deadline) return false;
  const deadlineMs = new Date(task.deadline).getTime();
  if (Number.isNaN(deadlineMs)) return false;
  return nowMs >= deadlineMs;
}

export function isTaskClosedOrTerminal(task: Pick<Task, 'status'>): boolean {
  return (
    task.status === 'completed' ||
    task.status === 'cancelled' ||
    task.status === 'missed'
  );
}

/**
 * Resolves the session duration in minutes used for overlap detection, window expiration,
 * and auto-start scheduling.
 */
export function getTaskSessionDurationMinutes(
  task: Pick<Task, 'estimatedMinutes'>,
  fallbackDurationMinutes = DEFAULT_SESSION_DURATION_MINUTES,
): number {
  const est = task.estimatedMinutes;
  if (typeof est === 'number' && Number.isFinite(est) && est >= 1) {
    return Math.min(240, Math.round(est));
  }
  return Math.min(240, Math.max(1, Math.round(fallbackDurationMinutes || DEFAULT_SESSION_DURATION_MINUTES)));
}

/**
 * Automatically schedules target completion at least 1 full day (24 hours)
 * ahead of the actual deadline so users never cram at the last minute.
 */
export function computeTargetCompletionIso(deadlineIso: string | null): string | null {
  if (!deadlineIso) return null;
  const deadlineMs = new Date(deadlineIso).getTime();
  if (Number.isNaN(deadlineMs)) return null;
  return new Date(deadlineMs - DEADLINE_BUFFER_MS).toISOString();
}

export function hasSufficientDeadlineBuffer(
  deadlineIso: string | null,
  nowMs = Date.now(),
): boolean {
  if (!deadlineIso) return false;
  const deadlineMs = new Date(deadlineIso).getTime();
  if (Number.isNaN(deadlineMs)) return false;
  return deadlineMs - nowMs >= DEADLINE_BUFFER_MS;
}

export function getDeadlineBufferHoursRemaining(
  deadlineIso: string | null,
  nowMs = Date.now(),
): number | null {
  if (!deadlineIso) return null;
  const deadlineMs = new Date(deadlineIso).getTime();
  if (Number.isNaN(deadlineMs)) return null;
  return (deadlineMs - nowMs) / (60 * 60 * 1000);
}

/**
 * Shifts a tight deadline forward so it keeps at least a full 24-hour anti-procrastination buffer.
 */
export function buildBufferedDeadlineIso(
  currentDeadlineIso: string | null,
  nowMs = Date.now(),
): string {
  const minSafeMs = nowMs + DEADLINE_BUFFER_MS + 60 * 60 * 1000;
  if (!currentDeadlineIso) {
    const fallback = new Date(nowMs + 2 * DEADLINE_BUFFER_MS);
    fallback.setHours(19, 0, 0, 0);
    return fallback.toISOString();
  }
  const existingMs = new Date(currentDeadlineIso).getTime();
  if (Number.isNaN(existingMs) || existingMs < nowMs) {
    return new Date(minSafeMs).toISOString();
  }
  return new Date(Math.max(existingMs + DEADLINE_BUFFER_MS, minSafeMs)).toISOString();
}

export function getSessionDateForDay(baseDay: Date, hhmm: string): Date {
  const { hour24, minute } = parseHHmm(hhmm);
  const next = new Date(baseDay);
  next.setHours(hour24, minute, 0, 0);
  return next;
}

/**
 * Computes the next upcoming session Date from an "HH:mm" time string relative to `now`.
 */
export function computeUpcomingSessionDateFromTime(
  hhmm: string,
  now = new Date(),
): Date {
  const todaySession = getSessionDateForDay(now, hhmm);
  if (todaySession.getTime() > now.getTime()) {
    return todaySession;
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getSessionDateForDay(tomorrow, hhmm);
}

export function formatMinutesOfDayLabel(totalMinutes: number): string {
  const wrapped = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h24 = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/**
 * Returns the next upcoming focus session Date for an open task, honoring any active
 * explicit 1-hour skip reschedule timestamp before falling back to the daily start time.
 * Enforces Past Due Date Cutoff: once `now >= task.deadline`, returns null permanently.
 */
export function computeNextDailySessionDate(
  task: Task,
  fallbackHHmm = DEFAULT_DAILY_SESSION_TIME,
  now = new Date(),
): Date | null {
  const nowMs = now.getTime();
  if (isTaskClosedOrTerminal(task) || isTaskPastDue(task, nowMs)) {
    return null;
  }

  const deadlineMs = task.deadline ? new Date(task.deadline).getTime() : null;
  const hasValidDeadline = deadlineMs !== null && !Number.isNaN(deadlineMs);

  // Skip Exception Rule: explicit skip shifts T_start forward by +1 hour (strictly before dueDate)
  if (task.rescheduledStartAt) {
    const rescheduledMs = new Date(task.rescheduledStartAt).getTime();
    if (!Number.isNaN(rescheduledMs) && rescheduledMs > nowMs) {
      if (!hasValidDeadline || rescheduledMs < deadlineMs) {
        return new Date(rescheduledMs);
      }
      return null;
    }
  }

  const hhmm = task.dailySessionStartTime || fallbackHHmm;
  const todaySession = getSessionDateForDay(now, hhmm);
  if (todaySession.getTime() > nowMs) {
    if (!hasValidDeadline || todaySession.getTime() < deadlineMs) {
      return todaySession;
    }
    return null;
  }

  // Hard cutoff for today's passed session: move to tomorrow only if strictly before dueDate
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowSession = getSessionDateForDay(tomorrow, hhmm);
  if (hasValidDeadline && tomorrowSession.getTime() >= deadlineMs) {
    return null;
  }
  return tomorrowSession;
}

/**
 * Dynamic Proportional Pre-Session Reminder Math:
 *   DeltaT = T_start - T_now
 *   Step   = DeltaT / (N + 1)
 *   R_k    = T_now + (k * Step), for k = 1, 2, ..., N
 *
 * Strictly enforces hard cutoff R_k < T_start so zero pre-session reminders can fire
 * at or after the scheduled session start time.
 */
export function computeDailyNudgeDates(
  sessionDate: Date,
  reminderCount?: number,
  referenceNow = new Date(),
): Date[] {
  const count = normalizeDailyReminderCount(reminderCount);
  const nowMs = referenceNow.getTime();
  const startMs = sessionDate.getTime();
  const deltaMs = startMs - nowMs;

  if (deltaMs <= 60_000) {
    return [];
  }

  const stepMs = deltaMs / (count + 1);
  const nudges: Date[] = [];

  for (let k = 1; k <= count; k++) {
    const timestampMs = Math.floor(nowMs + k * stepMs);
    if (timestampMs > nowMs && timestampMs < startMs) {
      nudges.push(new Date(timestampMs));
    }
  }

  return nudges;
}

/**
 * Computes the exact pre-session alert timestamp (scheduledSessionTime minus leadMinutes).
 */
export function computePreSessionAlertDate(sessionDate: Date, leadMinutes: number): Date {
  const safeLead = Math.max(1, Math.round(leadMinutes));
  return new Date(sessionDate.getTime() - safeLead * 60 * 1000);
}

export function formatTimeShort(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export interface MissedTaskTransition {
  taskId: string;
  reason: 'past_due' | 'window_passed_unstarted';
  todayKey: string;
}

/**
 * Identifies tasks that must immediately transition to "Missed" with ZERO +1h reschedule:
 * 1) Past Due Date Cutoff: currentTime >= task.deadline
 * 2) Unstarted Session Window Passed (e.g., app uninstalled/reinstalled or closed past window)
 */
export function findTasksToMarkMissed(
  tasks: Task[],
  activeSession: FocusSession | null,
  fallbackHHmm = DEFAULT_DAILY_SESSION_TIME,
  fallbackDurationMinutes = DEFAULT_SESSION_DURATION_MINUTES,
  now = new Date(),
): MissedTaskTransition[] {
  const nowMs = now.getTime();
  const todayKey = getLocalDateKey(now);
  const activeTaskId =
    activeSession &&
    (activeSession.status === 'active' ||
      activeSession.status === 'paused' ||
      activeSession.status === 'checkpoint')
      ? activeSession.taskId
      : null;

  const transitions: MissedTaskTransition[] = [];

  for (const task of tasks) {
    if (isTaskClosedOrTerminal(task)) continue;
    if (task.id === activeTaskId) continue;

    // 1. Past Due Date Cutoff: once currentTime >= dueDate, permanently mark Missed
    if (isTaskPastDue(task, nowMs)) {
      transitions.push({ taskId: task.id, reason: 'past_due', todayKey });
      continue;
    }

    const durationMs = getTaskSessionDurationMinutes(task, fallbackDurationMinutes) * 60_000;

    // 2. Unstarted +1h rescheduled slot whose window already ended -> Missed (no further +1h!)
    if (task.rescheduledStartAt) {
      const reschedMs = new Date(task.rescheduledStartAt).getTime();
      if (!Number.isNaN(reschedMs) && nowMs >= reschedMs + durationMs) {
        transitions.push({ taskId: task.id, reason: 'window_passed_unstarted', todayKey });
        continue;
      }
    }

    // 3. Unstarted daily scheduled session whose full window passed today -> Missed (no auto-start, no +1h!)
    if (task.autoStartEnabled !== false && task.lastAutoStartedDate !== todayKey) {
      const hhmm = task.dailySessionStartTime || fallbackHHmm;
      const todaySessionMs = getSessionDateForDay(now, hhmm).getTime();
      const createdMs = new Date(task.createdAt).getTime();
      const existedBeforeSession = Number.isNaN(createdMs) || createdMs < todaySessionMs;
      if (existedBeforeSession && nowMs >= todaySessionMs + durationMs) {
        transitions.push({ taskId: task.id, reason: 'window_passed_unstarted', todayKey });
      }
    }
  }

  return transitions;
}

/**
 * Determines whether any open task is CURRENTLY INSIDE its active scheduled session window
 * without being started or completed today.
 * Strictly ignores past-due tasks, Missed tasks, and already-elapsed windows (never auto-starts
 * old missed sessions on reopen).
 */
export function findTaskDueForAutoStart(
  tasks: Task[],
  activeSession: FocusSession | null,
  fallbackHHmm = DEFAULT_DAILY_SESSION_TIME,
  now = new Date(),
  fallbackDurationMinutes = DEFAULT_SESSION_DURATION_MINUTES,
): Task | null {
  if (
    activeSession &&
    (activeSession.status === 'active' ||
      activeSession.status === 'paused' ||
      activeSession.status === 'checkpoint')
  ) {
    return null;
  }

  const todayKey = getLocalDateKey(now);
  const nowMs = now.getTime();

  const candidates = tasks.filter((task) => {
    if (isTaskClosedOrTerminal(task)) return false;
    if (isTaskPastDue(task, nowMs)) return false;
    if (task.autoStartEnabled === false) return false;

    const durationMs = getTaskSessionDurationMinutes(task, fallbackDurationMinutes) * 60_000;

    // Prioritize an explicit 1-hour rescheduled alarm ONLY while inside its active window
    if (task.rescheduledStartAt) {
      const rescheduledMs = new Date(task.rescheduledStartAt).getTime();
      if (!Number.isNaN(rescheduledMs)) {
        return nowMs >= rescheduledMs && nowMs < rescheduledMs + durationMs;
      }
    }

    if (task.lastAutoStartedDate === todayKey) return false;

    const hhmm = task.dailySessionStartTime || fallbackHHmm;
    const todaySession = getSessionDateForDay(now, hhmm);
    const sessionMs = todaySession.getTime();

    // Only auto-start while inside today's active session window [sessionMs, sessionMs + durationMs)
    if (nowMs < sessionMs || nowMs >= sessionMs + durationMs) return false;

    // Do not immediately ambush-launch a task created after today's scheduled time already started
    const createdMs = new Date(task.createdAt).getTime();
    if (!Number.isNaN(createdMs) && createdMs > sessionMs) return false;

    return true;
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
    const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
    if (aDeadline !== bDeadline) return aDeadline - bDeadline;
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  });

  return candidates[0];
}
