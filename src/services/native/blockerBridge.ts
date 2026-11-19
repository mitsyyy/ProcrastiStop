import { Platform } from 'react-native';

import { readJsonItem, STORAGE_KEYS, writeJsonItem } from '@/services/local/storage';
import type {
  BlockerActivationResult,
  BlockerBridge,
  BlockerPermissionKind,
  BlockerPermissionsState,
  BlockerPermissionStatus,
  BlockerRuntimeStatus,
} from '@/types/blocker';

const DEFAULT_PERMISSIONS: BlockerPermissionsState = {
  usageAccess: 'not_granted',
  overlay: 'not_granted',
};

/**
 * Stage 1 Frontend Simulation of the Android App Blocker native module.
 *
 * Stage 2 Replacement Plan:
 * Replace this implementation with a Kotlin Expo Module using:
 * - UsageStatsManager (PACKAGE_USAGE_STATS) for foreground app detection
 * - WindowManager / foreground Activity redirect (SYSTEM_ALERT_WINDOW)
 * while keeping the BlockerBridge interface unchanged.
 */
class MockBlockerBridge implements BlockerBridge {
  private runtimeStatus: BlockerRuntimeStatus = 'inactive';
  private activePackages: string[] = [];

  isNativeModuleAvailable(): boolean {
    // Expo JS runtime cannot enforce OS-level app blocking without a native Kotlin module.
    return false;
  }

  async getPermissions(): Promise<BlockerPermissionsState> {
    if (Platform.OS === 'ios') {
      return { usageAccess: 'unavailable', overlay: 'unavailable' };
    }
    const saved = await readJsonItem<BlockerPermissionsState>(STORAGE_KEYS.BLOCKER_PERMISSIONS);
    return saved ?? DEFAULT_PERMISSIONS;
  }

  async requestPermission(kind: BlockerPermissionKind): Promise<BlockerPermissionStatus> {
    const current = await this.getPermissions();
    if (current[kind] === 'unavailable') {
      return 'unavailable';
    }
    const next: BlockerPermissionsState = {
      ...current,
      [kind]: 'granted',
    };
    await writeJsonItem(STORAGE_KEYS.BLOCKER_PERMISSIONS, next);
    return 'granted';
  }

  async setSimulatedPermission(
    kind: BlockerPermissionKind,
    status: BlockerPermissionStatus,
  ): Promise<BlockerPermissionsState> {
    const current = await this.getPermissions();
    const next: BlockerPermissionsState = {
      ...current,
      [kind]: status,
    };
    await writeJsonItem(STORAGE_KEYS.BLOCKER_PERMISSIONS, next);
    return next;
  }

  async activateBlocker(packages: string[]): Promise<BlockerActivationResult> {
    this.activePackages = [...packages];
    const perms = await this.getPermissions();

    if (perms.usageAccess === 'unavailable' || perms.overlay === 'unavailable') {
      this.runtimeStatus = 'unavailable';
      return {
        runtimeStatus: 'unavailable',
        isSimulated: true,
        message: 'Simulated OS restriction unavailable on this device configuration. Focus reminders remain active.',
      };
    }

    this.runtimeStatus = 'monitoring';
    const hasPermissions = perms.usageAccess === 'granted' && perms.overlay === 'granted';
    return {
      runtimeStatus: 'monitoring',
      isSimulated: true,
      message: hasPermissions
        ? `Frontend simulation active for ${packages.length} selected apps.`
        : `Simulation monitoring ${packages.length} apps (mock Android permissions pending).`,
    };
  }

  async pauseBlocker(): Promise<BlockerRuntimeStatus> {
    if (this.runtimeStatus === 'monitoring') {
      this.runtimeStatus = 'paused';
    }
    return this.runtimeStatus;
  }

  async deactivateBlocker(): Promise<BlockerRuntimeStatus> {
    this.activePackages = [];
    this.runtimeStatus = 'inactive';
    return this.runtimeStatus;
  }

  async simulateAppLaunchAttempt(
    packageName: string,
    displayName: string,
  ): Promise<{ blocked: boolean; reason: string }> {
    const isTargeted =
      this.activePackages.length === 0 || this.activePackages.includes(packageName);

    if (this.runtimeStatus === 'monitoring' && isTargeted) {
      return {
        blocked: true,
        reason: `Simulated interception: ${displayName} (${packageName}) is on your focus restriction list.`,
      };
    }

    return {
      blocked: false,
      reason: `FocusLock simulation is currently ${this.runtimeStatus}.`,
    };
  }
}

export const blockerBridge: BlockerBridge = new MockBlockerBridge();
