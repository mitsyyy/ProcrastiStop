export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'skipped'
  | 'missed'
  | 'completed'
  | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high';

export type CheckpointTargetItem =
  | 'book'
  | 'laptop'
  | 'notebook'
  | 'pen'
  | 'keyboard'
  | 'workspace';

export type TaskDeadlineState = 'overdue' | 'due_soon' | 'upcoming' | 'none' | 'completed';

export type TaskFilterStatus =
  | 'all'
  | 'pending'
  | 'in_progress'
  | 'skipped'
  | 'missed'
  | 'completed'
  | 'overdue';
export type TaskSortBy = 'deadline' | 'priority' | 'recent';

export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string | null; // ISO 8601 string
  targetCompletionAt?: string | null; // Auto-scheduled 24h anti-procrastination buffer before deadline
  dailySessionStartTime?: string; // "HH:mm" local daily focus session start time
  rescheduledStartAt?: string | null; // ISO timestamp when auto-rescheduled (+1h after early skip)
  requiredCheckpointItem?: CheckpointTargetItem; // Required desk item scanned via ML Kit before starting
  dailyReminderCount?: number; // Minimum 3 free-will reminders per day
  autoStartEnabled?: boolean; // Automatically start focus session when daily start time arrives
  lastAutoStartedDate?: string | null; // YYYY-MM-DD local date key of last auto-escalation
  estimatedMinutes: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export type CreateTaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

export interface TaskRepository {
  getAll(): Promise<Task[]>;
  getById(id: string): Promise<Task | null>;
  create(input: CreateTaskInput): Promise<Task>;
  update(id: string, changes: Partial<Task>): Promise<Task>;
  delete(id: string): Promise<void>;
}
