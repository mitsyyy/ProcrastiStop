import {
  ensureStorageSeeded,
  readJsonItem,
  removeStorageItem,
  secureStorage,
  STORAGE_KEYS,
  writeJsonItem,
} from '@/services/local/storage';
import type { BlockedAppSettings } from '@/types/blocker';
import type { MockUser, SettingsRepository, UserPreferences } from '@/types/settings';

const FALLBACK_PREFERENCES: UserPreferences = {
  focusDefaultMinutes: 45,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  checkpointEnabled: true,
  notificationsEnabled: true,
  remindBeforeSessionMinutes: 5,
  theme: 'dark',
};

const FALLBACK_BLOCKED_APPS: BlockedAppSettings = {
  enabled: true,
  blockDuringFocus: true,
  selectedApps: [],
  allowEmergencyExit: true,
};

class MockSettingsRepository implements SettingsRepository {
  async getPreferences(): Promise<UserPreferences> {
    await ensureStorageSeeded();
    const saved = await readJsonItem<UserPreferences>(STORAGE_KEYS.SETTINGS);
    return saved ? { ...FALLBACK_PREFERENCES, ...saved } : FALLBACK_PREFERENCES;
  }

  async updatePreferences(changes: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.getPreferences();
    const next: UserPreferences = {
      ...current,
      ...changes,
    };
    await writeJsonItem(STORAGE_KEYS.SETTINGS, next);
    return next;
  }

  async getBlockedApps(): Promise<BlockedAppSettings> {
    await ensureStorageSeeded();
    const saved = await readJsonItem<BlockedAppSettings>(STORAGE_KEYS.BLOCKED_APPS);
    return saved ? { ...FALLBACK_BLOCKED_APPS, ...saved } : FALLBACK_BLOCKED_APPS;
  }

  async updateBlockedApps(settings: BlockedAppSettings): Promise<BlockedAppSettings> {
    await writeJsonItem(STORAGE_KEYS.BLOCKED_APPS, settings);
    return settings;
  }

  async getAuthUser(): Promise<MockUser | null> {
    const user = await readJsonItem<MockUser>(STORAGE_KEYS.AUTH_USER);
    return user;
  }

  async saveAuthUser(user: MockUser | null): Promise<void> {
    if (!user) {
      await removeStorageItem(STORAGE_KEYS.AUTH_USER);
      await secureStorage.clearAuthToken();
      return;
    }
    await writeJsonItem(STORAGE_KEYS.AUTH_USER, user);
    await secureStorage.saveAuthToken(`demo_token_${user.id}`);
  }

  async getOnboardingCompleted(): Promise<boolean> {
    const val = await readJsonItem<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETED);
    return val === true;
  }

  async setOnboardingCompleted(completed: boolean): Promise<void> {
    await writeJsonItem(STORAGE_KEYS.ONBOARDING_COMPLETED, completed);
  }
}

export const settingsRepository: SettingsRepository = new MockSettingsRepository();
