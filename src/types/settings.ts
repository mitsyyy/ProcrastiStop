import type { BlockedAppSettings } from './blocker';
import type { ThemeMode } from '@/constants/theme';

export interface UserPreferences {
  focusDefaultMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  checkpointEnabled: boolean;
  notificationsEnabled: boolean;
  remindBeforeSessionMinutes: number;
  theme: ThemeMode;
}

export interface MockUser {
  id: string;
  fullName: string;
  email: string;
  initials: string;
  signedInAt: string;
  isDemoAccount: boolean;
}

export interface ScheduledReminderPreview {
  id: string;
  kind: 'session' | 'deadline' | 'overdue';
  title: string;
  body: string;
  scheduledLabel: string;
  taskId?: string;
}

export interface SettingsRepository {
  getPreferences(): Promise<UserPreferences>;
  updatePreferences(changes: Partial<UserPreferences>): Promise<UserPreferences>;
  getBlockedApps(): Promise<BlockedAppSettings>;
  updateBlockedApps(settings: BlockedAppSettings): Promise<BlockedAppSettings>;
  getAuthUser(): Promise<MockUser | null>;
  saveAuthUser(user: MockUser | null): Promise<void>;
  getOnboardingCompleted(): Promise<boolean>;
  setOnboardingCompleted(completed: boolean): Promise<void>;
}
