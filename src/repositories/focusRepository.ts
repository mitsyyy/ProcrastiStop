import { ensureStorageSeeded, readJsonItem, STORAGE_KEYS, writeJsonItem } from '@/services/local/storage';
import type {
  CheckpointRecord,
  CreateCheckpointInput,
  CreateFocusSessionInput,
  FocusRepository,
  FocusSession,
} from '@/types/focus';
import { createId } from '@/utils/id';

class MockFocusRepository implements FocusRepository {
  async getSessions(): Promise<FocusSession[]> {
    await ensureStorageSeeded();
    const sessions = await readJsonItem<FocusSession[]>(STORAGE_KEYS.FOCUS_SESSIONS);
    return Array.isArray(sessions) ? sessions : [];
  }

  async getSessionById(id: string): Promise<FocusSession | null> {
    const sessions = await this.getSessions();
    return sessions.find((s) => s.id === id) ?? null;
  }

  async createSession(input: CreateFocusSessionInput): Promise<FocusSession> {
    const sessions = await this.getSessions();
    const created: FocusSession = {
      ...input,
      id: createId('session'),
    };
    const next = [created, ...sessions];
    await writeJsonItem(STORAGE_KEYS.FOCUS_SESSIONS, next);
    return created;
  }

  async updateSession(id: string, changes: Partial<FocusSession>): Promise<FocusSession> {
    const sessions = await this.getSessions();
    const index = sessions.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error(`FocusSession not found: ${id}`);
    }
    const updated: FocusSession = {
      ...sessions[index],
      ...changes,
      id: sessions[index].id,
    };
    const next = sessions.map((item, i) => (i === index ? updated : item));
    await writeJsonItem(STORAGE_KEYS.FOCUS_SESSIONS, next);
    return updated;
  }

  async getCheckpoints(): Promise<CheckpointRecord[]> {
    await ensureStorageSeeded();
    const list = await readJsonItem<CheckpointRecord[]>(STORAGE_KEYS.CHECKPOINTS);
    return Array.isArray(list) ? list : [];
  }

  async getCheckpointsBySession(sessionId: string): Promise<CheckpointRecord[]> {
    const list = await this.getCheckpoints();
    return list.filter((item) => item.sessionId === sessionId);
  }

  async saveCheckpoint(input: CreateCheckpointInput): Promise<CheckpointRecord> {
    const list = await this.getCheckpoints();
    const record: CheckpointRecord = {
      ...input,
      id: createId('checkpoint'),
      imagePath: null, // Enforce privacy rule: never persist captured photos by default
    };
    const next = [record, ...list];
    await writeJsonItem(STORAGE_KEYS.CHECKPOINTS, next);
    return record;
  }
}

export const focusRepository: FocusRepository = new MockFocusRepository();
