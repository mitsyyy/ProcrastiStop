import { create } from 'zustand';

import {
  findTasksToMarkMissed,
  getTaskSessionDurationMinutes,
} from '@/features/tasks/antiProcrastinationScheduler';
import { filterTasks, getNextTaskStatus, sortTasks } from '@/features/tasks/taskUtils';
import { focusRepository } from '@/repositories/focusRepository';
import { taskRepository } from '@/repositories/taskRepository';
import { syncScheduledPreSessionAndNudgeNotifications } from '@/services/notifications/notificationService';
import { useSettingsStore } from '@/store/settingsStore';
import type { FocusSession } from '@/types/focus';
import type { CreateTaskInput, Task, TaskFilterStatus, TaskSortBy } from '@/types/task';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  filterStatus: TaskFilterStatus;
  filterCategory: string;
  sortBy: TaskSortBy;
  searchQuery: string;

  loadTasks: () => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (id: string, changes: Partial<Task>) => Promise<Task>;
  reconcileMissedTasks: (activeSession?: FocusSession | null) => Promise<number>;
  toggleTaskComplete: (id: string) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<void>;
  setFilterStatus: (status: TaskFilterStatus) => void;
  setFilterCategory: (category: string) => void;
  setSortBy: (sort: TaskSortBy) => void;
  setSearchQuery: (query: string) => void;
  clearError: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  filterStatus: 'all',
  filterCategory: 'All',
  sortBy: 'deadline',
  searchQuery: '',

  loadTasks: async () => {
    set({ loading: true, error: null });
    try {
      const tasks = await taskRepository.getAll();
      set({ tasks, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Unable to load tasks.',
      });
    }
  },

  createTask: async (input) => {
    set({ error: null });
    const created = await taskRepository.create(input);
    const nextTasks = [created, ...get().tasks];
    set({ tasks: nextTasks });
    // Immediately arm OS-level exact 5-min pre-session warnings & auto-start alarms
    void syncScheduledPreSessionAndNudgeNotifications(
      nextTasks,
      useSettingsStore.getState().preferences,
      null,
      { requestPermissionIfUndetermined: true },
    );
    return created;
  },

  updateTask: async (id, changes) => {
    set({ error: null });
    const updated = await taskRepository.update(id, changes);
    const nextTasks = get().tasks.map((t) => (t.id === id ? updated : t));
    set({ tasks: nextTasks });
    // Immediately update OS-level alarms on task edits or +1h skip reschedules
    void syncScheduledPreSessionAndNudgeNotifications(
      nextTasks,
      useSettingsStore.getState().preferences,
      null,
      { requestPermissionIfUndetermined: true },
    );
    return updated;
  },

  reconcileMissedTasks: async (activeSession = null) => {
    const tasks = get().tasks;
    const { preferences } = useSettingsStore.getState();
    const now = new Date();
    const transitions = findTasksToMarkMissed(
      tasks,
      activeSession,
      preferences.defaultDailySessionStartTime,
      preferences.focusDefaultMinutes,
      now,
    );
    if (transitions.length === 0) return 0;

    const nowIso = now.toISOString();
    const updatedMap = new Map<string, Task>();

    for (const tr of transitions) {
      const existing = tasks.find((t) => t.id === tr.taskId);
      if (!existing) continue;
      const updated = await taskRepository.update(existing.id, {
        status: 'missed',
        rescheduledStartAt: null,
        lastAutoStartedDate: tr.todayKey,
      });
      updatedMap.set(updated.id, updated);

      // Log a missed session entry so history accurately reflects unstarted/past-due windows
      await focusRepository.createSession({
        taskId: existing.id,
        taskTitleSnapshot: existing.title,
        plannedDurationMinutes: getTaskSessionDurationMinutes(
          existing,
          preferences.focusDefaultMinutes,
        ),
        actualFocusSeconds: 0,
        startedAt: null,
        endedAt: nowIso,
        status: 'missed',
        pauseCount: 0,
        interruptionCount: 0,
        checkpointCount: 0,
        completedCheckpointCount: 0,
      });
    }

    const nextTasks = get().tasks.map((t) => updatedMap.get(t.id) ?? t);
    set({ tasks: nextTasks });

    // Immediately cancel OS alarms & +1h retries for newly missed/past-due tasks
    void syncScheduledPreSessionAndNudgeNotifications(nextTasks, preferences, activeSession);
    return transitions.length;
  },

  toggleTaskComplete: async (id) => {
    const existing = get().tasks.find((t) => t.id === id);
    if (!existing) return null;
    const nextStatus = getNextTaskStatus(existing.status);
    return get().updateTask(id, {
      status: nextStatus,
      ...(nextStatus === 'completed' ? { rescheduledStartAt: null } : {}),
    });
  },

  deleteTask: async (id) => {
    set({ error: null });
    await taskRepository.delete(id);
    const nextTasks = get().tasks.filter((t) => t.id !== id);
    set({ tasks: nextTasks });
    // Cancel reminders & alarms belonging to the deleted task
    void syncScheduledPreSessionAndNudgeNotifications(
      nextTasks,
      useSettingsStore.getState().preferences,
      null,
    );
  },

  setFilterStatus: (filterStatus) => set({ filterStatus }),
  setFilterCategory: (filterCategory) => set({ filterCategory }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  clearError: () => set({ error: null }),
}));

export function selectFilteredSortedTasks(state: TaskState): Task[] {
  const filtered = filterTasks(
    state.tasks,
    state.filterStatus,
    state.filterCategory,
    state.searchQuery,
  );
  return sortTasks(filtered, state.sortBy);
}
