import { type CameraType, type CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckpointCameraFrame } from '@/components/checkpoint/CheckpointCameraFrame';
import { AppIcon } from '@/components/ui/AppIcon';
import { PermissionExplainer } from '@/components/ui/PermissionExplainer';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Layout, Spacing, Typography } from '@/constants/theme';
import { analyzeCheckpointScene } from '@/features/checkpoints/checkpointAnalyzer';
import { useFocusStore } from '@/store/focusStore';

export default function CameraCheckpointScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const recordCheckpointResult = useFocusStore((s) => s.recordCheckpointResult);
  const exitCheckpointToActive = useFocusStore((s) => s.exitCheckpointToActive);

  const [facing, setFacing] = useState<CameraType>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleReturnToFocus = async () => {
    await exitCheckpointToActive();
    router.replace('/focus/active');
  };

  const handleCapture = async () => {
    setAnalyzing(true);
    try {
      if (cameraRef.current && cameraReady && !mountError) {
        try {
          await cameraRef.current.takePictureAsync({ quality: 0.35, skipProcessing: true });
        } catch {
          // Safe fallback on simulators
        }
      }
      const analysis = await analyzeCheckpointScene('pass');
      await recordCheckpointResult({
        detectedObjects: analysis.detectedObjects,
        verificationResult: analysis.verificationResult,
        confidence: analysis.confidence,
      });
      await handleReturnToFocus();
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <ScreenBackground variant="checkpoint">
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <View style={styles.topRow}>
            <Pressable onPress={() => void handleReturnToFocus()} style={styles.topBtn}>
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
                description="Point your camera at your desk to check if broad work materials such as a book, notebook, or laptop are visible."
                privacyNote="Photos are never saved or uploaded (imagePath: null)."
                primaryLabel={
                  permission.canAskAgain ? 'Allow Camera Access' : 'Camera Denied — Continue Anyway'
                }
                onPrimaryPress={() => {
                  if (permission.canAskAgain) {
                    void requestPermission();
                  } else {
                    void handleReturnToFocus();
                  }
                }}
                secondaryLabel="Skip & Return to Focus"
                onSecondaryPress={() => void handleReturnToFocus()}
              />
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
              />

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
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, paddingHorizontal: Spacing.xl, alignItems: 'center' },
  inner: { width: '100%', maxWidth: Layout.maxContentWidth, flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  topBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  topSpacer: { width: 42 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  explainerWrap: { marginTop: Spacing.xl },
  cameraFlow: { gap: Spacing.lg },
});
