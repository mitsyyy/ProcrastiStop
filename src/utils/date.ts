import type { Task, TaskDeadlineState } from '@/types/task';

const ONE_HOUR_MS = 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * ONE_HOUR_MS;

export function getTaskDeadlineState(task: Task, nowMs = Date.now()): TaskDeadlineState {
  if (task.status === 'completed' || task.status === 'cancelled') {
    return 'completed';
  }
  if (!task.deadline) {
    return 'none';
  }
  const deadlineMs = new Date(task.deadline).getTime();
  if (Number.isNaN(deadlineMs)) {
    return 'none';
  }
  if (deadlineMs < nowMs) {
    return 'overdue';
  }
  if (deadlineMs - nowMs <= TWENTY_FOUR_HOURS_MS) {
    return 'due_soon';
  }
  return 'upcoming';
}

export function formatDeadlineLabel(deadlineIso: string | null, nowMs = Date.now()): string {
  if (!deadlineIso) return 'No deadline';
  const date = new Date(deadlineIso);
  if (Number.isNaN(date.getTime())) return 'Invalid date';

  const diffMs = date.getTime() - nowMs;
  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const today = new Date(nowMs);
  const tomorrow = new Date(nowMs + TWENTY_FOUR_HOURS_MS);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (diffMs < 0) {
    const overdueHours = Math.floor(Math.abs(diffMs) / ONE_HOUR_MS);
    if (overdueHours < 1) return `Overdue · ${timeStr}`;
    if (overdueHours < 24) return `Overdue by ${overdueHours}h`;
    const overdueDays = Math.floor(overdueHours / 24);
    return `Overdue by ${overdueDays}d`;
  }

  if (isSameDay(date, today)) {
    return `Today, ${timeStr}`;
  }
  if (isSameDay(date, tomorrow)) {
    return `Tomorrow, ${timeStr}`;
  }

  const datePart = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${datePart}, ${timeStr}`;
}

export function formatRemainingTimeUntil(deadlineIso: string | null, nowMs = Date.now()): string {
  if (!deadlineIso) return 'Flexible schedule';
  const deadlineMs = new Date(deadlineIso).getTime();
  if (Number.isNaN(deadlineMs)) return 'Flexible schedule';

  const diffMs = deadlineMs - nowMs;
  const absMins = Math.round(Math.abs(diffMs) / 60000);
  const hours = Math.floor(absMins / 60);
  const mins = absMins % 60;

  if (diffMs < 0) {
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h overdue`;
    }
    return hours > 0 ? `${hours}h ${mins}m overdue` : `${mins}m overdue`;
  }

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h remaining`;
  }
  return hours > 0 ? `${hours}h ${mins}m remaining` : `${mins}m remaining`;
}

export function formatFullDateTime(iso: string | null): string {
  if (!iso) return 'Not scheduled';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';
  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function formatTodayHeaderDate(nowMs = Date.now()): string {
  return new Date(nowMs).toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function getGreeting(nowMs = Date.now()): string {
  const hour = new Date(nowMs).getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatMinutesAsDuration(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hrs}h` : `${hrs}h ${rem}m`;
}
