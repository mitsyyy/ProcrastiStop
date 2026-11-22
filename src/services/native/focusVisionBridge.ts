import {
  DeviceEventEmitter,
  type EmitterSubscription,
  NativeModules,
  Platform,
  requireNativeComponent,
  UIManager,
  type ViewProps,
} from 'react-native';

export interface MLKitImageLabel {
  text: string;
  confidence: number;
}

export interface LiveVisionFrameEvent {
  targetItem: string;
  labels: MLKitImageLabel[];
  ocrText: string;
  ocrWordCount: number;
  ocrCharCount: number;
  timestampMs: number;
}

export interface LiveCameraStatusEvent {
  ready: boolean;
  error?: string;
}

export interface FocusLiveCameraNativeProps extends ViewProps {
  facing?: 'back' | 'front';
  active?: boolean;
  targetItem?: string;
}

interface FocusVisionNativeModule {
  labelImage: (imageUri: string) => Promise<MLKitImageLabel[]>;
}

const nativeVision = NativeModules.FocusVision as FocusVisionNativeModule | undefined;

const VIEW_MANAGER_NAME = 'FocusLiveCameraView';

let cachedLiveCameraComponent: ReturnType<typeof requireNativeComponent<FocusLiveCameraNativeProps>> | null =
  null;

export function isNativeVisionAvailable(): boolean {
  return Platform.OS === 'android' && Boolean(nativeVision?.labelImage);
}

export function isNativeLiveCameraAvailable(): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    return Boolean(UIManager.getViewManagerConfig?.(VIEW_MANAGER_NAME));
  } catch {
    return false;
  }
}

export function getFocusLiveCameraNativeComponent() {
  if (!isNativeLiveCameraAvailable()) return null;
  if (!cachedLiveCameraComponent) {
    cachedLiveCameraComponent =
      requireNativeComponent<FocusLiveCameraNativeProps>(VIEW_MANAGER_NAME);
  }
  return cachedLiveCameraComponent;
}

export function subscribeToLiveVisionFrames(
  listener: (event: LiveVisionFrameEvent) => void,
): EmitterSubscription {
  return DeviceEventEmitter.addListener('FocusLiveVisionFrame', (raw: unknown) => {
    if (!raw || typeof raw !== 'object') return;
    const obj = raw as Record<string, unknown>;
    const rawLabels = Array.isArray(obj.labels) ? obj.labels : [];
    const labels: MLKitImageLabel[] = rawLabels
      .filter(
        (item): item is MLKitImageLabel =>
          Boolean(item) &&
          typeof (item as MLKitImageLabel).text === 'string' &&
          typeof (item as MLKitImageLabel).confidence === 'number',
      )
      .sort((a, b) => b.confidence - a.confidence);

    listener({
      targetItem: typeof obj.targetItem === 'string' ? obj.targetItem : 'book',
      labels,
      ocrText: typeof obj.ocrText === 'string' ? obj.ocrText : '',
      ocrWordCount: typeof obj.ocrWordCount === 'number' ? obj.ocrWordCount : 0,
      ocrCharCount: typeof obj.ocrCharCount === 'number' ? obj.ocrCharCount : 0,
      timestampMs: typeof obj.timestampMs === 'number' ? obj.timestampMs : Date.now(),
    });
  });
}

export function subscribeToLiveCameraStatus(
  listener: (event: LiveCameraStatusEvent) => void,
): EmitterSubscription {
  return DeviceEventEmitter.addListener('FocusLiveCameraStatus', (raw: unknown) => {
    if (!raw || typeof raw !== 'object') return;
    const obj = raw as Record<string, unknown>;
    listener({
      ready: obj.ready === true,
      error: typeof obj.error === 'string' ? obj.error : undefined,
    });
  });
}

/**
 * Runs offline Google ML Kit Image Labeling on a captured camera image URI (fallback path).
 * The native module immediately deletes the temporary file once classification finishes.
 */
export async function runOnDeviceImageLabeling(imageUri: string): Promise<MLKitImageLabel[]> {
  if (!nativeVision?.labelImage) {
    throw new Error('NATIVE_MLKIT_UNAVAILABLE');
  }
  const results = await nativeVision.labelImage(imageUri);
  return Array.isArray(results)
    ? results
        .filter((item) => item && typeof item.text === 'string')
        .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    : [];
}
