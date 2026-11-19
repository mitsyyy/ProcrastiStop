import { create } from 'zustand';

import { cycleSimulatedPermissionStatus } from '@/features/app-blocker/blockerMeta';
import { settingsRepository } from '@/repositories/settingsRepository';
import { blockerBridge } from '@/services/native/blockerBridge';
import type {
  BlockedAppSettings,
  BlockerPermissionKind,
  BlockerPermissionsState,
  BlockerPermissionStatus,
  BlockerRuntimeStatus,
} from '@/types/blocker';
import type { SessionStatus } from '@/types/focus';

interface DemoBlockedModalState {
  visible: boolean;
  appName: string;
  packageName: string;
  reason: string;
}

interface BlockerState {
  settings: BlockedAppSettings;
  permissions: BlockerPermissionsState;
  runtimeStatus: BlockerRuntimeStatus;
  statusMessage: string;
  loading: boolean;
  demoBlockedAppModal: DemoBlockedModalState | null;

  hydrateBlocker: () => Promise<void>;
  toggleBlockerEnabled: (enabled: boolean) => Promise<void>;
  toggleBlockDuringFocus: (blockDuringFocus: boolean) => Promise<void>;
  toggleEmergencyExit: (allowEmergencyExit: boolean) => Promise<void>;
  toggleAppSelection: (packageName: string) => Promise<void>;
  requestPermission: (kind: BlockerPermissionKind) => Promise<BlockerPermissionStatus>;
  cyclePermissionDemoState: (kind: BlockerPermissionKind) => Promise<void>;
  syncWithSession: (sessionStatus: SessionStatus | null) => Promise<void>;
  triggerSimulatedBlockedApp: (packageName?: string, displayName?: string) => Promise<boolean>;
  dismissBlockedAppModal: () => void;
}

const DEFAULT_SETTINGS: BlockedAppSettings = {
  enabled: true,
  blockDuringFocus: true,
  selectedApps: [],
  allowEmergencyExit: true,
};

export const useBlockerStore = create<BlockerState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  permissions: { usageAccess: 'not_granted', overlay: 'not_granted' },
  runtimeStatus: 'inactive',
  statusMessage: 'Blocker simulation idle.',
  loading: false,
  demoBlockedAppModal: null,

  hydrateBlocker: async () => {
    set({ loading: true });
    try {
      const [settings, permissions] = await Promise.all([
        settingsRepository.getBlockedApps(),
        blockerBridge.getPermissions(),
      ]);
      set({ settings, permissions, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  toggleBlockerEnabled: async (enabled) => {
    const next: BlockedAppSettings = { ...get().settings, enabled };
    set({ settings: next });
    await settingsRepository.updateBlockedApps(next);
    if (!enabled) {
      const runtimeStatus = await blockerBridge.deactivateBlocker();
      set({ runtimeStatus, statusMessage: 'App restriction simulation disabled.' });
    }
  },

  toggleBlockDuringFocus: async (blockDuringFocus) => {
    const next: BlockedAppSettings = { ...get().settings, blockDuringFocus };
    set({ settings: next });
    await settingsRepository.updateBlockedApps(next);
  },

  toggleEmergencyExit: async (allowEmergencyExit) => {
    const next: BlockedAppSettings = { ...get().settings, allowEmergencyExit };
    set({ settings: next });
    await settingsRepository.updateBlockedApps(next);
  },

  toggleAppSelection: async (packageName) => {
    const current = get().settings;
    const next: BlockedAppSettings = {
      ...current,
      selectedApps: current.selectedApps.map((app) =>
        app.packageName === packageName ? { ...app, selected: !app.selected } : app,
      ),
    };
    set({ settings: next });
    await settingsRepository.updateBlockedApps(next);
  },

  requestPermission: async (kind) => {
    const status = await blockerBridge.requestPermission(kind);
    const permissions = await blockerBridge.getPermissions();
    set({ permissions });
    return status;
  },

  cyclePermissionDemoState: async (kind) => {
    const currentStatus = get().permissions[kind];
    const nextStatus = cycleSimulatedPermissionStatus(currentStatus);
    const permissions = await blockerBridge.setSimulatedPermission(kind, nextStatus);
    set({ permissions });
  },

  syncWithSession: async (sessionStatus) => {
    const { settings } = get();
    const activePackages = settings.selectedApps
      .filter((app) => app.selected)
      .map((app) => app.packageName);

    if (
      sessionStatus === 'active' &&
      settings.enabled &&
      settings.blockDuringFocus &&
      activePackages.length > 0
    ) {
      const res = await blockerBridge.activateBlocker(activePackages);
      set({ runtimeStatus: res.runtimeStatus, statusMessage: res.message });
      return;
    }

    if (sessionStatus === 'paused' || sessionStatus === 'checkpoint') {
      const runtimeStatus = await blockerBridge.pauseBlocker();
      set({
        runtimeStatus,
        statusMessage: 'Restriction simulation paused while session is paused.',
      });
      return;
    }

    const runtimeStatus = await blockerBridge.deactivateBlocker();
    set({ runtimeStatus, statusMessage: 'Restriction simulation inactive.' });
  },

  triggerSimulatedBlockedApp: async (packageName, displayName) => {
    const selected = get().settings.selectedApps.filter((a) => a.selected);
    const target = selected[0] ?? {
      packageName: packageName ?? 'com.instagram.android',
      displayName: displayName ?? 'Instagram',
    };
    const pkg = packageName ?? target.packageName;
    const name = displayName ?? target.displayName;

    const result = await blockerBridge.simulateAppLaunchAttempt(pkg, name);
    set({
      demoBlockedAppModal: {
        visible: true,
        appName: name,
        packageName: pkg,
        reason: result.reason,
      },
    });
    return result.blocked;
  },

  dismissBlockedAppModal: () => set({ demoBlockedAppModal: null }),
}));
