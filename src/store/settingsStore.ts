import { create } from 'zustand';

import { settingsRepository } from '@/repositories/settingsRepository';
import type { MockUser, UserPreferences } from '@/types/settings';
import { createId, getInitials } from '@/utils/id';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface ToastNotice {
  id: string;
  message: string;
  tone: ToastTone;
}

interface SettingsState {
  preferences: UserPreferences;
  user: MockUser | null;
  onboardingCompleted: boolean;
  hydrated: boolean;
  loading: boolean;
  toast: ToastNotice | null;

  hydrateSettings: () => Promise<void>;
  updatePreferences: (changes: Partial<UserPreferences>) => Promise<UserPreferences>;
  signInDemo: () => Promise<MockUser>;
  signInWithEmail: (email: string) => Promise<MockUser>;
  registerAccount: (fullName: string, email: string) => Promise<MockUser>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  showToast: (message: string, tone?: ToastTone) => void;
  hideToast: () => void;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  focusDefaultMinutes: 45,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  checkpointEnabled: true,
  notificationsEnabled: true,
  remindBeforeSessionMinutes: 5,
  defaultDailySessionStartTime: '19:00',
  defaultDailyReminderCount: 3,
  theme: 'dark',
};

export const useSettingsStore = create<SettingsState>((set) => ({
  preferences: DEFAULT_PREFERENCES,
  user: null,
  onboardingCompleted: false,
  hydrated: false,
  loading: false,
  toast: null,

  hydrateSettings: async () => {
    set({ loading: true });
    try {
      const [preferences, user, onboardingCompleted] = await Promise.all([
        settingsRepository.getPreferences(),
        settingsRepository.getAuthUser(),
        settingsRepository.getOnboardingCompleted(),
      ]);
      set({
        preferences,
        user,
        onboardingCompleted,
        hydrated: true,
        loading: false,
      });
    } catch {
      set({ hydrated: true, loading: false });
    }
  },

  updatePreferences: async (changes) => {
    const next = await settingsRepository.updatePreferences(changes);
    set({ preferences: next });
    return next;
  },

  signInDemo: async () => {
    const demoUser: MockUser = {
      id: 'demo_user_001',
      fullName: 'Alex Morgan',
      email: 'alex.morgan@procrastistop.app',
      initials: 'AM',
      signedInAt: new Date().toISOString(),
      isDemoAccount: true,
    };
    await settingsRepository.saveAuthUser(demoUser);
    await settingsRepository.setOnboardingCompleted(true);
    set({ user: demoUser, onboardingCompleted: true });
    return demoUser;
  },

  signInWithEmail: async (email) => {
    const cleanEmail = email.trim().toLowerCase();
    const namePart = cleanEmail.split('@')[0]?.replace(/[._-]+/g, ' ') || 'Focus User';
    const formattedName = namePart.replace(/\b\w/g, (c) => c.toUpperCase());
    const signedInUser: MockUser = {
      id: createId('user'),
      fullName: formattedName,
      email: cleanEmail,
      initials: getInitials(formattedName),
      signedInAt: new Date().toISOString(),
      isDemoAccount: false,
    };
    await settingsRepository.saveAuthUser(signedInUser);
    await settingsRepository.setOnboardingCompleted(true);
    set({ user: signedInUser, onboardingCompleted: true });
    return signedInUser;
  },

  registerAccount: async (fullName, email) => {
    const trimmedName = fullName.trim() || 'Focus User';
    const created: MockUser = {
      id: createId('user'),
      fullName: trimmedName,
      email: email.trim().toLowerCase(),
      initials: getInitials(trimmedName),
      signedInAt: new Date().toISOString(),
      isDemoAccount: false,
    };
    await settingsRepository.saveAuthUser(created);
    await settingsRepository.setOnboardingCompleted(true);
    set({ user: created, onboardingCompleted: true });
    return created;
  },

  signOut: async () => {
    await settingsRepository.saveAuthUser(null);
    set({ user: null });
  },

  completeOnboarding: async () => {
    await settingsRepository.setOnboardingCompleted(true);
    set({ onboardingCompleted: true });
  },

  showToast: (message, tone = 'info') => {
    set({
      toast: {
        id: createId('toast'),
        message,
        tone,
      },
    });
  },

  hideToast: () => set({ toast: null }),
}));
