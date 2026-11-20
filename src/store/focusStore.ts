import { create } from 'zustand';

import { focusRepository } from '@/repositories/focusRepository';
import {
  computeActualFocusSeconds,
  computeRemainingSeconds,
  sessionPersistence,
} from '@/services/local/sessionPersistence';
import {
  cancelScheduledNotification,
  scheduleFocusCompletionNotification,
} from '@/services/notifications/notificationService';
import { useBlockerStore } from '@/store/blockerStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { CheckpointRecord, FocusSession } from '@/types/focus';

interface StartSessionParams {
  taskId: string | null;
  taskTitleSnapshot: string;
  plannedDurationMinutes: number;
  checkpointEnabled: boolean;
}

interface FocusState {
  sessions: FocusSession[];
  checkpoints: CheckpointRecord[];
  activeSession: FocusSession | null;
  endTimestampMs: number | null;
  remainingSeconds: number;
  checkpointTriggered: boolean;
  completionNotificationId: string | null;
  lastCompletedSession: FocusSession | null;
  loading: boolean;
  error: string | null;

  hydrateFocus: () => Promise<void>;
  startSession: (params: StartSessionParams) => Promise<FocusSession>;
  tickDisplay: () => Promise<'completed' | 'ticking' | 'idle'>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  enterCheckpoint: () => Promise<void>;
  recordCheckpointResult: (input: {
    detectedObjects: string[];
    verificationResult: 'passed' | 'failed';
    confidence: number;
  }) => Promise<CheckpointRecord | null>;
  exitCheckpointToActive: () => Promise<void>;
  recordInterruption: () => Promise<void>;
  completeSession: () => Promise<FocusSession | null>;
  cancelSession: () => Promise<FocusSession | null>;
  clearLastCompleted: () => void;
}

export const useFocusStore = create<FocusState>((set, get) => ({
  sessions: [],
  checkpoints: [],
  activeSession: null,
  endTimestampMs: null,
  remainingSeconds: 0,
  checkpointTriggered: false,
  completionNotificationId: null,
  lastCompletedSession: null,
  loading: false,
  error: null,

  hydrateFocus: async () => {
    set({ loading: true, error: null });
    try {
      const [sessions, checkpoints, persisted] = await Promise.all([
        focusRepository.getSessions(),
        focusRepository.getCheckpoints(),
        sessionPersistence.load(),
      ]);

      if (!persisted) {
        set({
          sessions,
          checkpoints,
          activeSession: null,
          endTimestampMs: null,
          remainingSeconds: 0,
          checkpointTriggered: false,
          completionNotificationId: null,
          loading: false,
        });
        await useBlockerStore.getState().syncWithSession(null);
        return;
      }

      const {
        session,
        endTimestampMs,
        remainingSeconds: savedRemaining,
        checkpointTriggered,
        completionNotificationId = null,
      } = persisted;

      if (session.status === 'active' && endTimestampMs !== null) {
        const recalculated = computeRemainingSeconds(endTimestampMs, savedRemaining);
        if (recalculated <= 0) {
          await cancelScheduledNotification(completionNotificationId);
          const completedSession = await focusRepository.updateSession(session.id, {
            status: 'completed',
            endedAt: new Date(endTimestampMs).toISOString(),
            actualFocusSeconds: session.plannedDurationMinutes * 60,
          });
          await sessionPersistence.clear();
          await useBlockerStore.getState().syncWithSession('completed');
          const refreshed = await focusRepository.getSessions();
          set({
            sessions: refreshed,
            checkpoints,
            activeSession: null,
            endTimestampMs: null,
            remainingSeconds: 0,
            checkpointTriggered: false,
            completionNotificationId: null,
            lastCompletedSession: completedSession,
            loading: false,
          });
          return;
        }

        const updatedActual = computeActualFocusSeconds(session, recalculated);
        const hydratedSession: FocusSession = {
          ...session,
          actualFocusSeconds: updatedActual,
        };
        set({
          sessions,
          checkpoints,
          activeSession: hydratedSession,
          endTimestampMs,
          remainingSeconds: recalculated,
          checkpointTriggered,
          completionNotificationId,
          loading: false,
        });
        await useBlockerStore.getState().syncWithSession('active');
        return;
      }

      set({
        sessions,
        checkpoints,
        activeSession: session,
        endTimestampMs: null,
        remainingSeconds: savedRemaining,
        checkpointTriggered,
        completionNotificationId,
        loading: false,
      });
      await useBlockerStore.getState().syncWithSession(session.status);
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Unable to hydrate focus sessions.',
      });
    }
  },

  startSession: async ({ taskId, taskTitleSnapshot, plannedDurationMinutes }) => {
    const existing = get().activeSession;
    if (existing && (existing.status === 'active' || existing.status === 'paused')) {
      await get().cancelSession();
    }

    const nowMs = Date.now();
    const startedAt = new Date(nowMs).toISOString();
    const totalSeconds = plannedDurationMinutes * 60;
    const endTimestampMs = nowMs + totalSeconds * 1000;

    const planned = await focusRepository.createSession({
      taskId,
      taskTitleSnapshot: taskTitleSnapshot || 'Open focus session',
      plannedDurationMinutes,
      actualFocusSeconds: 0,
      startedAt,
      endedAt: null,
      status: 'planned',
      pauseCount: 0,
      interruptionCount: 0,
      checkpointCount: 0,
      completedCheckpointCount: 0,
    });

    const active = await focusRepository.updateSession(planned.id, {
      status: 'active',
    });

    const notificationsEnabled = useSettingsStore.getState().preferences.notificationsEnabled;
    const completionNotificationId = notificationsEnabled
      ? await scheduleFocusCompletionNotification(active.taskTitleSnapshot, endTimestampMs)
      : null;

    await sessionPersistence.save({
      session: active,
      endTimestampMs,
      remainingSeconds: totalSeconds,
      lastSavedAtMs: nowMs,
      checkpointTriggered: false,
      completionNotificationId,
    });

    set((state) => ({
      sessions: [active, ...state.sessions.filter((s) => s.id !== active.id)],
      activeSession: active,
      endTimestampMs,
      remainingSeconds: totalSeconds,
      checkpointTriggered: false,
      completionNotificationId,
      lastCompletedSession: null,
    }));

    await useBlockerStore.getState().syncWithSession('active');
    return active;
  },

  tickDisplay: async () => {
    const { activeSession, endTimestampMs, remainingSeconds } = get();
    if (!activeSession || activeSession.status !== 'active' || endTimestampMs === null) {
      return 'idle';
    }

    const nextRemaining = computeRemainingSeconds(endTimestampMs, remainingSeconds);
    if (nextRemaining <= 0) {
      await get().completeSession();
      return 'completed';
    }

    if (nextRemaining !== remainingSeconds) {
      const actualFocusSeconds = computeActualFocusSeconds(activeSession, nextRemaining);
      set({
        remainingSeconds: nextRemaining,
        activeSession: {
          ...activeSession,
          actualFocusSeconds,
        },
      });
    }
    return 'ticking';
  },

  pauseSession: async () => {
    const {
      activeSession,
      endTimestampMs,
      remainingSeconds,
      checkpointTriggered,
      completionNotificationId,
    } = get();
    if (!activeSession || activeSession.status !== 'active') return;

    await cancelScheduledNotification(completionNotificationId);

    const nowMs = Date.now();
    const preciseRemaining = computeRemainingSeconds(endTimestampMs, remainingSeconds, nowMs);
    const actualFocusSeconds = computeActualFocusSeconds(activeSession, preciseRemaining);

    const updated = await focusRepository.updateSession(activeSession.id, {
      status: 'paused',
      pauseCount: activeSession.pauseCount + 1,
      actualFocusSeconds,
    });

    await sessionPersistence.save({
      session: updated,
      endTimestampMs: null,
      remainingSeconds: preciseRemaining,
      lastSavedAtMs: nowMs,
      checkpointTriggered,
      completionNotificationId: null,
    });

    set((state) => ({
      activeSession: updated,
      endTimestampMs: null,
      remainingSeconds: preciseRemaining,
      completionNotificationId: null,
      sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)),
    }));

    await useBlockerStore.getState().syncWithSession('paused');
  },

  resumeSession: async () => {
    const { activeSession, remainingSeconds, checkpointTriggered } = get();
    if (
      !activeSession ||
      (activeSession.status !== 'paused' && activeSession.status !== 'checkpoint')
    ) {
      return;
    }

    const nowMs = Date.now();
    const safeRemaining = Math.max(1, remainingSeconds);
    const endTimestampMs = nowMs + safeRemaining * 1000;

    const updated = await focusRepository.updateSession(activeSession.id, {
      status: 'active',
    });

    const notificationsEnabled = useSettingsStore.getState().preferences.notificationsEnabled;
    const completionNotificationId = notificationsEnabled
      ? await scheduleFocusCompletionNotification(updated.taskTitleSnapshot, endTimestampMs)
      : null;

    await sessionPersistence.save({
      session: updated,
      endTimestampMs,
      remainingSeconds: safeRemaining,
      lastSavedAtMs: nowMs,
      checkpointTriggered,
      completionNotificationId,
    });

    set((state) => ({
      activeSession: updated,
      endTimestampMs,
      remainingSeconds: safeRemaining,
      completionNotificationId,
      sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)),
    }));

    await useBlockerStore.getState().syncWithSession('active');
  },

  enterCheckpoint: async () => {
    const { activeSession, endTimestampMs, remainingSeconds, completionNotificationId } = get();
    if (!activeSession) return;

    await cancelScheduledNotification(completionNotificationId);

    const nowMs = Date.now();
    const preciseRemaining =
      activeSession.status === 'active'
        ? computeRemainingSeconds(endTimestampMs, remainingSeconds, nowMs)
        : remainingSeconds;
    const actualFocusSeconds = computeActualFocusSeconds(activeSession, preciseRemaining);

    const updated = await focusRepository.updateSession(activeSession.id, {
      status: 'checkpoint',
      actualFocusSeconds,
    });

    await sessionPersistence.save({
      session: updated,
      endTimestampMs: null,
      remainingSeconds: preciseRemaining,
      lastSavedAtMs: nowMs,
      checkpointTriggered: true,
      completionNotificationId: null,
    });

    set((state) => ({
      activeSession: updated,
      endTimestampMs: null,
      remainingSeconds: preciseRemaining,
      checkpointTriggered: true,
      completionNotificationId: null,
      sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)),
    }));

    await useBlockerStore.getState().syncWithSession('checkpoint');
  },

  recordCheckpointResult: async ({ detectedObjects, verificationResult, confidence }) => {
    const { activeSession, remainingSeconds, checkpointTriggered, completionNotificationId } =
      get();
    if (!activeSession) return null;

    const record = await focusRepository.saveCheckpoint({
      sessionId: activeSession.id,
      capturedAt: new Date().toISOString(),
      detectedObjects,
      verificationResult,
      confidence,
      imagePath: null, // Always null by default
    });

    const updated = await focusRepository.updateSession(activeSession.id, {
      checkpointCount: activeSession.checkpointCount + 1,
      completedCheckpointCount:
        activeSession.completedCheckpointCount + (verificationResult === 'passed' ? 1 : 0),
    });

    await sessionPersistence.save({
      session: updated,
      endTimestampMs: null,
      remainingSeconds,
      lastSavedAtMs: Date.now(),
      checkpointTriggered,
      completionNotificationId,
    });

    set((state) => ({
      checkpoints: [record, ...state.checkpoints],
      activeSession: updated,
      sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)),
    }));

    return record;
  },

  exitCheckpointToActive: async () => {
    const { activeSession } = get();
    if (!activeSession) return;
    if (activeSession.status === 'checkpoint') {
      await get().resumeSession();
    }
  },

  recordInterruption: async () => {
    const {
      activeSession,
      endTimestampMs,
      remainingSeconds,
      checkpointTriggered,
      completionNotificationId,
    } = get();
    if (!activeSession) return;

    const updated = await focusRepository.updateSession(activeSession.id, {
      interruptionCount: activeSession.interruptionCount + 1,
    });

    await sessionPersistence.save({
      session: updated,
      endTimestampMs,
      remainingSeconds,
      lastSavedAtMs: Date.now(),
      checkpointTriggered,
      completionNotificationId,
    });

    set((state) => ({
      activeSession: updated,
      sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)),
    }));
  },

  completeSession: async () => {
    const { activeSession, endTimestampMs, remainingSeconds, completionNotificationId } = get();
    if (!activeSession) return null;

    await cancelScheduledNotification(completionNotificationId);

    const nowMs = Date.now();
    const preciseRemaining =
      activeSession.status === 'active'
        ? computeRemainingSeconds(endTimestampMs, remainingSeconds, nowMs)
        : remainingSeconds;
    const actualFocusSeconds = computeActualFocusSeconds(activeSession, preciseRemaining);

    const completed = await focusRepository.updateSession(activeSession.id, {
      status: 'completed',
      endedAt: new Date(nowMs).toISOString(),
      actualFocusSeconds,
    });

    await sessionPersistence.clear();
    await useBlockerStore.getState().syncWithSession('completed');

    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === completed.id ? completed : s)),
      activeSession: null,
      endTimestampMs: null,
      remainingSeconds: 0,
      checkpointTriggered: false,
      completionNotificationId: null,
      lastCompletedSession: completed,
    }));

    return completed;
  },

  cancelSession: async () => {
    const { activeSession, endTimestampMs, remainingSeconds, completionNotificationId } = get();
    if (!activeSession) return null;

    await cancelScheduledNotification(completionNotificationId);

    const nowMs = Date.now();
    const preciseRemaining =
      activeSession.status === 'active'
        ? computeRemainingSeconds(endTimestampMs, remainingSeconds, nowMs)
        : remainingSeconds;
    const actualFocusSeconds = computeActualFocusSeconds(activeSession, preciseRemaining);

    const cancelled = await focusRepository.updateSession(activeSession.id, {
      status: 'cancelled',
      endedAt: new Date(nowMs).toISOString(),
      actualFocusSeconds,
    });

    await sessionPersistence.clear();
    await useBlockerStore.getState().syncWithSession('cancelled');

    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === cancelled.id ? cancelled : s)),
      activeSession: null,
      endTimestampMs: null,
      remainingSeconds: 0,
      checkpointTriggered: false,
      completionNotificationId: null,
      lastCompletedSession: cancelled,
    }));

    return cancelled;
  },

  clearLastCompleted: () => set({ lastCompletedSession: null }),
}));
