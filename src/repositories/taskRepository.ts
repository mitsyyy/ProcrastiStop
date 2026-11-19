import { ensureStorageSeeded, readJsonItem, STORAGE_KEYS, writeJsonItem } from '@/services/local/storage';
import type { CreateTaskInput, Task, TaskRepository } from '@/types/task';
import { createId } from '@/utils/id';

class MockTaskRepository implements TaskRepository {
  async getAll(): Promise<Task[]> {
    await ensureStorageSeeded();
    const list = await readJsonItem<Task[]>(STORAGE_KEYS.TASKS);
    return Array.isArray(list) ? list : [];
  }

  async getById(id: string): Promise<Task | null> {
    const tasks = await this.getAll();
    return tasks.find((task) => task.id === id) ?? null;
  }

  async create(input: CreateTaskInput): Promise<Task> {
    const tasks = await this.getAll();
    const nowIso = new Date().toISOString();
    const newTask: Task = {
      ...input,
      id: createId('task'),
      createdAt: nowIso,
      updatedAt: nowIso,
      completedAt: input.status === 'completed' ? input.completedAt ?? nowIso : null,
    };
    const next = [newTask, ...tasks];
    await writeJsonItem(STORAGE_KEYS.TASKS, next);
    return newTask;
  }

  async update(id: string, changes: Partial<Task>): Promise<Task> {
    const tasks = await this.getAll();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Task not found: ${id}`);
    }
    const nowIso = new Date().toISOString();
    const existing = tasks[index];
    const nextStatus = changes.status ?? existing.status;

    let completedAt = changes.completedAt !== undefined ? changes.completedAt : existing.completedAt;
    if (changes.status === 'completed' && !completedAt) {
      completedAt = nowIso;
    } else if (changes.status && changes.status !== 'completed') {
      completedAt = null;
    }

    const updated: Task = {
      ...existing,
      ...changes,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: nowIso,
      status: nextStatus,
      completedAt,
    };
    const next = tasks.map((item, i) => (i === index ? updated : item));
    await writeJsonItem(STORAGE_KEYS.TASKS, next);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const tasks = await this.getAll();
    const next = tasks.filter((t) => t.id !== id);
    await writeJsonItem(STORAGE_KEYS.TASKS, next);
  }
}

export const taskRepository: TaskRepository = new MockTaskRepository();
