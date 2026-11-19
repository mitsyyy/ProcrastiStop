import { create } from 'zustand';

import { filterTasks, getNextTaskStatus, sortTasks } from '@/features/tasks/taskUtils';
import { taskRepository } from '@/repositories/taskRepository';
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
    set((state) => ({ tasks: [created, ...state.tasks] }));
    return created;
  },

  updateTask: async (id, changes) => {
    set({ error: null });
    const updated = await taskRepository.update(id, changes);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
    }));
    return updated;
  },

  toggleTaskComplete: async (id) => {
    const existing = get().tasks.find((t) => t.id === id);
    if (!existing) return null;
    const nextStatus = getNextTaskStatus(existing.status);
    return get().updateTask(id, { status: nextStatus });
  },

  deleteTask: async (id) => {
    set({ error: null });
    await taskRepository.delete(id);
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
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
