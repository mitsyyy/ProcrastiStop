import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import analyticsSeed from '@/data/mock/analytics.json';
import blockedAppsSeed from '@/data/mock/blockedApps.json';
import focusSessionsSeed from '@/data/mock/focusSessions.json';
import settingsSeed from '@/data/mock/settings.json';
import tasksSeed from '@/data/mock/tasks.json';

export const STORAGE_KEYS = {
  TASKS: '@focuslock/tasks',
  FOCUS_SESSIONS: '@focuslock/focus_sessions',
  CHECKPOINTS: '@focuslock/checkpoints',
  BLOCKED_APPS: '@focuslock/blocked_apps',
  SETTINGS: '@focuslock/settings',
  ANALYTICS_BASELINE: '@focuslock/analytics_baseline',
  ACTIVE_SESSION: '@focuslock/active_session',
  BLOCKER_PERMISSIONS: '@focuslock/blocker_permissions',
  AUTH_USER: '@focuslock/auth_user',
  ONBOARDING_COMPLETED: '@focuslock/onboarding_completed',
} as const;

const SECURE_AUTH_TOKEN_KEY = 'focuslock_auth_token';

const DEMO_DATA_KEYS = [
  STORAGE_KEYS.TASKS,
  STORAGE_KEYS.FOCUS_SESSIONS,
  STORAGE_KEYS.CHECKPOINTS,
  STORAGE_KEYS.BLOCKED_APPS,
  STORAGE_KEYS.SETTINGS,
  STORAGE_KEYS.ANALYTICS_BASELINE,
  STORAGE_KEYS.ACTIVE_SESSION,
  STORAGE_KEYS.BLOCKER_PERMISSIONS,
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
      await AsyncStorage.setItem(`@focuslock/${SECURE_AUTH_TOKEN_KEY}`, token);
      return;
    }
    try {
      await SecureStore.setItemAsync(SECURE_AUTH_TOKEN_KEY, token);
    } catch {
      await AsyncStorage.setItem(`@focuslock/${SECURE_AUTH_TOKEN_KEY}`, token);
    }
  },
  async getAuthToken(): Promise<string | null> {
    if (isServerEnvironment()) return null;
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(`@focuslock/${SECURE_AUTH_TOKEN_KEY}`);
    }
    try {
      return await SecureStore.getItemAsync(SECURE_AUTH_TOKEN_KEY);
    } catch {
      return AsyncStorage.getItem(`@focuslock/${SECURE_AUTH_TOKEN_KEY}`);
    }
  },
  async clearAuthToken(): Promise<void> {
    if (isServerEnvironment()) return;
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(`@focuslock/${SECURE_AUTH_TOKEN_KEY}`);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(SECURE_AUTH_TOKEN_KEY);
    } catch {
      await AsyncStorage.removeItem(`@focuslock/${SECURE_AUTH_TOKEN_KEY}`);
    }
  },
};
