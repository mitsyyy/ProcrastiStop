import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import analyticsSeed from '@/data/mock/analytics.json';
import blockedAppsSeed from '@/data/mock/blockedApps.json';
import focusSessionsSeed from '@/data/mock/focusSessions.json';
import settingsSeed from '@/data/mock/settings.json';
import tasksSeed from '@/data/mock/tasks.json';

export const STORAGE_KEYS = {
  TASKS: '@procrastistop/tasks',
  FOCUS_SESSIONS: '@procrastistop/focus_sessions',
  CHECKPOINTS: '@procrastistop/checkpoints',
  BLOCKED_APPS: '@procrastistop/blocked_apps',
  SETTINGS: '@procrastistop/settings',
  ANALYTICS_BASELINE: '@procrastistop/analytics_baseline',
  ACTIVE_SESSION: '@procrastistop/active_session',
  BLOCKER_PERMISSIONS: '@procrastistop/blocker_permissions',
  AUTH_USER: '@procrastistop/auth_user',
  ONBOARDING_COMPLETED: '@procrastistop/onboarding_completed',
  SCHEDULED_NOTIFICATION_IDS: '@procrastistop/scheduled_notification_ids',
} as const;

const SECURE_AUTH_TOKEN_KEY = 'procrastistop_auth_token';

const DEMO_DATA_KEYS = [
  STORAGE_KEYS.TASKS,
  STORAGE_KEYS.FOCUS_SESSIONS,
  STORAGE_KEYS.CHECKPOINTS,
  STORAGE_KEYS.BLOCKED_APPS,
  STORAGE_KEYS.SETTINGS,
  STORAGE_KEYS.ANALYTICS_BASELINE,
  STORAGE_KEYS.ACTIVE_SESSION,
  STORAGE_KEYS.BLOCKER_PERMISSIONS,
  STORAGE_KEYS.SCHEDULED_NOTIFICATION_IDS,
] as const;

let initPromise: Promise<void> | null = null;

function isServerEnvironment(): boolean {
  return Platform.OS === 'web' && typeof window === 'undefined';
}

export async function readJsonItem<T>(key: string): Promise<T | null> {
  if (isServerEnvironment()) return null;
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJsonItem<T>(key: string, value: T): Promise<void> {
  if (isServerEnvironment()) return;
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeStorageItem(key: string): Promise<void> {
  if (isServerEnvironment()) return;
  await AsyncStorage.removeItem(key);
}

async function seedCollectionIfMissing(key: string, seedValue: unknown): Promise<void> {
  const existing = await AsyncStorage.getItem(key);
  if (existing === null) {
    await AsyncStorage.setItem(key, JSON.stringify(seedValue));
  }
}

export async function ensureStorageSeeded(): Promise<void> {
  if (isServerEnvironment()) return;
  if (!initPromise) {
    initPromise = (async () => {
      await seedCollectionIfMissing(STORAGE_KEYS.TASKS, tasksSeed);
      await seedCollectionIfMissing(STORAGE_KEYS.FOCUS_SESSIONS, focusSessionsSeed);
      await seedCollectionIfMissing(STORAGE_KEYS.CHECKPOINTS, []);
      await seedCollectionIfMissing(STORAGE_KEYS.BLOCKED_APPS, blockedAppsSeed);
      await seedCollectionIfMissing(STORAGE_KEYS.SETTINGS, settingsSeed);
      await seedCollectionIfMissing(STORAGE_KEYS.ANALYTICS_BASELINE, analyticsSeed);
      await seedCollectionIfMissing(STORAGE_KEYS.BLOCKER_PERMISSIONS, {
        usageAccess: 'not_granted',
        overlay: 'not_granted',
      });
    })();
  }
  await initPromise;
}

export async function resetDemoStorageData(): Promise<void> {
  if (isServerEnvironment()) return;
  await AsyncStorage.multiRemove([...DEMO_DATA_KEYS]);
  initPromise = null;
  await ensureStorageSeeded();
}

export const secureStorage = {
  async saveAuthToken(token: string): Promise<void> {
    if (isServerEnvironment()) return;
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(`@procrastistop/${SECURE_AUTH_TOKEN_KEY}`, token);
      return;
    }
    try {
      await SecureStore.setItemAsync(SECURE_AUTH_TOKEN_KEY, token);
    } catch {
      await AsyncStorage.setItem(`@procrastistop/${SECURE_AUTH_TOKEN_KEY}`, token);
    }
  },
  async getAuthToken(): Promise<string | null> {
    if (isServerEnvironment()) return null;
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(`@procrastistop/${SECURE_AUTH_TOKEN_KEY}`);
    }
    try {
      return await SecureStore.getItemAsync(SECURE_AUTH_TOKEN_KEY);
    } catch {
      return AsyncStorage.getItem(`@procrastistop/${SECURE_AUTH_TOKEN_KEY}`);
    }
  },
  async clearAuthToken(): Promise<void> {
    if (isServerEnvironment()) return;
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(`@procrastistop/${SECURE_AUTH_TOKEN_KEY}`);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(SECURE_AUTH_TOKEN_KEY);
    } catch {
      await AsyncStorage.removeItem(`@procrastistop/${SECURE_AUTH_TOKEN_KEY}`);
    }
  },
};
