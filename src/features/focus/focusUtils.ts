import type { SessionStatus } from '@/types/focus';

export const ALLOWED_SESSION_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  planned: ['active', 'missed', 'cancelled'],
  active: ['paused', 'checkpoint', 'completed', 'skipped', 'missed', 'cancelled'],
  paused: ['active', 'checkpoint', 'completed', 'skipped', 'missed', 'cancelled'],
  checkpoint: ['active', 'paused', 'completed', 'skipped', 'missed', 'cancelled'],
  completed: [],
  skipped: [],
  missed: [],
  cancelled: [],
};

export function canTransitionSession(from: SessionStatus, to: SessionStatus): boolean {
  return ALLOWED_SESSION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getSessionProgressRatio(
  plannedDurationMinutes: number,
  remainingSeconds: number,
): number {
  const totalSeconds = Math.max(1, plannedDurationMinutes * 60);
  const elapsed = Math.max(0, totalSeconds - remainingSeconds);
  return Math.min(1, Math.max(0, elapsed / totalSeconds));
}

export function getSessionRemainingRatio(
  plannedDurationMinutes: number,
  remainingSeconds: number,
): number {
  const totalSeconds = Math.max(1, plannedDurationMinutes * 60);
  return Math.min(1, Math.max(0, remainingSeconds / totalSeconds));
}
