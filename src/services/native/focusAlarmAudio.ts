import { NativeModules, Platform, Vibration } from 'react-native';

interface FocusAlarmAudioNativeModule {
  startAlarm: () => Promise<boolean>;
  stopAlarm: () => Promise<boolean>;
}

const nativeAlarmAudio = NativeModules.FocusAlarmAudio as FocusAlarmAudioNativeModule | undefined;

/**
 * Starts the looping native Android Alarm sound (USAGE_ALARM) + vibration pattern
 * while the AI Camera Checkpoint Gate waits for workspace verification.
 */
export async function startFocusAlarmSound(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (nativeAlarmAudio?.startAlarm) {
    try {
      await nativeAlarmAudio.startAlarm();
      return;
    } catch {
      // Fall through to vibration fallback
    }
  }
  Vibration.vibrate([0, 450, 350, 450], true);
}

/**
 * Immediately silences the looping alarm sound and cancels vibration.
 */
export async function stopFocusAlarmSound(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (nativeAlarmAudio?.stopAlarm) {
    try {
      await nativeAlarmAudio.stopAlarm();
      return;
    } catch {
      // Fall through to cancel fallback vibration
    }
  }
  Vibration.cancel();
}
