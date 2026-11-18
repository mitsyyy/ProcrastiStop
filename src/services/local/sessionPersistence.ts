import type { FocusSession, PersistedActiveSession } from '@/types/focus';
import { readJsonItem, removeStorageItem, STORAGE_KEYS, writeJsonItem } from './storage';

/**
 * Authoritative timestamp calculations.
 * Never rely on interval tick counts for elapsed/remaining session duration.
 */
export function computeRemainingSeconds(
  endTimestampMs: number | null,
  fallbackRemainingSeconds: number,
  nowMs = Date.now(),
): number {
  if (endTimestampMs === null) {
    return Math.max(0, Math.floor(fallbackRemainingSeconds));
  }
  return Math.max(0, Math.ceil((endTimestampMs - nowMs) / 1000));
}

export function computeActualFocusSeconds(
  session: FocusSession,
  remainingSeconds: number,
): number {
  const totalPlannedSeconds = Math.max(0, session.plannedDurationMinutes * 60);
  return Math.max(0, Math.min(totalPlannedSeconds, totalPlannedSeconds - remainingSeconds));
}

export const sessionPersistence = {
  async save(state: PersistedActiveSession): Promise<void> {
    await writeJsonItem(STORAGE_KEYS.ACTIVE_SESSION, state);
  },

  async load(): Promise<PersistedActiveSession | null> {
    return readJsonItem<PersistedActiveSession>(STORAGE_KEYS.ACTIVE_SESSION);
  },

  async clear(): Promise<void> {
    await removeStorageItem(STORAGE_KEYS.ACTIVE_SESSION);
  },
};
