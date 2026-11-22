import { create } from 'zustand';

import {
  formatTimeShort,
  SKIP_RESCHEDULE_DELAY_MS,
} from '@/features/tasks/antiProcrastinationScheduler';
import { focusRepository } from '@/repositories/focusRepository';
import {
  computeActualFocusSeconds,
  computeRemainingSeconds,
  sessionPersistence,
} from '@/services/local/sessionPersistence';
import {
  consumePendingSwipeKillEvent,
  pauseLiveCountdownService,
  startLiveCountdownService,
  stopLiveCountdownService,
} from '@/services/native/focusSessionService';
import {
  cancelScheduledNotification,
  scheduleFocusCompletionNotification,
} from '@/services/notifications/notificationService';
import { useBlockerStore } from '@/store/blockerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';
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
  lastSkippedRescheduledAt: string | null;
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
  skipSessionAndReschedule: () => Promise<{
    session: FocusSession | null;
    rescheduledForIso: string | null;
    markedMissed: boolean;
  }>;
  skipTaskBeforeStart: (
    taskId: string | null,
    taskTitle: string,
    plannedDurationMinutes: number,
  ) => Promise<{
    session: FocusSession;
    rescheduledForIso: string | null;
    markedMissed: boolean;
  }>;
  cancelSession: () => Promise<FocusSession | null>;
  clearLastCompleted: () => void;
}

function getLinkedTaskDeadlineMs(taskId: string | null): number | null {
  if (!taskId) return null;
  const task = useTaskStore.getState().tasks.find((t) => t.id === taskId);
  if (!task?.deadline) return null;
  const ms = new Date(task.deadline).getTime();
  return Number.isNaN(ms) ? null : ms;
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
  lastSkippedRescheduledAt: null,
  loading: false,
  error: null,

  hydrateFocus: async () => {
    set({ loading: true, error: null });
    try {
      const [sessions, checkpoints, persisted, swipeKillEvent] = await Promise.all([
        focusRepository.getSessions(),
        focusRepository.getCheckpoints(),
        sessionPersistence.load(),
        consumePendingSwipeKillEvent(),
      ]);

      // Handle swipe-kill / app removal during an active focus session (onTaskRemoved)
      if (swipeKillEvent) {
        await stopLiveCountdownService();
        const nowMs = Date.now();
        const terminatedMs = swipeKillEvent.terminatedAtMs || nowMs;
        const terminatedAtIso = new Date(terminatedMs).toISOString();
        const candidateReschedMs =
          swipeKillEvent.rescheduledAtMs || terminatedMs + SKIP_RESCHEDULE_DELAY_MS;

        const linkedTaskId = swipeKillEvent.taskId || persisted?.session?.taskId || null;
        const deadlineMs = getLinkedTaskDeadlineMs(linkedTaskId);
        // Past Due Date Cutoff: never reschedule +1h if now or +1h meets/exceeds task.dueDate
        const exceedsDueDate =
          Boolean(swipeKillEvent.pastDue) ||
          (deadlineMs !== null && (nowMs >= deadlineMs || candidateReschedMs >= deadlineMs));

        const finalStatus = exceedsDueDate ? 'missed' : 'skipped';
        const rescheduledAtIso = exceedsDueDate
          ? null
          : new Date(candidateReschedMs).toISOString();

        if (persisted?.session) {
          await cancelScheduledNotification(persisted.completionNotificationId ?? null);
          const remaining = computeRemainingSeconds(
            persisted.endTimestampMs,
            persisted.remainingSeconds,
            terminatedMs,
          );
          const actualSeconds = computeActualFocusSeconds(persisted.session, remaining);
          await focusRepository.updateSession(persisted.session.id, {
            status: finalStatus,
            endedAt: terminatedAtIso,
            actualFocusSeconds: actualSeconds,
          });
          await sessionPersistence.clear();
        }

        if (linkedTaskId) {
          const exists = useTaskStore.getState().tasks.some((t) => t.id === linkedTaskId);
          if (exists) {
            await useTaskStore.getState().updateTask(linkedTaskId, {
              status: finalStatus,
              rescheduledStartAt: rescheduledAtIso,
              lastAutoStartedDate: null,
            });
          }
        }

        await useBlockerStore.getState().syncWithSession(finalStatus);
        const refreshed = await focusRepository.getSessions();
        useSettingsStore
          .getState()
          .showToast(
            rescheduledAtIso
              ? `App was closed during focus — marked Skipped & rescheduled for ${formatTimeShort(new Date(rescheduledAtIso))}.`
              : 'App was closed during focus past due cutoff — marked Missed (no +1h retry).',
            'warning',
          );

        set({
          sessions: refreshed,
          checkpoints,
          activeSession: null,
          endTimestampMs: null,
          remainingSeconds: 0,
          checkpointTriggered: false,
          completionNotificationId: null,
          lastSkippedRescheduledAt: rescheduledAtIso,
          loading: false,
        });
        return;
      }

      if (!persisted) {
        await stopLiveCountdownService();
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
          await stopLiveCountdownService();
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
        await startLiveCountdownService({
          sessionId: hydratedSession.id,
          taskId: hydratedSession.taskId,
          taskTitle: hydratedSession.taskTitleSnapshot,
          endTimestampMs,
          plannedSeconds: hydratedSession.plannedDurationMinutes * 60,
          deadlineMs: getLinkedTaskDeadlineMs(hydratedSession.taskId),
        });
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

      await pauseLiveCountdownService(savedRemaining);
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

    await startLiveCountdownService({
      sessionId: active.id,
      taskId: active.taskId,
      taskTitle: active.taskTitleSnapshot,
      endTimestampMs,
      plannedSeconds: totalSeconds,
      deadlineMs: getLinkedTaskDeadlineMs(active.taskId),
    });

    set((state) => ({
      sessions: [active, ...state.sessions.filter((s) => s.id !== active.id)],
      activeSession: active,
      endTimestampMs,
      remainingSeconds: totalSeconds,
      checkpointTriggered: false,
      completionNotificationId,
      lastCompletedSession: null,
      lastSkippedRescheduledAt: null,
    }));

    if (taskId) {
      const linked = useTaskStore.getState().tasks.find((t) => t.id === taskId);
      if (linked && linked.status !== 'completed' && linked.status !== 'cancelled') {
        void useTaskStore.getState().updateTask(taskId, {
          status: 'in_progress',
          rescheduledStartAt: null,
        });
      }
    }

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

    await pauseLiveCountdownService(preciseRemaining);

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

    await startLiveCountdownService({
      sessionId: updated.id,
      taskId: updated.taskId,
      taskTitle: updated.taskTitleSnapshot,
      endTimestampMs,
      plannedSeconds: updated.plannedDurationMinutes * 60,
      deadlineMs: getLinkedTaskDeadlineMs(updated.taskId),
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

    await pauseLiveCountdownService(preciseRemaining);

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
    const {
      activeSession,
      endTimestampMs,
      remainingSeconds,
      checkpointTriggered,
      completionNotificationId,
    } = get();
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
      endTimestampMs,
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
    await stopLiveCountdownService();

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
      lastSkippedRescheduledAt: null,
    }));

    return completed;
  },

  skipSessionAndReschedule: async () => {
    const { activeSession, endTimestampMs, remainingSeconds, completionNotificationId } = get();
    if (!activeSession) {
      return { session: null, rescheduledForIso: null, markedMissed: false };
    }

    await cancelScheduledNotification(completionNotificationId);
    await stopLiveCountdownService();

    const nowMs = Date.now();
    const preciseRemaining =
      activeSession.status === 'active'
        ? computeRemainingSeconds(endTimestampMs, remainingSeconds, nowMs)
        : remainingSeconds;
    const actualFocusSeconds = computeActualFocusSeconds(activeSession, preciseRemaining);

    const deadlineMs = getLinkedTaskDeadlineMs(activeSession.taskId);
    const candidateReschedMs = nowMs + SKIP_RESCHEDULE_DELAY_MS;
    const exceedsDueDate =
      deadlineMs !== null && (nowMs >= deadlineMs || candidateReschedMs >= deadlineMs);

    const finalStatus = exceedsDueDate ? 'missed' : 'skipped';
    const rescheduledForIso = exceedsDueDate ? null : new Date(candidateReschedMs).toISOString();

    const resultSession = await focusRepository.updateSession(activeSession.id, {
      status: finalStatus,
      endedAt: new Date(nowMs).toISOString(),
      actualFocusSeconds,
    });

    await sessionPersistence.clear();
    await useBlockerStore.getState().syncWithSession(finalStatus);

    if (activeSession.taskId) {
      const taskExists = useTaskStore
        .getState()
        .tasks.some((t) => t.id === activeSession.taskId);
      if (taskExists) {
        await useTaskStore.getState().updateTask(activeSession.taskId, {
          status: finalStatus,
          rescheduledStartAt: rescheduledForIso,
          lastAutoStartedDate: null,
        });
      }
    }

    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === resultSession.id ? resultSession : s)),
      activeSession: null,
      endTimestampMs: null,
      remainingSeconds: 0,
      checkpointTriggered: false,
      completionNotificationId: null,
      lastCompletedSession: resultSession,
      lastSkippedRescheduledAt: rescheduledForIso,
    }));

    return { session: resultSession, rescheduledForIso, markedMissed: exceedsDueDate };
  },

  skipTaskBeforeStart: async (taskId, taskTitle, plannedDurationMinutes) => {
    await stopLiveCountdownService();
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const deadlineMs = getLinkedTaskDeadlineMs(taskId);
    const candidateReschedMs = nowMs + SKIP_RESCHEDULE_DELAY_MS;
    const exceedsDueDate =
      deadlineMs !== null && (nowMs >= deadlineMs || candidateReschedMs >= deadlineMs);

    const finalStatus = exceedsDueDate ? 'missed' : 'skipped';
    const rescheduledForIso = exceedsDueDate ? null : new Date(candidateReschedMs).toISOString();

    const resultSession = await focusRepository.createSession({
      taskId,
      taskTitleSnapshot: taskTitle || 'Scheduled Focus Session',
      plannedDurationMinutes,
      actualFocusSeconds: 0,
      startedAt: nowIso,
      endedAt: nowIso,
      status: finalStatus,
      pauseCount: 0,
      interruptionCount: 0,
      checkpointCount: 0,
      completedCheckpointCount: 0,
    });

    if (taskId) {
      const taskExists = useTaskStore.getState().tasks.some((t) => t.id === taskId);
      if (taskExists) {
        await useTaskStore.getState().updateTask(taskId, {
          status: finalStatus,
          rescheduledStartAt: rescheduledForIso,
          lastAutoStartedDate: null,
        });
      }
    }

    set((state) => ({
      sessions: [resultSession, ...state.sessions],
      lastCompletedSession: resultSession,
      lastSkippedRescheduledAt: rescheduledForIso,
    }));

    return { session: resultSession, rescheduledForIso, markedMissed: exceedsDueDate };
  },

  cancelSession: async () => {
    const { activeSession, endTimestampMs, remainingSeconds, completionNotificationId } = get();
    if (!activeSession) return null;

    await cancelScheduledNotification(completionNotificationId);
    await stopLiveCountdownService();

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

  clearLastCompleted: () => set({ lastCompletedSession: null, lastSkippedRescheduledAt: null }),
}));
