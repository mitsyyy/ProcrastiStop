import { type CameraType, type CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckpointCameraFrame } from '@/components/checkpoint/CheckpointCameraFrame';
import { DetectionResult } from '@/components/checkpoint/DetectionResult';
import { RetryButton } from '@/components/checkpoint/RetryButton';
import { AppIcon } from '@/components/ui/AppIcon';
import { PermissionExplainer } from '@/components/ui/PermissionExplainer';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Layout, Radii, Spacing, Typography } from '@/constants/theme';
import {
  analyzeCheckpointScene,
  type CheckpointDetectionAnalysis,
  type SimulatedCheckpointOutcome,
} from '@/features/checkpoints/checkpointAnalyzer';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useFocusStore } from '@/store/focusStore';

const SIM_MODES: { key: SimulatedCheckpointOutcome; label: string }[] = [
  { key: 'pass', label: 'Simulate Pass (laptop, book)' },
  { key: 'fail', label: 'Simulate Fail (retry flow)' },
];

export default function CameraCheckpointScreen() {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission, getPermission] = useCameraPermissions();

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void getPermission();
      }
    });
    return () => sub.remove();
  }, [getPermission]);

  const activeSession = useFocusStore((s) => s.activeSession);
  const recordCheckpointResult = useFocusStore((s) => s.recordCheckpointResult);
  const exitCheckpointToActive = useFocusStore((s) => s.exitCheckpointToActive);

  const [facing, setFacing] = useState<CameraType>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const [simMode, setSimMode] = useState<SimulatedCheckpointOutcome>('pass');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<CheckpointDetectionAnalysis | null>(null);

  const handleReturnToFocus = async () => {
    await exitCheckpointToActive();
    router.replace('/focus/active');
  };

  const handleCapture = async () => {
    setAnalyzing(true);
    try {
      // Trigger hardware capture if camera is mounted, then immediately discard without saving
      if (cameraRef.current && cameraReady && !mountError) {
        try {
          await cameraRef.current.takePictureAsync({
            quality: 0.35,
            skipProcessing: true,
          });
        } catch {
          // Safe fallback: continue simulated scene evaluation even on simulator/headless web
        }
      }

      const analysis = await analyzeCheckpointScene(simMode);
      setResult(analysis);

      await recordCheckpointResult({
        detectedObjects: analysis.detectedObjects,
        verificationResult: analysis.verificationResult,
        confidence: analysis.confidence,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <ScreenBackground variant="checkpoint">
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.md,
            paddingBottom: insets.bottom + Spacing.xxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          {/* Top Bar */}
          <View style={styles.topRow}>
            <Pressable
              onPress={() => void handleReturnToFocus()}
              accessibilityLabel="Close checkpoint"
              style={styles.topBtn}
            >
              <AppIcon name="close" size={20} color="#ffffff" />
            </Pressable>
            <Text style={[Typography.h3, { color: '#ffffff' }]}>Visual checkpoint</Text>
            <View style={styles.topSpacer} />
          </View>

          {!permission ? (
            <View style={styles.centerBox}>
              <Text style={[Typography.body, { color: 'rgba(255,255,255,0.72)' }]}>
                Checking camera permissions...
              </Text>
            </View>
          ) : !permission.granted ? (
            <View style={styles.explainerWrap}>
              <PermissionExplainer
                icon="camera"
                title="Camera checkpoint (optional)"
                description={
                  permission.canAskAgain
                    ? 'Point your camera at your desk to check if broad work materials such as a book, notebook, or laptop are visible.'
                    : 'Camera access was previously denied. Open Android App Settings to allow Camera permission, then return here.'
                }
                privacyNote="Stage 1 uses simulated object detection. Photos are never saved or uploaded (imagePath: null)."
                primaryLabel={
                  permission.canAskAgain ? 'Allow Camera Access' : 'Open App Settings'
                }
                onPrimaryPress={() => {
                  if (permission.canAskAgain) {
                    void requestPermission();
                  } else {
                    void Linking.openSettings();
                  }
                }}
                secondaryLabel="Skip & Return to Focus"
                onSecondaryPress={() => void handleReturnToFocus()}
              />
              {permission.canAskAgain ? (
                <Pressable
                  onPress={() => void Linking.openSettings()}
                  style={styles.settingsShortcut}
                >
                  <Text style={[Typography.small, { color: palette.accentMint, fontWeight: '700' }]}>
                    Permission blocked? Open App Settings
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={styles.cameraFlow}>
              <CheckpointCameraFrame
                cameraRef={cameraRef}
                facing={facing}
                onFlipCamera={() => setFacing((c) => (c === 'back' ? 'front' : 'back'))}
                onCameraReady={() => setCameraReady(true)}
                mountError={mountError}
                onMountError={setMountError}
                detectedOverlayLabel={
                  result?.verificationResult === 'passed'
                    ? `Detected: ${result.detectedObjects.join(', ')}`
                    : null
                }
              />

              {/* Simulation Selector for Testing Pass & Fail States */}
              <View style={styles.simBox}>
                <Text style={[Typography.small, styles.simLabel]}>
                  Stage 1 Simulated ML Detector Mode:
                </Text>
                <View style={styles.simRow}>
                  {SIM_MODES.map((m) => {
                    const active = simMode === m.key;
                    return (
                      <Pressable
                        key={m.key}
                        onPress={() => setSimMode(m.key)}
                        style={[
                          styles.simPill,
                          {
                            backgroundColor: active
                              ? 'rgba(85, 221, 160, 0.2)'
                              : 'rgba(255, 255, 255, 0.08)',
                            borderColor: active ? palette.accentMint : 'rgba(255,255,255,0.14)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            Typography.small,
                            {
                              color: active ? '#8ee6b9' : 'rgba(255,255,255,0.72)',
                              fontWeight: active ? '700' : '500',
                            },
                          ]}
                        >
                          {m.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {result ? (
                <View style={styles.resultSection}>
                  <DetectionResult result={result} />
                  {result.verificationResult === 'passed' ? (
                    <PrimaryButton
                      title="Continue Focus Session"
                      icon="check"
                      tone="emerald"
                      onPress={() => void handleReturnToFocus()}
                    />
                  ) : (
                    <View style={styles.failActions}>
                      <RetryButton
                        label="Retake & Scan Again"
                        onPress={() => setResult(null)}
                      />
                      <SecondaryButton
                        title="Return to Focus Anyway"
                        variant="ghost"
                        onPress={() => void handleReturnToFocus()}
                        fullWidth
                      />
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.capturePanel}>
                  <Text style={[Typography.h2, styles.promptTitle]}>
                    Show your work materials.
                  </Text>
                  <Text style={[Typography.caption, styles.promptDesc]}>
                    Frame a book, notebook, paper, or laptop. This checks visible materials only—it
                    never evaluates you or stores photos.
                  </Text>

                  <PrimaryButton
                    title={analyzing ? 'Analyzing frame...' : 'Capture & Check Scene'}
                    icon="camera"
                    tone="energy"
                    loading={analyzing}
                    onPress={() => void handleCapture()}
                  />

                  <SecondaryButton
                    title="Return to Focus"
                    variant="ghost"
                    onPress={() => void handleReturnToFocus()}
                    fullWidth
                  />
                </View>
              )}

              <View style={styles.privacyFooter}>
                <AppIcon name="lock" size={13} color="rgba(255,255,255,0.5)" />
                <Text style={[Typography.small, styles.privacyText]}>
                  {activeSession
                    ? `Session: ${activeSession.taskTitleSnapshot} · `
                    : ''}
                  Images discarded immediately (imagePath: null).
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  topBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSpacer: {
    width: 42,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  explainerWrap: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  settingsShortcut: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  cameraFlow: {
    gap: Spacing.lg,
  },
  simBox: {
    gap: Spacing.xs + 2,
  },
  simLabel: {
    color: 'rgba(255,255,255,0.58)',
  },
  simRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  simPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  capturePanel: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.xs,
  },
  promptTitle: {
    color: '#ffffff',
    textAlign: 'center',
  },
  promptDesc: {
    color: 'rgba(255,255,255,0.68)',
    textAlign: 'center',
    maxWidth: 320,
  },
  resultSection: {
    gap: Spacing.md,
  },
  failActions: {
    gap: Spacing.sm,
  },
  privacyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.xs,
  },
  privacyText: {
    color: 'rgba(255,255,255,0.48)',
  },
});
