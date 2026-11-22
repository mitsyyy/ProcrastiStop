import type { Task, TaskFilterStatus, TaskPriority, TaskSortBy } from '@/types/task';
import { getTaskDeadlineState } from '@/utils/date';

const PRIORITY_RANK: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function filterTasks(
  tasks: Task[],
  statusFilter: TaskFilterStatus,
  categoryFilter: string,
  searchQuery: string,
  nowMs = Date.now(),
): Task[] {
  const query = searchQuery.trim().toLowerCase();

  return tasks.filter((task) => {
    if (categoryFilter !== 'All' && task.category !== categoryFilter) {
      return false;
    }

    if (statusFilter === 'pending' && task.status !== 'pending') return false;
    if (statusFilter === 'in_progress' && task.status !== 'in_progress') return false;
    if (statusFilter === 'skipped' && task.status !== 'skipped') return false;
    if (statusFilter === 'missed' && task.status !== 'missed') return false;
    if (statusFilter === 'completed' && task.status !== 'completed') return false;
    if (statusFilter === 'overdue' && getTaskDeadlineState(task, nowMs) !== 'overdue') {
      return false;
    }

    if (query) {
      const matchesTitle = task.title.toLowerCase().includes(query);
      const matchesDesc = task.description.toLowerCase().includes(query);
      const matchesCat = task.category.toLowerCase().includes(query);
      if (!matchesTitle && !matchesDesc && !matchesCat) {
        return false;
      }
    }

    return true;
  });
}

export function sortTasks(tasks: Task[], sortBy: TaskSortBy, nowMs = Date.now()): Task[] {
  return [...tasks].sort((a, b) => {
    // Keep active tasks before completed/cancelled/missed tasks when sorting by deadline/priority
    const aDone =
      a.status === 'completed' || a.status === 'cancelled' || a.status === 'missed';
    const bDone =
      b.status === 'completed' || b.status === 'cancelled' || b.status === 'missed';
    if (aDone !== bDone && sortBy !== 'recent') {
      return aDone ? 1 : -1;
    }

    if (sortBy === 'priority') {
      const diff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (diff !== 0) return diff;
    }

    if (sortBy === 'deadline' || sortBy === 'priority') {
      const aTime = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      const aOverdue = getTaskDeadlineState(a, nowMs) === 'overdue';
      const bOverdue = getTaskDeadlineState(b, nowMs) === 'overdue';
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      if (aTime !== bTime) return aTime - bTime;
    }

    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function getNextTaskStatus(current: Task['status']): Task['status'] {
  if (current === 'completed' || current === 'cancelled') return 'pending';
  return 'completed';
}
