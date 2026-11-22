import { Linking, NativeModules, Platform } from 'react-native';

import {
  getNotificationPermissionState,
  type NotificationPermissionState,
} from '@/services/notifications/notificationService';

interface FocusOverlayNativeModule {
  canDrawOverlays: () => Promise<boolean>;
  canScheduleExactAlarms: () => Promise<boolean>;
  canUseFullScreenIntent: () => Promise<boolean>;
  openOverlaySettings: () => Promise<boolean>;
  openExactAlarmSettings: () => Promise<boolean>;
  openFullScreenIntentSettings: () => Promise<boolean>;
}

const nativeOverlayModule = NativeModules.FocusOverlayPermission as
  | FocusOverlayNativeModule
  | undefined;

export type SystemPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export interface CriticalPermissionsSnapshot {
  notifications: NotificationPermissionState;
  overlay: SystemPermissionStatus;
  exactAlarms: SystemPermissionStatus;
  fullScreenIntent: SystemPermissionStatus;
  nativeBridgeAvailable: boolean;
}

export async function checkOverlayPermissionStatus(): Promise<SystemPermissionStatus> {
  if (Platform.OS !== 'android') {
    return 'unavailable';
  }
  if (!nativeOverlayModule?.canDrawOverlays) {
    return 'undetermined';
  }
  try {
    const allowed = await nativeOverlayModule.canDrawOverlays();
    return allowed ? 'granted' : 'denied';
  } catch {
    return 'undetermined';
  }
}

export async function checkExactAlarmPermissionStatus(): Promise<SystemPermissionStatus> {
  if (Platform.OS !== 'android') {
    return 'unavailable';
  }
  if (!nativeOverlayModule?.canScheduleExactAlarms) {
    return 'undetermined';
  }
  try {
    const allowed = await nativeOverlayModule.canScheduleExactAlarms();
    return allowed ? 'granted' : 'denied';
  } catch {
    return 'undetermined';
  }
}

export async function checkFullScreenIntentPermissionStatus(): Promise<SystemPermissionStatus> {
  if (Platform.OS !== 'android') {
    return 'unavailable';
  }
  if (!nativeOverlayModule?.canUseFullScreenIntent) {
    return 'undetermined';
  }
  try {
    const allowed = await nativeOverlayModule.canUseFullScreenIntent();
    return allowed ? 'granted' : 'denied';
  } catch {
    return 'undetermined';
  }
}

export async function openDisplayOverAppsSettings(): Promise<void> {
  if (Platform.OS === 'android' && nativeOverlayModule?.openOverlaySettings) {
    try {
      await nativeOverlayModule.openOverlaySettings();
      return;
    } catch {
      // Fall back to standard app settings page
    }
  }
  await Linking.openSettings();
}

export async function openExactAlarmSettings(): Promise<void> {
  if (Platform.OS === 'android' && nativeOverlayModule?.openExactAlarmSettings) {
    try {
      await nativeOverlayModule.openExactAlarmSettings();
      return;
    } catch {
      // Fall back to standard app settings page
    }
  }
  await Linking.openSettings();
}

export async function openFullScreenAlarmSettings(): Promise<void> {
  if (Platform.OS === 'android' && nativeOverlayModule?.openFullScreenIntentSettings) {
    try {
      await nativeOverlayModule.openFullScreenIntentSettings();
      return;
    } catch {
      // Fall back to standard app settings page
    }
  }
  await Linking.openSettings();
}

export async function getCriticalPermissionsSnapshot(): Promise<CriticalPermissionsSnapshot> {
  const [notifications, overlay, exactAlarms, fullScreenIntent] = await Promise.all([
    getNotificationPermissionState(),
    checkOverlayPermissionStatus(),
    checkExactAlarmPermissionStatus(),
    checkFullScreenIntentPermissionStatus(),
  ]);

  return {
    notifications,
    overlay,
    exactAlarms,
    fullScreenIntent,
    nativeBridgeAvailable: Boolean(nativeOverlayModule),
  };
}
