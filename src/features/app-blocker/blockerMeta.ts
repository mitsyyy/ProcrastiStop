import type { BlockerPermissionKind, BlockerPermissionStatus } from '@/types/blocker';

export interface PermissionMetadata {
  kind: BlockerPermissionKind;
  title: string;
  description: string;
  androidSettingLabel: string;
}

export const BLOCKER_PERMISSION_DETAILS: PermissionMetadata[] = [
  {
    kind: 'usageAccess',
    title: 'Usage Access (Foreground App Detection)',
    description:
      'Allows FocusLock on Android to observe when a distracting app moves to the foreground during an active focus block.',
    androidSettingLabel: 'Settings → Apps → Special app access → Usage access',
  },
  {
    kind: 'overlay',
    title: 'Display Over Other Apps (Focus Shield)',
    description:
      'Allows FocusLock to present a gentle return-to-focus card if a restricted app is opened during your session.',
    androidSettingLabel: 'Settings → Apps → Special app access → Display over other apps',
  },
];

export function getPermissionStatusLabel(status: BlockerPermissionStatus): string {
  switch (status) {
    case 'granted':
      return 'Granted';
    case 'not_granted':
      return 'Not Granted';
    case 'unavailable':
      return 'Unavailable';
  }
}

export function cycleSimulatedPermissionStatus(
  current: BlockerPermissionStatus,
): BlockerPermissionStatus {
  if (current === 'not_granted') return 'granted';
  if (current === 'granted') return 'unavailable';
  return 'not_granted';
}
