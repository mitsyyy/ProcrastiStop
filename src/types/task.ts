export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high';

export type TaskDeadlineState = 'overdue' | 'due_soon' | 'upcoming' | 'none' | 'completed';

export type TaskFilterStatus = 'all' | 'pending' | 'in_progress' | 'completed' | 'overdue';
export type TaskSortBy = 'deadline' | 'priority' | 'recent';

export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string | null; // ISO 8601 string
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
