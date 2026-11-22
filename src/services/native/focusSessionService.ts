import { NativeModules, Platform } from 'react-native';

export interface SwipeKillEventPayload {
  sessionId: string;
  taskId: string;
  taskTitle: string;
  terminatedAtMs: number;
  rescheduledAtMs: number;
  pastDue?: boolean;
}

interface FocusSessionServiceNativeModule {
  startTracking: (
    sessionId: string,
    taskId: string,
    taskTitle: string,
    endTimestampMs: number,
    plannedSeconds: number,
    deadlineMs: number,
  ) => Promise<boolean>;
  pauseTracking: (remainingSeconds: number) => Promise<boolean>;
  stopTracking: () => Promise<boolean>;
  consumePendingSwipeKillEvent: () => Promise<SwipeKillEventPayload | null>;
}

const nativeService = NativeModules.FocusSessionService as
  | FocusSessionServiceNativeModule
  | undefined;

export async function startLiveCountdownService(params: {
  sessionId: string;
  taskId: string | null;
  taskTitle: string;
  endTimestampMs: number;
  plannedSeconds: number;
  deadlineMs?: number | null;
}): Promise<void> {
  if (Platform.OS !== 'android' || !nativeService?.startTracking) return;
  try {
    await nativeService.startTracking(
      params.sessionId,
      params.taskId ?? '',
      params.taskTitle,
      params.endTimestampMs,
      Math.max(60, Math.round(params.plannedSeconds)),
      params.deadlineMs && Number.isFinite(params.deadlineMs) ? params.deadlineMs : 0,
    );
  } catch {
    // Non-fatal if OS restricts foreground service start
  }
}

export async function pauseLiveCountdownService(remainingSeconds: number): Promise<void> {
  if (Platform.OS !== 'android' || !nativeService?.pauseTracking) return;
  try {
    await nativeService.pauseTracking(Math.max(0, Math.round(remainingSeconds)));
  } catch {
    // Non-fatal
  }
}

export async function stopLiveCountdownService(): Promise<void> {
  if (Platform.OS !== 'android' || !nativeService?.stopTracking) return;
  try {
    await nativeService.stopTracking();
  } catch {
    // Non-fatal
  }
}

export async function consumePendingSwipeKillEvent(): Promise<SwipeKillEventPayload | null> {
  if (Platform.OS !== 'android' || !nativeService?.consumePendingSwipeKillEvent) return null;
  try {
    return await nativeService.consumePendingSwipeKillEvent();
  } catch {
    return null;
  }
}
