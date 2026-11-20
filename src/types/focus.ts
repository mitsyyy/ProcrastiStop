export type SessionStatus =
  | 'planned'
  | 'active'
  | 'paused'
  | 'checkpoint'
  | 'completed'
  | 'cancelled';

export interface FocusSession {
  id: string;
  taskId: string | null;
  taskTitleSnapshot: string;
  plannedDurationMinutes: number;
  actualFocusSeconds: number;
  startedAt: string | null;
  endedAt: string | null;
  status: SessionStatus;
  pauseCount: number;
  interruptionCount: number;
  checkpointCount: number;
  completedCheckpointCount: number;
}

export type CreateFocusSessionInput = Omit<FocusSession, 'id'>;

export interface CheckpointRecord {
  id: string;
  sessionId: string;
  capturedAt: string;
  detectedObjects: string[];
  verificationResult: 'passed' | 'failed';
  confidence: number;
  imagePath: null; // Always null by default for user privacy
}

export type CreateCheckpointInput = Omit<CheckpointRecord, 'id'>;

export interface PersistedActiveSession {
  session: FocusSession;
  endTimestampMs: number | null;
  remainingSeconds: number;
  lastSavedAtMs: number;
  checkpointTriggered: boolean;
  completionNotificationId?: string | null;
}

export interface FocusRepository {
  getSessions(): Promise<FocusSession[]>;
  getSessionById(id: string): Promise<FocusSession | null>;
  createSession(input: CreateFocusSessionInput): Promise<FocusSession>;
  updateSession(id: string, changes: Partial<FocusSession>): Promise<FocusSession>;
  getCheckpoints(): Promise<CheckpointRecord[]>;
  getCheckpointsBySession(sessionId: string): Promise<CheckpointRecord[]>;
  saveCheckpoint(input: CreateCheckpointInput): Promise<CheckpointRecord>;
}
