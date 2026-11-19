import { CameraView, type CameraType } from 'expo-camera';
import type { RefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';
import { AppIcon } from '../ui/AppIcon';

interface CheckpointCameraFrameProps {
  cameraRef: RefObject<CameraView | null>;
  facing: CameraType;
  onFlipCamera: () => void;
  onCameraReady?: () => void;
  mountError: string | null;
  onMountError: (message: string) => void;
  detectedOverlayLabel?: string | null;
}

export function CheckpointCameraFrame({
  cameraRef,
  facing,
  onFlipCamera,
  onCameraReady,
  mountError,
  onMountError,
  detectedOverlayLabel,
}: CheckpointCameraFrameProps) {
  return (
    <View style={styles.frame}>
      {mountError ? (
        <View style={styles.fallbackBox}>
          <AppIcon name="camera" size={40} color="rgba(255,255,255,0.65)" />
          <Text style={[Typography.bodySemiBold, styles.fallbackTitle]}>
            Live camera preview unavailable
          </Text>
          <Text style={[Typography.caption, styles.fallbackDesc]}>
            {mountError}. You can still test the Stage 1 simulated checkpoint capture below.
          </Text>
        </View>
      ) : (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          onCameraReady={onCameraReady}
          onMountError={(e) => onMountError(e.message || 'Camera preview unavailable on this device')}
        />
      )}

      {/* Rule-of-thirds viewfinder grid matching Figma .camera-grid */}
      <View style={styles.gridOverlay} pointerEvents="none">
        <View style={[styles.gridLineH, { top: '33.33%' }]} />
        <View style={[styles.gridLineH, { top: '66.66%' }]} />
        <View style={[styles.gridLineV, { left: '33.33%' }]} />
        <View style={[styles.gridLineV, { left: '66.66%' }]} />
      </View>

      {/* Corner scan brackets matching Figma .scan-frame */}
      <View style={styles.scanFrame} pointerEvents="none">
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
      </View>

      <Pressable
        onPress={onFlipCamera}
        accessibilityLabel="Flip camera"
        style={styles.flipBtn}
      >
        <AppIcon name="refresh" size={18} color="#ffffff" />
      </Pressable>

      {detectedOverlayLabel ? (
        <View style={styles.detectedPill}>
          <AppIcon name="check" size={14} color="#ffffff" />
          <Text style={[Typography.small, styles.detectedText]}>{detectedOverlayLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 320,
    borderRadius: Radii.xl,
    overflow: 'hidden',
    backgroundColor: '#252e29',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
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
  gridOverlay: {
    ...StyleSheet.absoluteFill,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  scanFrame: {
    position: 'absolute',
    inset: '14%',
  },
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: '#ffffff',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
  },
  flipBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.46)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectedPill: {
    position: 'absolute',
    bottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.full,
    backgroundColor: '#2f9e6d',
  },
  detectedText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
