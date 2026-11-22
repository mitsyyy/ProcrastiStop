import { CameraView, type CameraType } from 'expo-camera';
import type { RefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamilies, Radii, Spacing, Typography } from '@/constants/theme';
import { getCheckpointItemOption } from '@/features/checkpoints/checkpointAnalyzer';
import {
  getFocusLiveCameraNativeComponent,
  isNativeLiveCameraAvailable,
} from '@/services/native/focusVisionBridge';
import type { CheckpointTargetItem } from '@/types/task';
import { AppIcon } from '../ui/AppIcon';

interface CheckpointCameraFrameProps {
  cameraRef?: RefObject<CameraView | null>;
  facing: CameraType;
  targetItem: CheckpointTargetItem;
  active: boolean;
  cameraInstanceKey?: number;
  onFlipCamera: () => void;
  onCameraReady?: () => void;
  mountError: string | null;
  onMountError: (message: string) => void;
  detectedOverlayLabel: string;
  consecutiveMatches: number;
  requiredMatches?: number;
  isVerified?: boolean;
  liveConfidence?: number;
}

const NativeLiveCamera = getFocusLiveCameraNativeComponent();
const USE_NATIVE_STREAM = isNativeLiveCameraAvailable() && NativeLiveCamera !== null;

export function CheckpointCameraFrame({
  cameraRef,
  facing,
  targetItem,
  active,
  cameraInstanceKey = 0,
  onFlipCamera,
  onCameraReady,
  mountError,
  onMountError,
  detectedOverlayLabel,
  consecutiveMatches,
  requiredMatches = 2,
  isVerified = false,
  liveConfidence = 0,
}: CheckpointCameraFrameProps) {
  const progressRatio = isVerified
    ? 1
    : Math.min(1, Math.max(0, consecutiveMatches / Math.max(1, requiredMatches)));
  const isLockingOn = consecutiveMatches > 0 || isVerified;
  const bracketColor = isVerified ? '#55dda0' : isLockingOn ? '#ffc83d' : '#ffffff';

  const fallbackShortLabel = getCheckpointItemOption(targetItem).shortLabel || 'Book';
  const trimmedOverlay =
    typeof detectedOverlayLabel === 'string' ? detectedOverlayLabel.trim() : '';
  const resolvedOverlayLabel =
    trimmedOverlay && !trimmedOverlay.endsWith(':')
      ? trimmedOverlay
      : `Aim at: ${fallbackShortLabel}`;

  return (
    <View style={styles.frame}>
      {mountError ? (
        <View style={styles.fallbackBox}>
          <AppIcon name="camera" size={40} color="rgba(255,255,255,0.65)" />
          <Text style={[Typography.bodySemiBold, styles.fallbackTitle]}>
            Live camera preview unavailable
          </Text>
          <Text style={[Typography.caption, styles.fallbackDesc]}>{mountError}</Text>
        </View>
      ) : USE_NATIVE_STREAM && NativeLiveCamera ? (
        <NativeLiveCamera
          key={`native-cam-${cameraInstanceKey}`}
          style={StyleSheet.absoluteFill}
          facing={facing === 'front' ? 'front' : 'back'}
          active={active}
          targetItem={targetItem}
        />
      ) : (
        <CameraView
          key={`expo-cam-${cameraInstanceKey}`}
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          onCameraReady={onCameraReady}
          onMountError={(e) =>
            onMountError(e.message || 'Camera preview unavailable on this device')
          }
        />
      )}

      {/* Subtle edge vignette outside center ROI guide box */}
      <View style={styles.roiShadeTop} pointerEvents="none" />
      <View style={styles.roiShadeBottom} pointerEvents="none" />
      <View style={styles.roiShadeLeft} pointerEvents="none" />
      <View style={styles.roiShadeRight} pointerEvents="none" />

      {/* Center ROI Guide Brackets (matches native 68% x 64% crop window) */}
      <View style={styles.scanFrame} pointerEvents="none">
        <View style={[styles.corner, styles.topLeft, { borderColor: bracketColor }]} />
        <View style={[styles.corner, styles.topRight, { borderColor: bracketColor }]} />
        <View style={[styles.corner, styles.bottomLeft, { borderColor: bracketColor }]} />
        <View style={[styles.corner, styles.bottomRight, { borderColor: bracketColor }]} />
      </View>

      {/* Flip Camera Button */}
      <Pressable
        onPress={onFlipCamera}
        accessibilityLabel="Flip camera"
        style={styles.flipBtn}
      >
        <AppIcon name="refresh" size={18} color="#ffffff" />
      </Pressable>

      {/* Live Target & Hover Progress Pill */}
      <View style={styles.bottomHud} pointerEvents="none">
        <View
          style={[
            styles.detectedPill,
            {
              backgroundColor: isVerified
                ? '#22b573'
                : isLockingOn
                  ? '#d98a16'
                  : '#2f9e6d',
            },
          ]}
        >
          <AppIcon name={isVerified ? 'check' : 'target'} size={14} color="#ffffff" />
          <Text numberOfLines={1} style={styles.detectedText}>
            {resolvedOverlayLabel}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.round(
                  Math.max(progressRatio * 100, isLockingOn ? 45 : liveConfidence * 25),
                )}%`,
                backgroundColor: isVerified ? '#55dda0' : '#ffc83d',
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 332,
    borderRadius: Radii.xl,
    overflow: 'hidden',
    backgroundColor: '#1a2420',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  fallbackBox: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fallbackTitle: {
    color: '#ffffff',
    textAlign: 'center',
  },
  fallbackDesc: {
    color: 'rgba(255,255,255,0.68)',
    textAlign: 'center',
  },
  roiShadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '18%',
    backgroundColor: 'rgba(5, 18, 14, 0.36)',
  },
  roiShadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '18%',
    backgroundColor: 'rgba(5, 18, 14, 0.36)',
  },
  roiShadeLeft: {
    position: 'absolute',
    top: '18%',
    bottom: '18%',
    left: 0,
    width: '16%',
    backgroundColor: 'rgba(5, 18, 14, 0.36)',
  },
  roiShadeRight: {
    position: 'absolute',
    top: '18%',
    bottom: '18%',
    right: 0,
    width: '16%',
    backgroundColor: 'rgba(5, 18, 14, 0.36)',
  },
  scanFrame: {
    position: 'absolute',
    top: '18%',
    bottom: '18%',
    left: '16%',
    right: '16%',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  flipBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.48)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomHud: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.lg,
    right: Spacing.lg,
    alignItems: 'center',
    gap: 8,
  },
  detectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: '100%',
    gap: 6,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: 6,
    borderRadius: Radii.full,
  },
  detectedText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  progressTrack: {
    width: '72%',
    height: 4,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.full,
  },
});
