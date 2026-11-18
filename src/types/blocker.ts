export interface BlockedAppItem {
  packageName: string;
  displayName: string;
  selected: boolean;
}

export interface BlockedAppSettings {
  enabled: boolean;
  blockDuringFocus: boolean;
  selectedApps: BlockedAppItem[];
  allowEmergencyExit: boolean;
}

export type BlockerPermissionStatus = 'granted' | 'not_granted' | 'unavailable';

export type BlockerPermissionKind = 'usageAccess' | 'overlay';

export interface BlockerPermissionsState {
  usageAccess: BlockerPermissionStatus;
  overlay: BlockerPermissionStatus;
}

export type BlockerRuntimeStatus = 'inactive' | 'monitoring' | 'paused' | 'unavailable';

export interface BlockerActivationResult {
  runtimeStatus: BlockerRuntimeStatus;
  isSimulated: boolean;
  message: string;
}

export interface BlockerBridge {
  isNativeModuleAvailable(): boolean;
  getPermissions(): Promise<BlockerPermissionsState>;
  requestPermission(kind: BlockerPermissionKind): Promise<BlockerPermissionStatus>;
  setSimulatedPermission(
    kind: BlockerPermissionKind,
    status: BlockerPermissionStatus,
  ): Promise<BlockerPermissionsState>;
  activateBlocker(packages: string[]): Promise<BlockerActivationResult>;
  pauseBlocker(): Promise<BlockerRuntimeStatus>;
  deactivateBlocker(): Promise<BlockerRuntimeStatus>;
  simulateAppLaunchAttempt(
    packageName: string,
    displayName: string,
  ): Promise<{ blocked: boolean; reason: string }>;
}
