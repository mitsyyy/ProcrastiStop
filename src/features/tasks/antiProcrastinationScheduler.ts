import { parseHHmm } from '@/components/ui/TimeOfDayPicker';
import type { FocusSession } from '@/types/focus';
import type { Task, TaskPriority } from '@/types/task';

export const DEADLINE_BUFFER_HOURS = 24;
export const DEADLINE_BUFFER_MS = DEADLINE_BUFFER_HOURS * 60 * 60 * 1000;
export const MIN_DAILY_REMINDERS = 3;
export const MAX_DAILY_REMINDERS = 8;
export const DEFAULT_DAILY_SESSION_TIME = '19:00';
export const NUDGE_INTERVAL_HOURS = 3;

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
 * Returns the next upcoming daily focus session Date for an open task.
 */
export function computeNextDailySessionDate(
  task: Task,
  fallbackHHmm = DEFAULT_DAILY_SESSION_TIME,
  now = new Date(),
): Date | null {
  if (task.status === 'completed' || task.status === 'cancelled') {
    return null;
  }
  const hhmm = task.dailySessionStartTime || fallbackHHmm;
  const todaySession = getSessionDateForDay(now, hhmm);
  if (todaySession.getTime() > now.getTime()) {
    return todaySession;
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getSessionDateForDay(tomorrow, hhmm);
}

/**
 * Computes free-will reminder timestamps spaced out before the scheduled daily session start time.
 * Enforces a minimum of 3 reminders/day, defaulting to 3-hour intervals (e.g. 10 AM, 1 PM, 4 PM for 7 PM).
 * If the session starts early in the morning, intervals smoothly tighten so nudges stay on the same day.
 */
export function computeDailyNudgeDates(sessionDate: Date, reminderCount?: number): Date[] {
  const count = normalizeDailyReminderCount(reminderCount);
  const startOfDay = new Date(sessionDate);
  startOfDay.setHours(6, 0, 0, 0);

  const idealSpanMs = count * NUDGE_INTERVAL_HOURS * 60 * 60 * 1000;
  const earliestIdealMs = sessionDate.getTime() - idealSpanMs;

  let intervalMs = NUDGE_INTERVAL_HOURS * 60 * 60 * 1000;
  if (earliestIdealMs < startOfDay.getTime()) {
    const availableMs = sessionDate.getTime() - startOfDay.getTime();
    if (availableMs >= count * 30 * 60 * 1000) {
      intervalMs = Math.floor(availableMs / count);
    } else {
      intervalMs = 30 * 60 * 1000;
    }
  }

  const nudges: Date[] = [];
  for (let i = count; i >= 1; i--) {
    nudges.push(new Date(sessionDate.getTime() - i * intervalMs));
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

/**
 * Determines whether any open task has reached its scheduled daily focus session start time
 * without being started or completed today, triggering automatic focus session escalation.
 */
export function findTaskDueForAutoStart(
  tasks: Task[],
  activeSession: FocusSession | null,
  fallbackHHmm = DEFAULT_DAILY_SESSION_TIME,
  now = new Date(),
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
    if (task.status === 'completed' || task.status === 'cancelled') return false;
    if (task.autoStartEnabled === false) return false;
    if (task.lastAutoStartedDate === todayKey) return false;

    const hhmm = task.dailySessionStartTime || fallbackHHmm;
    const todaySession = getSessionDateForDay(now, hhmm);
    const sessionMs = todaySession.getTime();

    // Only auto-start once today's scheduled session time has arrived
    if (nowMs < sessionMs) return false;

    // Do not immediately ambush-launch a task created after today's scheduled time already passed
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
